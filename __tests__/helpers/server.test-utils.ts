import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import app from '../../src/app.ts';
import { cleanupAllSessions } from '../../src/services/session_monitor.service.ts';
import {
  initializeWebSocketMiddleware,
  handleWebSocketMessageWithMiddleware,
  handleWebSocketCloseWithMiddleware,
  handleWebSocketErrorWithMiddleware,
} from '../../src/middlewares/websocket.middleware.ts';
import type { AuthenticatedWebSocket } from '../../src/types/websocket.type.ts';

interface AuthStateWebSocket extends AuthenticatedWebSocket {
  isAuthenticated?: boolean;
}

let testServerInstance: ReturnType<typeof createServer> | null = null;
let testWssInstance: WebSocketServer | null = null;

export async function startTestServer(port = 0): Promise<{ port: number }> {
  return new Promise((resolve) => {
    testServerInstance = createServer(app);
    testWssInstance = new WebSocketServer({ server: testServerInstance });

    testWssInstance.on('connection', (ws: AuthStateWebSocket) => {
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

    testServerInstance.listen(port, () => {
      const address = testServerInstance!.address();
      const testPort = typeof address === 'object' && address ? address.port : 0;
      resolve({ port: testPort });
    });
  });
}

export async function stopTestServer(): Promise<void> {
  cleanupAllSessions();
  if (testWssInstance) {
    await new Promise<void>((resolve) => testWssInstance!.close(() => resolve()));
    testWssInstance = null;
  }
  if (testServerInstance) {
    await new Promise<void>((resolve) => testServerInstance!.close(() => resolve()));
    testServerInstance = null;
  }
} 