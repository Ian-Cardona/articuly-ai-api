import { createServer } from 'http';

import { WebSocketServer } from 'ws';

import app from './app.ts';
import { handleWebSocketMessage, handleWebSocketConnection, handleWebSocketClose, handleWebSocketError } from './controllers/websocket.controller.ts';
import { cleanupAllSessions } from './services/session_monitor.service.ts';
import { MESSAGE_LIMIT, TIME_WINDOW_MS, MAX_AUDIO_KB_PER_WINDOW } from './constants/rate_limit.constant.ts';

import type { AuthenticatedWebSocket } from './types/websocket.type.ts';

const PORT = process.env.PORT ?? 3000;

const server = createServer(app);

const wss = new WebSocketServer({ noServer: true });

// Rate limiter: max 10 messages per 5 seconds per connection
const wsMessageTimestamps = new WeakMap<AuthenticatedWebSocket, number[]>();
// Track total audio data size per window per connection
const wsAudioDataSizes = new WeakMap<AuthenticatedWebSocket, { timestamps: number[], sizes: number[] }>();

type AudioDataMessage = { type: 'audioData'; audioBase64: string };

function isAudioDataMessage(msg: unknown): msg is AudioDataMessage {
  if (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    'audioBase64' in msg
  ) {
    const m = msg as Record<string, unknown>;
    return m.type === 'audioData' && typeof m.audioBase64 === 'string';
  }
  return false;
}

function slidingWindow<T>(timestamps: number[], values: T[], now: number, windowMs: number): { timestamps: number[], values: T[] } {
  const validIndices = timestamps
    .map((ts, i) => now - ts < windowMs ? i : -1)
    .filter(i => i !== -1);
  return {
    timestamps: validIndices.map(i => timestamps[i]),
    values: validIndices.map(i => values[i]),
  };
}

wss.on('connection', (ws: AuthenticatedWebSocket) => {
  // Handle new connection
  handleWebSocketConnection(ws);

  // Initialize per-connection rate limiting data
  wsMessageTimestamps.set(ws, []);
  wsAudioDataSizes.set(ws, { timestamps: [], sizes: [] });

  // Handle incoming messages
  ws.on('message', async (data: Buffer) => {
    try {
      // Rate limiting logic (sliding window)
      const now = Date.now();
      const timestamps = wsMessageTimestamps.get(ws) ?? [];
      const { timestamps: recentTimestamps } = slidingWindow(timestamps, timestamps, now, TIME_WINDOW_MS);
      recentTimestamps.push(now);
      wsMessageTimestamps.set(ws, recentTimestamps);
      if (recentTimestamps.length > MESSAGE_LIMIT) {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `Rate limit exceeded: Max ${MESSAGE_LIMIT} messages per ${TIME_WINDOW_MS / 1000} seconds.`,
          }));
          ws.close(1008, 'Rate limit exceeded');
        }
        return;
      }

      // Audio data size limiting logic (sliding window)
      let parsedMessage: unknown;
      try {
        parsedMessage = JSON.parse(data.toString('utf-8'));
      } catch { /* ignore parse errors here, handled later */ }
      if (isAudioDataMessage(parsedMessage)) {
        const audioBase64 = parsedMessage.audioBase64;
        // Use raw Buffer for size calculation
        let audioBuffer: Buffer | null = null;
        try {
          audioBuffer = Buffer.from(audioBase64, 'base64');
        } catch {
          audioBuffer = null;
        }
        if (audioBuffer) {
          const audioDataSizes = wsAudioDataSizes.get(ws) ?? { timestamps: [], sizes: [] };
          // Remove entries older than TIME_WINDOW_MS using slidingWindow
          const sw = slidingWindow(audioDataSizes.timestamps, audioDataSizes.sizes, now, TIME_WINDOW_MS);
          audioDataSizes.timestamps = sw.timestamps;
          audioDataSizes.sizes = sw.values;
          // Calculate size of this audio chunk in KB (raw buffer)
          const audioSizeKB = audioBuffer.length / 1024;
          audioDataSizes.timestamps.push(now);
          audioDataSizes.sizes.push(audioSizeKB);
          wsAudioDataSizes.set(ws, audioDataSizes);
          const totalAudioKB = audioDataSizes.sizes.reduce((a, b) => a + b, 0);
          if (totalAudioKB > MAX_AUDIO_KB_PER_WINDOW) {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                message: `Audio data rate limit exceeded: Max ${MAX_AUDIO_KB_PER_WINDOW} KB per ${TIME_WINDOW_MS / 1000} seconds.`,
              }));
              ws.close(1008, 'Audio data rate limit exceeded');
            }
            return;
          }
        }
      }
      const message = data.toString('utf-8');
      await handleWebSocketMessage(ws, message);
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Internal server error',
        }));
      }
    }
  });

  // Cleanup on close/error to prevent memory leaks
  const cleanupConnection = (ws: AuthenticatedWebSocket) => {
    wsMessageTimestamps.delete(ws);
    wsAudioDataSizes.delete(ws);
  };

  ws.on('close', async () => {
    cleanupConnection(ws);
    await handleWebSocketClose(ws);
  });

  ws.on('error', async (error: Error) => {
    cleanupConnection(ws);
    await handleWebSocketError(ws, error);
  });
});

server.on('upgrade', (request, socket, head) => {
  try {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } catch (error) {
    console.error('WebSocket upgrade error:', error);
    socket.destroy();
  }
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  wss.clients.forEach((client: AuthenticatedWebSocket) => {
    if (client.readyState === client.OPEN) {
      client.close();
    }
  });

  cleanupAllSessions();

  server.close(() => {
    console.log('Server closed gracefully');
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('WebSocket server ready for connections');
});
