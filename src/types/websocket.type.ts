import type { WebSocket } from 'ws';
import type { ExerciseConfig } from './session.type.ts';

// --- Incoming WebSocket message types ---

export type WebSocketMessage =
  | { type: 'startSession'; payload: { type: 'startSession'; exerciseText: string } }
  | { type: 'submitExercise'; payload: { type: 'submitExercise'; exerciseText: string } }
  | { type: 'audioData'; payload: { type: 'audioData'; audioBase64: string } }
  | { type: 'stopSession'; payload: { type: 'stopSession' } };

// For handler convenience, a union of all payloads
export type WebSocketPayload =
  | StartSessionPayload
  | SubmitExercisePayload
  | AudioDataPayload
  | StopSessionPayload;

export interface StartSessionPayload {
  type: 'startSession';
  exerciseText: string;
}

export interface SubmitExercisePayload {
  type: 'submitExercise';
  exerciseText: string;
}

export interface AudioDataPayload {
  type: 'audioData';
  audioBase64: string;
}

export interface StopSessionPayload {
  type: 'stopSession';
}

// --- Auth message ---
export interface AuthMessage {
  type: 'AUTH';
  idToken: string;
}

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  id?: string;
}

// --- Response payloads ---
export interface WordFeedbackLivePayload {
  word: string;
  index: number;
  status: 'matched' | 'skipped' | 'misrecognized';
}

export interface PronunciationFeedbackPayload {
  overallResult: Record<string, unknown>; // Raw JSON result from Azure
}

export interface SessionResponsePayload {
  message: string;
  exerciseConfig: ExerciseConfig;
}

export interface ExerciseResponsePayload {
  message: string;
  exerciseConfig: ExerciseConfig;
}
