import { createServer } from 'http';

import { WebSocketServer } from 'ws';

import app from './app.ts';
import { cleanupAllSessions } from './services/session_monitor.service.ts';
import {
  initializeWebSocketMiddleware,
  handleWebSocketMessageWithMiddleware,
  handleWebSocketCloseWithMiddleware,
  handleWebSocketErrorWithMiddleware,
} from './middlewares/websocket.middleware.ts';
import { infoLogger } from './middlewares/logging.middleware.ts';

import type { AuthenticatedWebSocket } from './types/websocket.type.ts';

const PORT = process.env.PORT ?? 3000;

const server = createServer(app);

const wss = new WebSocketServer({ noServer: true });

interface AuthStateWebSocket extends AuthenticatedWebSocket {
  isAuthenticated?: boolean;
}

wss.on('connection', (ws: AuthStateWebSocket) => {
  initializeWebSocketMiddleware(ws);

  ws.on('message', async (data: Buffer) => {
    await handleWebSocketMessageWithMiddleware(ws, data);
  });

  ws.on('close', (code?: number, reason?: string) => {
    handleWebSocketCloseWithMiddleware(ws, code, reason);
  });

  ws.on('error', (error: Error) => {
    handleWebSocketErrorWithMiddleware(ws, error);
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    infoLogger(`Server is running on port ${PORT}`);
    console.log(`Server is running on port ${PORT}`);
  });

  process.on('SIGTERM', () => {
    infoLogger('SIGTERM received, shutting down gracefully');
    cleanupAllSessions();
    server.close(() => {
      infoLogger('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    infoLogger('SIGINT received, shutting down gracefully');
    cleanupAllSessions();
    server.close(() => {
      infoLogger('Server closed');
      process.exit(0);
    });
  });
}

export async function startTestServer(port = 0): Promise<{ port: number }> {
  return new Promise((resolve) => {
    const testServer = createServer(app);
    const testWss = new WebSocketServer({ server: testServer });

    testWss.on('connection', (ws: AuthStateWebSocket) => {
      initializeWebSocketMiddleware(ws);
      ws.on('message', async (data: Buffer) => {
        await handleWebSocketMessageWithMiddleware(ws, data);
      });
      ws.on('close', (code?: number, reason?: string) => {
        handleWebSocketCloseWithMiddleware(ws, code, reason);
      });
      ws.on('error', (error: Error) => {
        handleWebSocketErrorWithMiddleware(ws, error);
      });
    });

    testServer.listen(port, () => {
      const address = testServer.address();
      const testPort = typeof address === 'object' && address ? address.port : 0;
      resolve({ port: testPort });
    });
  });
}

export async function stopTestServer(): Promise<void> {
  cleanupAllSessions();
}
