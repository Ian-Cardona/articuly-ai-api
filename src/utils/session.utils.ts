import { ERROR_MESSAGES } from '../constants/error.constant.ts';

import type {
  AudioSession,
  SessionState,
  ExerciseConfig,
  CreateSessionParams,
  StartSessionParams,
  SetAzureConnectionParams,
  AdvanceWordIndexParams,
  ValidateAudioDataParams,
  SessionInfo,
  AudioValidationResult,
  SessionErrorResult,
  SessionError,
  ExerciseType,
} from '../types/session.type.ts';

// Type guards for session properties
function hasExerciseConfig(session: AudioSession): session is AudioSession & { state: { exerciseConfig: ExerciseConfig } } {
  return session.state.exerciseConfig !== null;
}

export const sessionUtils = {
  parseExpectedWords: (text: string): readonly string[] => {
    return text.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  },

  /**
   * Create a new ExerciseConfig for a session.
   */
  createExerciseConfig: (exerciseType: ExerciseType, expectedText: string): ExerciseConfig => {
    const trimmedText = expectedText.trim();
    if (!trimmedText) {
      throw new Error(ERROR_MESSAGES.INVALID_PAYLOAD_FORMAT);
    }

    return {
      exerciseType,
      expectedText: trimmedText,
      expectedWords: sessionUtils.parseExpectedWords(trimmedText),
    };
  },

  calculateDuration: (startTime: Date | null, endTime: Date | null): number | null => {
    if (!startTime) return null;
    const end = endTime ?? new Date();
    return end.getTime() - startTime.getTime();
  },

  validateAudioData: (params: ValidateAudioDataParams): AudioValidationResult => {
    const { audioBase64 } = params;
    const errors: string[] = [];

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      errors.push(ERROR_MESSAGES.INVALID_AUDIO_DATA_FORMAT);
      return { isValid: false, errors };
    }

    if (audioBase64.trim().length === 0) {
      errors.push(ERROR_MESSAGES.INVALID_AUDIO_DATA_FORMAT);
      return { isValid: false, errors };
    }

    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      if (audioBuffer.length === 0) {
        errors.push(ERROR_MESSAGES.INVALID_AUDIO_DATA_FORMAT);
        return { isValid: false, errors };
      }

      return { isValid: true, errors: [], audioBuffer };
    } catch {
      errors.push(ERROR_MESSAGES.INVALID_AUDIO_DATA_FORMAT);
      return { isValid: false, errors };
    }
  },

  /**
   * Create a new AudioSession for a user.
   */
  createSession: (params: CreateSessionParams): AudioSession => {
    const { userId, exerciseType: _exerciseType, expectedText: _expectedText } = params;

    if (!userId || typeof userId !== 'string') {
      throw new Error(ERROR_MESSAGES.SESSION_NOT_FOUND);
    }

    const initialState: SessionState = {
      isActive: false,
      exerciseConfig: null,
      nextWordToConfirmIndex: 0,
      startTime: null,
      endTime: null,
      attempts: [],
      currentAttemptIndex: -1,
    };

    return {
      userId,
      state: initialState,
      azureRecognizer: null,
      azurePushStream: null,
    };
  },

  /**
   * Start a session, activating it and setting exercise config.
   */
  startSession: (params: StartSessionParams): AudioSession => {
    const { session, exerciseType, expectedText } = params;

    if (session.state.isActive) {
      throw new Error(ERROR_MESSAGES.SESSION_NOT_ACTIVE);
    }

    const exerciseConfig = sessionUtils.createExerciseConfig(exerciseType, expectedText);

    const newState: SessionState = {
      isActive: true,
      exerciseConfig,
      nextWordToConfirmIndex: 0,
      startTime: new Date(),
      endTime: null,
      attempts: [{
        attemptNumber: 1,
        startTime: new Date(),
        endTime: null,
        duration: null,
        result: null,
        feedback: null,
      }],
      currentAttemptIndex: 0,
    };

    return {
      ...session,
      state: newState,
    };
  },

  stopSession: (session: AudioSession): AudioSession => {
    if (!session.state.isActive) {
      throw new Error(ERROR_MESSAGES.SESSION_NOT_ACTIVE);
    }

    const newState: SessionState = {
      ...session.state,
      isActive: false,
      endTime: new Date(),
      nextWordToConfirmIndex: 0,
    };

    return {
      ...session,
      state: newState,
    };
  },

  advanceWordIndex: (params: AdvanceWordIndexParams): AudioSession => {
    const { session } = params;

    if (!hasExerciseConfig(session)) {
      throw new Error(ERROR_MESSAGES.INVALID_PAYLOAD_FORMAT);
    }

    const newState: SessionState = {
      ...session.state,
      nextWordToConfirmIndex: session.state.nextWordToConfirmIndex + 1,
    };

    return {
      ...session,
      state: newState,
    };
  },

  resetWordIndex: (session: AudioSession): AudioSession => {
    const newState: SessionState = {
      ...session.state,
      nextWordToConfirmIndex: 0,
    };

    return {
      ...session,
      state: newState,
    };
  },

  setAzureConnection: (params: SetAzureConnectionParams): AudioSession => {
    const { session, recognizer, pushStream } = params;

    return {
      ...session,
      azureRecognizer: recognizer,
      azurePushStream: pushStream,
    };
  },

  clearAzureConnection: (session: AudioSession): AudioSession => {
    return {
      ...session,
      azureRecognizer: null,
      azurePushStream: null,
    };
  },

  getSessionInfo: (session: AudioSession): SessionInfo => {
    return {
      userId: session.userId,
      isActive: session.state.isActive,
      exerciseConfig: session.state.exerciseConfig,
      nextWordToConfirmIndex: session.state.nextWordToConfirmIndex,
      startTime: session.state.startTime,
      endTime: session.state.endTime,
      duration: sessionUtils.calculateDuration(session.state.startTime, session.state.endTime),
      hasAzureConnection: !!(session.azureRecognizer && session.azurePushStream),
    };
  },

  canAdvanceWordIndex: (session: AudioSession): boolean => {
    return session.state.isActive &&
           hasExerciseConfig(session) &&
           session.state.nextWordToConfirmIndex < session.state.exerciseConfig.expectedWords.length;
  },

  isSessionActive: (session: AudioSession): boolean => {
    return session.state.isActive;
  },

  hasAzureConnection: (session: AudioSession): boolean => {
    return !!(session.azureRecognizer && session.azurePushStream);
  },

  createSessionError: (error: SessionError, message: string, details?: Record<string, unknown>): SessionErrorResult => {
    return {
      error,
      message,
      details,
    };
  },
};
