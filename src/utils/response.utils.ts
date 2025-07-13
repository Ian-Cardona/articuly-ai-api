import { ExerciseType } from '../types/session.type.ts';

import type { ExerciseConfig } from '../types/session.type.ts';
import type { SessionResponsePayload, ExerciseResponsePayload, WordFeedbackLivePayload, PronunciationFeedbackPayload, ReconnectResponsePayload } from '../types/websocket.type.ts';
import type { StreamReadyResponse, StreamStoppedResponse, SuccessResponse, AuthSuccessResponse } from '../types/response.type.ts';
import type { UserAccount } from '../types/user.type.ts';

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

export const createAuthSuccessResponse = (userAccount: UserAccount): AuthSuccessResponse => {
  if (typeof userAccount.userId !== 'string') {
    throw new Error('User account must be provided with valid userId');
  }
  if (typeof userAccount.email !== 'string') {
    throw new Error('User account must have valid email');
  }
  if (typeof userAccount.displayName !== 'string') {
    throw new Error('User account must have valid displayName');
  }
  if (typeof userAccount.dailyLimit !== 'number') {
    throw new Error('User account must have valid dailyLimit');
  }
  if (typeof userAccount.attemptsToday !== 'number') {
    throw new Error('User account must have valid attemptsToday');
  }
  if (!['free', 'premium', 'enterprise'].includes(userAccount.subscription)) {
    throw new Error('User account must have valid subscription');
  }

  const remainingAttempts = Math.max(0, userAccount.dailyLimit - userAccount.attemptsToday);

  return {
    type: 'auth_success',
    payload: {
      userId: userAccount.userId,
      email: userAccount.email,
      displayName: userAccount.displayName,
      dailyLimit: userAccount.dailyLimit,
      attemptsToday: userAccount.attemptsToday,
      remainingAttempts,
      subscription: userAccount.subscription,
      timestamp: getTimestamp(),
    },
  };
};

export const createReconnectResponse = (
  sessionRestored: boolean,
  sessionId: string,
  exerciseConfig?: ExerciseConfig,
): ReconnectResponsePayload => {
  if (typeof sessionRestored !== 'boolean') {
    throw new Error('sessionRestored must be a boolean');
  }
  if (typeof sessionId !== 'string') {
    throw new Error('sessionId must be a string');
  }

  const message = sessionRestored
    ? 'Session restored successfully'
    : 'No active session to restore';

  return {
    message,
    sessionRestored,
    exerciseConfig,
    sessionId,
  };
};
