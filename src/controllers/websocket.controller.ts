import { azureSpeechService } from '../services/azure_speech.service.ts';

import type {
  AuthenticatedWebSocket,
  StartAudioStreamPayload,
  WebSocketMessage,
  StreamReadyPayload,
  AudioChunkPayload,
  StreamStoppedPayload,
  StopAudioStreamPayload,
} from '../types/websocket.type.ts';

async function handleStartAudioStream(ws: AuthenticatedWebSocket, payload: StartAudioStreamPayload) {
  try {
    if (!ws.userId) {
      throw new Error('WebSocket user ID is required but not provided');
    }

    if (!payload.expectedText || payload.expectedText.trim().length === 0) {
      throw new Error('Missing or empty expectedText for audio stream.');
    }

    console.log(`User ${ws.userId} starting audio stream for exercise: "${payload.expectedText}"`);

    // Create Azure Speech connection with the expected text
    await azureSpeechService.createAzureConnection(ws, payload.expectedText);

    // Send ready confirmation to client
    ws.send(JSON.stringify({
      type: 'STREAM_READY',
      payload: {
        message: 'Ready to receive audio chunks.',
        expectedText: payload.expectedText,
        exerciseType: payload.exerciseType,
      } as StreamReadyPayload,
    }));

    console.log(`Audio stream ready for user ${ws.userId}`);
  } catch (error) {
    console.error(`Error starting audio stream for user ${ws.userId}:`, error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: {
        code: 'START_STREAM_FAILED',
        message: error instanceof Error ? error.message : 'Failed to start audio stream.',
      },
    }));
  }
}

async function handleAudioChunk(ws: AuthenticatedWebSocket, payload: AudioChunkPayload) {
  try {
    if (!ws.userId) {
      throw new Error('WebSocket user ID is required but not provided');
    }

    if (!payload.data || typeof payload.data !== 'string') {
      throw new Error('Invalid audio data: must be a non-empty base64 string');
    }

    if (!ws.currentExercise?.expectedText) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        payload: {
          code: 'STREAM_NOT_STARTED',
          message: 'Audio stream not initialized or missing context.',
        },
      }));
      return;
    }

    if (!ws.activeAzurePushStream) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        payload: {
          code: 'AZURE_NOT_READY',
          message: 'Azure AI Speech connection not established or stream not ready.',
        },
      }));
      return;
    }

    // Validate base64 data
    try {
      Buffer.from(payload.data, 'base64');
    } catch {
      throw new Error('Invalid base64 audio data');
    }

    // Forward audio chunk to Azure AI Speech
    await azureSpeechService.sendAudioToAzure(ws.userId, payload.data);

  } catch (error) {
    console.error(`Error processing audio chunk for user ${ws.userId}:`, error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: {
        code: 'AUDIO_CHUNK_FAILED',
        message: error instanceof Error ? error.message : 'Failed to process audio chunk.',
      },
    }));
  }
}

async function handleStopAudioStream(ws: AuthenticatedWebSocket, _payload?: StopAudioStreamPayload) {
  try {
    if (!ws.userId) {
      throw new Error('WebSocket user ID is required but not provided');
    }

    console.log(`User ${ws.userId} stopping audio stream.`);

    // Close Azure connection if active
    if (ws.activeAzureRecognizer) {
      await azureSpeechService.closeAzureConnection(ws.userId);
    }

    // Clean up current exercise context
    delete ws.currentExercise;
    delete ws.activeAzureRecognizer;
    delete ws.activeAzurePushStream;

    // Send stop confirmation to client
    ws.send(JSON.stringify({
      type: 'STREAM_STOPPED',
      payload: {
        message: 'Audio stream stopped successfully.',
        timestamp: new Date().toISOString(),
      } as StreamStoppedPayload,
    }));

    console.log(`Audio stream stopped for user ${ws.userId}`);
  } catch (error) {
    console.error(`Error stopping audio stream for user ${ws.userId}:`, error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: {
        code: 'STOP_STREAM_FAILED',
        message: error instanceof Error ? error.message : 'Failed to stop audio stream.',
      },
    }));
  }
}

export const webSocketController = {
  handleMessage: async (ws: AuthenticatedWebSocket, message: string) => {
    try {
      // Validate message format
      if (!message || typeof message !== 'string') {
        throw new Error('Invalid message format: must be a non-empty string');
      }

      const parsedMessage = JSON.parse(message) as WebSocketMessage;

      if (!parsedMessage.type) {
        throw new Error('Message missing required "type" field');
      }

      console.log(`Processing message type "${parsedMessage.type}" for user ${ws.userId}`);

      switch (parsedMessage.type) {
        case 'START_AUDIO_STREAM':
          await handleStartAudioStream(ws, parsedMessage.payload as StartAudioStreamPayload);
          break;

        case 'AUDIO_CHUNK':
          await handleAudioChunk(ws, parsedMessage.payload as AudioChunkPayload);
          break;

        case 'STOP_AUDIO_STREAM':
          await handleStopAudioStream(ws, parsedMessage.payload as StopAudioStreamPayload);
          break;

        default:
          console.warn(`Unknown message type "${parsedMessage.type}" from user ${ws.userId}`);
          ws.send(JSON.stringify({
            type: 'ERROR',
            payload: {
              code: 'UNKNOWN_MESSAGE_TYPE',
              message: `Unknown message type: ${parsedMessage.type}`,
            },
          }));
          break;
      }
    } catch (err) {
      console.error('WebSocket message handling error:', err);

      // Send error response to client
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          payload: {
            code: 'MESSAGE_PARSING_ERROR',
            message: err instanceof Error ? err.message : 'Failed to parse or process message.',
          },
        }));
      }
    }
  },

  // Helper method to check if a user has an active stream
  hasActiveStream: (ws: AuthenticatedWebSocket): boolean => {
    return !!(ws.activeAzureRecognizer && ws.activeAzurePushStream && ws.currentExercise);
  },

  // Helper method to get current exercise info
  getCurrentExercise: (ws: AuthenticatedWebSocket) => {
    return ws.currentExercise;
  },
};
