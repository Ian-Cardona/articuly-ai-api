import { azureSpeechService } from '../services/azure_speech.service.ts';
import {
  parseAndValidateWebSocketMessage,
  type ValidatedStartAudioStreamPayload,
  type ValidatedAudioChunkPayload,
  type ValidatedStopAudioStreamPayload,
} from '../validation/websocket.validation.ts';
import { errorResponses } from '../types/error.type.ts';
import { createStreamReadyResponse, createStreamStoppedResponse } from '../types/response.type.ts';
import { AudioSession } from '../models/audio_session.model.ts';

import type {
  AuthenticatedWebSocket,
} from '../types/websocket.type.ts';

async function handleStartAudioStream(ws: AuthenticatedWebSocket, payload: ValidatedStartAudioStreamPayload) {
  try {
    if (!ws.userId) {
      throw new Error('WebSocket user ID is required but not provided');
    }

    console.log(`User ${ws.userId} starting audio stream for exercise: "${payload.expectedText}"`);

    // Create or get existing session
    let session = ws.audioSession;
    if (!session) {
      session = new AudioSession(ws.userId);
      ws.audioSession = session;
    }

    // Start the session
    session.startSession(payload.exerciseType, payload.expectedText);

    // Create Azure Speech connection with the expected text
    await azureSpeechService.createAzureConnection(ws, payload.expectedText);

    // Send ready confirmation to client using response factory
    ws.send(JSON.stringify(createStreamReadyResponse(payload.expectedText, payload.exerciseType)));

    console.log(`Audio stream ready for user ${ws.userId}`);
  } catch (error) {
    console.error(`Error starting audio stream for user ${ws.userId}:`, error);
    ws.send(JSON.stringify(errorResponses.internalError({
      operation: 'start_audio_stream',
      error: error instanceof Error ? error.message : 'Unknown error',
    })));
  }
}

async function handleAudioChunk(ws: AuthenticatedWebSocket, payload: ValidatedAudioChunkPayload) {
  try {
    if (!ws.userId) {
      throw new Error('WebSocket user ID is required but not provided');
    }

    const session = ws.audioSession;
    if (!session?.isActive) {
      ws.send(JSON.stringify(errorResponses.streamNotStarted()));
      return;
    }

    if (!session.getAzurePushStream()) {
      ws.send(JSON.stringify(errorResponses.azureNotReady()));
      return;
    }

    // Validate audio data using session
    session.validateAudioData(payload.data);

    // Forward audio chunk to Azure AI Speech
    await azureSpeechService.sendAudioToAzure(ws.userId, payload.data);

  } catch (error) {
    console.error(`Error processing audio chunk for user ${ws.userId}:`, error);
    ws.send(JSON.stringify(errorResponses.audioDataInvalid({
      sequence: payload.sequence,
      error: error instanceof Error ? error.message : 'Unknown error',
    })));
  }
}

async function handleStopAudioStream(ws: AuthenticatedWebSocket, _payload?: ValidatedStopAudioStreamPayload) {
  try {
    if (!ws.userId) {
      throw new Error('WebSocket user ID is required but not provided');
    }

    console.log(`User ${ws.userId} stopping audio stream.`);

    // Close Azure connection if active
    if (ws.activeAzureRecognizer) {
      await azureSpeechService.closeAzureConnection(ws.userId);
    }

    // Stop the session
    const session = ws.audioSession;
    if (session?.isActive) {
      session.stopSession();
    }

    // Clean up WebSocket properties
    delete ws.currentExercise;
    delete ws.activeAzureRecognizer;
    delete ws.activeAzurePushStream;

    // Send stop confirmation to client using response factory
    ws.send(JSON.stringify(createStreamStoppedResponse()));

    console.log(`Audio stream stopped for user ${ws.userId}`);
  } catch (error) {
    console.error(`Error stopping audio stream for user ${ws.userId}:`, error);
    ws.send(JSON.stringify(errorResponses.internalError({
      operation: 'stop_audio_stream',
      error: error instanceof Error ? error.message : 'Unknown error',
    })));
  }
}

export const webSocketController = {
  handleMessage: async (ws: AuthenticatedWebSocket, message: string) => {
    try {
      // Validate message format
      if (!message || typeof message !== 'string') {
        throw new Error('Invalid message format: must be a non-empty string');
      }

      // Parse and validate the message using the safe parsing function
      const validatedMessage = parseAndValidateWebSocketMessage(message);

      console.log(`Processing message type "${validatedMessage.type}" for user ${ws.userId}`);

      switch (validatedMessage.type) {
        case 'START_AUDIO_STREAM':
          await handleStartAudioStream(ws, validatedMessage.payload);
          break;

        case 'AUDIO_CHUNK':
          await handleAudioChunk(ws, validatedMessage.payload);
          break;

        case 'STOP_AUDIO_STREAM':
          await handleStopAudioStream(ws, validatedMessage.payload);
          break;

        default:
          console.warn(`Unknown message type "${validatedMessage.type}" from user ${ws.userId}`);
          ws.send(JSON.stringify(errorResponses.invalidMessage({
            receivedType: validatedMessage.type,
          })));
          break;
      }
    } catch (err) {
      console.error('WebSocket message handling error:', err);

      // Send error response to client using error factory
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(errorResponses.invalidMessage({
          error: err instanceof Error ? err.message : 'Failed to parse or process message.',
        })));
      }
    }
  },

  // Helper method to check if a user has an active stream
  hasActiveStream: (ws: AuthenticatedWebSocket): boolean => {
    return ws.audioSession?.isActive ?? false;
  },

  // Helper method to get current exercise info
  getCurrentExercise: (ws: AuthenticatedWebSocket) => {
    return ws.audioSession?.exerciseConfig ?? null;
  },

  // Helper method to get session info
  getSessionInfo: (ws: AuthenticatedWebSocket) => {
    return ws.audioSession?.getSessionInfo() ?? null;
  },
};
