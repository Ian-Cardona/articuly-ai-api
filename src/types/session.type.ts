import type * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

/**
 * Supported exercise types for sessions.
 * Extend this enum as new exercise types are added.
 */
export enum ExerciseType {
  TongueTwister = 'tongueTwister',
  // Pronunciation = 'pronunciation',
  // Reading = 'reading',
}

/**
 * Configuration for a session exercise.
 */
export interface ExerciseConfig {
  /** The type of exercise (e.g., tongue twister). */
  readonly exerciseType: ExerciseType;
  /** The full text the user is expected to say. */
  readonly expectedText: string;
  /** The words the user is expected to say, split for granular validation. */
  readonly expectedWords: readonly string[];
}

/**
 * State of a user's session.
 * Note: Dates are stored as Date objects internally, but will be serialized as ISO strings in API responses.
 */
export interface SessionState {
  /** Whether the session is currently active. */
  readonly isActive: boolean;
  /** The exercise configuration, or null if not set. */
  readonly exerciseConfig: ExerciseConfig | null;
  /** The index of the next word to confirm. */
  readonly nextWordToConfirmIndex: number;
  /** Session start time (Date or ISO string in API). */
  readonly startTime: Date | null;
  /** Session end time (Date or ISO string in API). */
  readonly endTime: Date | null;
}

/**
 * Represents a user's audio session, including Azure connection state.
 */
export interface AudioSession {
  readonly userId: string;
  readonly state: SessionState;
  readonly azureRecognizer: speechsdk.SpeechRecognizer | null;
  readonly azurePushStream: speechsdk.PushAudioInputStream | null;
}

/**
 * Parameters for creating a new session.
 */
export interface CreateSessionParams {
  readonly userId: string;
  readonly exerciseType: ExerciseType;
  readonly expectedText: string;
}

/**
 * Parameters for starting a session.
 */
export interface StartSessionParams {
  readonly session: AudioSession;
  readonly exerciseType: ExerciseType;
  readonly expectedText: string;
}

/**
 * Parameters for setting up Azure connection in a session.
 */
export interface SetAzureConnectionParams {
  readonly session: AudioSession;
  readonly recognizer: speechsdk.SpeechRecognizer;
  readonly pushStream: speechsdk.PushAudioInputStream;
}

/**
 * Parameters for advancing the word index in a session.
 */
export interface AdvanceWordIndexParams {
  readonly session: AudioSession;
}

/**
 * Parameters for validating audio data.
 */
export interface ValidateAudioDataParams {
  readonly audioBase64: string;
}

/**
 * Public-facing session info for API responses.
 * Note: Dates will be serialized as ISO strings in API responses.
 */
export interface SessionInfo {
  readonly userId: string;
  readonly isActive: boolean;
  readonly exerciseConfig: ExerciseConfig | null;
  readonly nextWordToConfirmIndex: number;
  readonly startTime: Date | string | null;
  readonly endTime: Date | string | null;
  readonly duration: number | null;
  readonly hasAzureConnection: boolean;
}

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/**
 * Result of audio validation, with optional decoded buffer.
 */
export interface AudioValidationResult extends ValidationResult {
  readonly audioBuffer?: Buffer;
}

/**
 * Session error codes.
 * Extend as needed for new error cases.
 */
export type SessionError =
  | 'SESSION_ALREADY_ACTIVE'
  | 'SESSION_NOT_ACTIVE'
  | 'INVALID_EXERCISE_TEXT'
  | 'NO_EXERCISE_CONFIG'
  | 'INVALID_AUDIO_DATA'
  | 'AUDIO_DATA_EMPTY'
  | 'INVALID_BASE64_FORMAT';

/**
 * Result object for session-related errors.
 * The shape of `details` depends on the error code.
 *
 * Example:
 *   { error: 'INVALID_AUDIO_DATA', message: 'Audio data is invalid', details: { reason: 'empty' } }
 */
export interface SessionErrorResult {
  readonly error: SessionError;
  readonly message: string;
  readonly details?: Record<string, unknown>; // See above for expected shapes
}
