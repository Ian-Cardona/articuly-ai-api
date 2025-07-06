import type { WebSocket } from 'ws';
import type * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload?: T;
}

export interface AuthMessage extends WebSocketMessage {
  type: 'AUTH';
  idToken: string;
}

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  activeAzureRecognizer?: speechsdk.SpeechRecognizer;
  activeAzurePushStream?: speechsdk.PushAudioInputStream;
  currentExercise?: {
    exerciseType: 'tongueTwister';
    expectedText: string;
    expectedWords: string[];
    nextWordToConfirmIndex: number;
  };
}

export interface StartAudioStreamPayload {
  exerciseType: 'tongueTwister';
  expectedText: string;
}

// Client -> Server: Send audio data chunks
export interface AudioChunkPayload {
  data: string; // Base64 encoded audio data (raw PCM bytes)
  sequence: number;
}

export interface StopAudioStreamPayload {
  // No specific payload needed for now, just the type
}

// Server -> Client: Immediate word feedback (textual match)
export interface WordFeedbackLivePayload {
  word: string;
  index: number;
  status: 'matched' | 'skipped' | 'misrecognized'; // Simple status for immediate UI feedback
  // 'matched': The word was heard and matched the expected word.
  // 'skipped': The word was expected but not heard, and subsequent words were heard.
  // 'misrecognized': The word was heard, but didn't match the expected word at this position.
}

// Server -> Client: Pronunciation assessment feedback (final, detailed)
export interface PronunciationFeedbackPayload {
  overallResult: unknown; // The raw JSON result from Azure, which includes word-level details
  // You might add more structured fields here later if you want to simplify on backend
}

export interface StreamReadyPayload {
  message: string;
}

export interface StreamStoppedPayload {
  message: string;
}
