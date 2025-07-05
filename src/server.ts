import app, { wss } from './app.ts';
import { webSocketController } from './controllers/websocket.controller.ts';
import { azureSpeechService } from './services/azure_speech.service.ts';

import type { AuthenticatedWebSocket } from './types/websocket.type.js';

const PORT = process.env.PORT ?? 3000;

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
  socket.on('error', (err) => {
    console.error('WebSocket socket error:', err);
  });
});

wss.on('connection', (ws: AuthenticatedWebSocket) => {
  // TODO: Assign handlerWs.userId here based on authentication/session/query, for now use a random string for demo
  ws.userId ??= Math.random().toString(36).substring(2, 15);

  ws.on('message', async (message) => {
    try {
      if (typeof message === 'string') {
        await webSocketController.handleMessage(ws, message);
      } else {
        console.warn('Received non-string WebSocket message:', message);
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid message format.' } }));
      }
    } catch (error) {
      console.error('WebSocket message handling error:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        payload: { message: 'Internal server error occurred.' },
      }));
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket client disconnected. User ID: ${ws.userId ?? 'N/A'}`);
    if (ws.userId) {
      azureSpeechService.closeAzureConnection(ws.userId);
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for user ${ws.userId ?? 'N/A'}:`, error);
    if (ws.userId) {
      azureSpeechService.closeAzureConnection(ws.userId);
    }
  });
});
