import app, { wss } from './app.ts';
import { webSocketController } from './controllers/websocket.controller.ts';
import { azureSpeechService } from './services/azure_speech.service.ts';
import { verifyIdToken } from './firebase/firebase_admin.ts';
import { parseAndValidateWebSocketMessage } from './validation/websocket.validation.ts';
import { errorResponses } from './types/error.type.ts';
import { createSuccessResponse } from './types/response.type.ts';

import type { AuthenticatedWebSocket } from './types/websocket.type.ts';
import type { IncomingMessage } from 'http';
import type { Socket } from 'net';

const PORT = process.env.PORT ?? 3000;

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

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

server.on('upgrade', (req: IncomingMessage, socket:Socket, head:Buffer) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
  socket.on('error', (err) => {
    console.error('WebSocket socket error:', err);
  });
});

wss.on('connection', (ws: AuthenticatedWebSocket, _req: Request) => {
  let userId: string | null = null;
  ws.on('message', async (message) => {
    try {
      const messageString: string = message.toString();
      let data;
      try {
        data = parseAndValidateWebSocketMessage(messageString);
      } catch (validationError) {
        const errorMessage = validationError instanceof Error ? validationError.message : 'Invalid message format';
        ws.send(JSON.stringify(errorResponses.invalidMessage({
          error: `Validation error: ${errorMessage}`,
        })));
        ws.close(1003, 'Invalid message format');
        return;
      }

      if (data.type === 'AUTH' && !userId) {
        const authData = data;
        try {
          const decodedToken = await verifyIdToken(authData.idToken);
          userId = decodedToken.uid;
          console.log(`User ${userId} authenticated successfully.`);
          ws.send(JSON.stringify(createSuccessResponse('Authenticated')));
          ws.userId = userId;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Authentication failed for incoming connection: ${errorMessage}`);
          ws.send(JSON.stringify(errorResponses.authFailed({
            error: errorMessage,
          })));
          ws.close(1008, 'Authentication failed');
          return;
        }
      } else if (userId && (data.type === 'AUDIO_CHUNK' || data.type === 'START_AUDIO_STREAM' || data.type === 'STOP_AUDIO_STREAM')) {
        // Process audio from an authenticated user
        // Use ws.userId for usage tracking and Firestore interactions
        // ... your existing Azure speech processing logic ...
        await webSocketController.handleMessage(ws, messageString);
      } else {
        // Handle unauthenticated audio attempts or other invalid messages
        console.warn('Received unauthenticated message or invalid type:', data);
        ws.send(JSON.stringify(errorResponses.invalidMessage({
          error: 'Not authenticated or invalid message.',
        })));
        if (!userId) {
          ws.close(1008, 'Authentication required');
        }
      }
    } catch (error) {
      console.error('WebSocket message handling error:', error);
      ws.send(JSON.stringify(errorResponses.internalError({
        operation: 'websocket_message_handling',
        error: error instanceof Error ? error.message : 'Unknown error',
      })));
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket client disconnected. User ID: ${ws.userId ?? 'N/A'}`);
    if (ws.userId) {
      azureSpeechService.closeAzureConnection(ws.userId);
      // Clean up session
      if (ws.audioSession) {
        ws.audioSession.cleanup();
      }
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for user ${ws.userId ?? 'N/A'}:`, error);
    if (ws.userId) {
      azureSpeechService.closeAzureConnection(ws.userId);
      // Clean up session
      if (ws.audioSession) {
        ws.audioSession.cleanup();
      }
    }
  });
});
