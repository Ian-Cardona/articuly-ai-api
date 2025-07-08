import { ExerciseType } from '../types/session.type.ts';

import type { ExerciseConfig } from '../types/session.type.ts';
import type { SessionResponsePayload, ExerciseResponsePayload, WordFeedbackLivePayload, PronunciationFeedbackPayload } from '../types/websocket.type.ts';
import type { StreamReadyResponse, StreamStoppedResponse, SuccessResponse, AuthSuccessResponse } from '../types/response.type.ts';

function isExerciseConfig(obj: unknown): obj is ExerciseConfig {
  const maybe = obj as Partial<ExerciseConfig>;
  return (
    typeof maybe === 'object' &&
    typeof maybe.exerciseType === 'string' &&
    typeof maybe.expectedText === 'string' &&
    Array.isArray(maybe.expectedWords) &&
    maybe.expectedWords.every((w: unknown) => typeof w === 'string')
  );
}

function isWordFeedback(
  word: unknown,
  index: unknown,
  status: unknown,
): word is string {
  return (
    typeof word === 'string' &&
    typeof index === 'number' &&
    ['matched', 'skipped', 'misrecognized'].includes(status as string)
  );
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function isPronunciationResult(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
}

function isValidExerciseType(value: unknown): value is ExerciseType {
  return value === 'tongueTwister'; // Expand this if you add more types
}

export const createStreamReadyResponse = (
  expectedText: string,
  exerciseType: ExerciseType = ExerciseType.TongueTwister,
): StreamReadyResponse => {
  if (typeof expectedText !== 'string') {
    throw new Error('expectedText must be a string');
  }
  if (!isValidExerciseType(exerciseType)) {
    throw new Error('Invalid exerciseType');
  }
  return {
    type: 'STREAM_READY',
    payload: {
      message: 'Ready to receive audio chunks.',
      expectedText,
      exerciseType,
      timestamp: getTimestamp(),
    },
  };
};

export const createStreamStoppedResponse = (): StreamStoppedResponse => ({
  type: 'STREAM_STOPPED',
  payload: {
    message: 'Audio stream stopped successfully.',
    timestamp: getTimestamp(),
  },
});

function createExerciseConfigResponse(
  message: string,
  exerciseConfig: ExerciseConfig,
): { message: string; exerciseConfig: { exerciseType: ExerciseType; expectedText: string; expectedWords: string[] } } {
  return {
    message,
    exerciseConfig: {
      exerciseType: exerciseConfig.exerciseType,
      expectedText: exerciseConfig.expectedText,
      expectedWords: [...exerciseConfig.expectedWords] as string[],
    },
  };
}

export const createSessionResponse = (exerciseConfig: ExerciseConfig): SessionResponsePayload => {
  if (!isExerciseConfig(exerciseConfig)) {
    throw new Error('Invalid exerciseConfig object');
  }
  return createExerciseConfigResponse('Session started successfully', exerciseConfig);
};

export const createExerciseResponse = (exerciseConfig: ExerciseConfig): ExerciseResponsePayload => {
  if (!isExerciseConfig(exerciseConfig)) {
    throw new Error('Invalid exerciseConfig object');
  }
  return createExerciseConfigResponse('Exercise submitted successfully', exerciseConfig);
};

export const createWordFeedbackResponse = (
  word: string,
  index: number,
  status: 'matched' | 'skipped' | 'misrecognized',
): WordFeedbackLivePayload => {
  if (!isWordFeedback(word, index, status)) {
    throw new Error('Invalid arguments for createWordFeedbackResponse');
  }
  return { word, index, status };
};

export const createPronunciationFeedbackResponse = (overallResult: unknown): PronunciationFeedbackPayload => {
  if (!isPronunciationResult(overallResult)) {
    throw new Error('Invalid overallResult for createPronunciationFeedbackResponse');
  }
  return { overallResult };
};

export const createSuccessResponse = (message: string): SuccessResponse => {
  if (typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  return {
    type: 'SUCCESS',
    payload: {
      message,
      timestamp: getTimestamp(),
    },
  };
};

export const createAuthSuccessResponse = (userId: string): AuthSuccessResponse => {
  if (typeof userId !== 'string') {
    throw new Error('User ID must be a string');
  }
  return {
    type: 'auth_success',
    payload: {
      userId,
      timestamp: getTimestamp(),
    },
  };
};
