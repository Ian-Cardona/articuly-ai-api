import { azureSpeechService } from '../services/azure_speech.service.ts';

import type { AuthenticatedWebSocket, StartAudioStreamPayload, WebSocketMessage, StreamReadyPayload, AudioChunkPayload, StreamStoppedPayload } from '../types/websocket.type.js';

async function handleStartAudioStream(ws: AuthenticatedWebSocket, payload: StartAudioStreamPayload) {
  if (!payload.expectedText) {
    throw new Error('Missing expectedText for audio stream.');
  }
  console.log(`User ${ws.userId} starting audio stream for exercise: "${payload.expectedText}"`);
  await azureSpeechService.createAzureConnection(ws, payload.expectedText);
  ws.send(JSON.stringify({ type: 'STREAM_READY', payload: { message: 'Ready to receive audio chunks.' } as StreamReadyPayload }));
}

async function handleAudioChunk(ws: AuthenticatedWebSocket, payload: AudioChunkPayload) {
  if (!ws.userId) {
    throw new Error('WebSocket user ID is required but not provided');
  }
  if (!ws.currentExercise?.expectedText) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'STREAM_NOT_STARTED', message: 'Audio stream not initialized or missing context.' } }));
    return;
  }
  if (!ws.activeAzurePushStream) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'AZURE_NOT_READY', message: 'Azure AI Speech connection not established or stream not ready.' } }));
    return;
  }
  // Forward audio chunk to Azure AI Speech
  await azureSpeechService.sendAudioToAzure(ws.userId, payload.data);
}

async function handleStopAudioStream(ws: AuthenticatedWebSocket) {
  if (!ws.userId) {
    throw new Error('WebSocket user ID is required but not provided');
  }
  if (ws.activeAzureRecognizer) {
    await azureSpeechService.closeAzureConnection(ws.userId);
  }
  // Clean up current exercise context
  delete ws.currentExercise;
  delete ws.activeAzureRecognizer;
  delete ws.activeAzurePushStream;
  console.log(`User ${ws.userId} stopped audio stream.`);
  ws.send(JSON.stringify({ type: 'STREAM_STOPPED', payload: { message: 'Audio stream stopped.' } as StreamStoppedPayload }));
}

export const webSocketController = {
  handleMessage: async (ws: AuthenticatedWebSocket, message: string) => {
    try {
      const parsedMessage = JSON.parse(message) as WebSocketMessage;
      switch (parsedMessage.type) {
        case 'START_AUDIO_STREAM':
          await handleStartAudioStream(ws, parsedMessage.payload as StartAudioStreamPayload);
          break;
        case 'AUDIO_CHUNK':
          await handleAudioChunk(ws, parsedMessage.payload as AudioChunkPayload);
          break;
        case 'STOP_AUDIO_STREAM':
          await handleStopAudioStream(ws);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('WebSocket message handling error:', err);
    }
  },
};
