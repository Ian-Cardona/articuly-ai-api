import { azureSpeechService } from '../services/azure-speech.service.js';

import type { HandlerWebSocket, StartAudioStreamPayload, WebSocketMessage, StreamReadyPayload, AudioChunkPayload, StreamStoppedPayload } from '../types/websocket.type.js';

async function handleStartAudioStream(ws: HandlerWebSocket, payload: StartAudioStreamPayload) {
  if (!ws.userId) {
    throw new Error('User not authenticated to start stream.');
  }
  if (!payload?.expectedText) {
    throw new Error('Missing expectedText for audio stream.');
  }

  console.log(`User ${ws.userId} starting audio stream for exercise: "${payload.expectedText}"`);

  await azureSpeechService.createAzureConnection(ws, payload.expectedText);

  ws.currentExercise = payload;
  ws.send(JSON.stringify({ type: 'STREAM_READY', payload: { message: 'Ready to receive audio chunks.' } as StreamReadyPayload }));
}

async function handleAudioChunk(ws: HandlerWebSocket, payload: AudioChunkPayload) {
  if (!ws.userId) {
    throw new Error('User not authenticated to send audio.');
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

async function handleStopAudioStream(ws: HandlerWebSocket) {
  if (!ws.userId) {
    throw new Error('User not authenticated.');
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
  handleMessage: async (ws: HandlerWebSocket, message: string) => {
    try {
      const parsedMessage: WebSocketMessage = JSON.parse(message);
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
