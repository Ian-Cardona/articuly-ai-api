import type { PushAudioInputStream, SpeechRecognizer } from 'microsoft-cognitiveservices-speech-sdk';
import type { WebSocket } from 'ws';

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload?: T;
}

export interface HandlerWebSocket extends WebSocket {
  userId?: string;
  activeAzureRecognizer?: SpeechRecognizer;
  activeAzurePushStream?: PushAudioInputStream;
  currentExercise?: {
    exerciseType: 'tongueTwister';
    expectedText: string;
  };
}

// Client -> Server: Initiate audio stream for an exercise
export interface StartAudioStreamPayload {
  exerciseType: 'tongueTwister';
  expectedText: string;
}

// Client -> Server: Send audio data chunks
export interface AudioChunkPayload {
  data: string; // Base64 encoded audio data (raw PCM bytes)
  sequence: number; // To help order chunks if they arrive out of order (good practice)
}

// Client -> Server: Signal end of audio stream
export type StopAudioStreamPayload = object;

// Server -> Client: Pronunciation assessment feedback
export interface PronunciationFeedbackPayload {
  overallResult: unknown; // The raw JSON result from Azure, or a processed subset
}

// Server -> Client: Confirmation that stream is ready
export interface StreamReadyPayload {
  message: string;
}

// Server -> Client: Confirmation that stream is stopped
export interface StreamStoppedPayload {
  message: string;
}
