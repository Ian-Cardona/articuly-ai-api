// Response types for server-to-client messages
export interface BaseResponse {
  type: string;
  payload: Record<string, unknown>;
}

// Stream ready response
export interface StreamReadyResponse extends BaseResponse {
  type: 'STREAM_READY';
  payload: {
    message: string;
    expectedText: string;
    exerciseType: 'tongueTwister';
    timestamp: string;
  };
}

// Stream stopped response
export interface StreamStoppedResponse extends BaseResponse {
  type: 'STREAM_STOPPED';
  payload: {
    message: string;
    timestamp: string;
  };
}

// Word feedback response (real-time)
export interface WordFeedbackResponse extends BaseResponse {
  type: 'WORD_FEEDBACK_LIVE';
  payload: {
    word: string;
    index: number;
    status: 'matched' | 'skipped' | 'misrecognized';
    timestamp: string;
  };
}

// Pronunciation feedback response (final assessment)
export interface PronunciationFeedbackResponse extends BaseResponse {
  type: 'PRONUNCIATION_FEEDBACK';
  payload: {
    overallResult: unknown; // Raw JSON from Azure
    timestamp: string;
  };
}

// Success response
export interface SuccessResponse extends BaseResponse {
  type: 'SUCCESS';
  payload: {
    message: string;
    timestamp: string;
  };
}

// Union type for all responses
export type WebSocketResponse =
  | StreamReadyResponse
  | StreamStoppedResponse
  | WordFeedbackResponse
  | PronunciationFeedbackResponse
  | SuccessResponse;

// Response factory functions
export const createStreamReadyResponse = (
  expectedText: string,
  exerciseType: 'tongueTwister' = 'tongueTwister',
): StreamReadyResponse => ({
  type: 'STREAM_READY',
  payload: {
    message: 'Ready to receive audio chunks.',
    expectedText,
    exerciseType,
    timestamp: new Date().toISOString(),
  },
});

export const createStreamStoppedResponse = (): StreamStoppedResponse => ({
  type: 'STREAM_STOPPED',
  payload: {
    message: 'Audio stream stopped successfully.',
    timestamp: new Date().toISOString(),
  },
});

export const createWordFeedbackResponse = (
  word: string,
  index: number,
  status: 'matched' | 'skipped' | 'misrecognized',
): WordFeedbackResponse => ({
  type: 'WORD_FEEDBACK_LIVE',
  payload: {
    word,
    index,
    status,
    timestamp: new Date().toISOString(),
  },
});

export const createPronunciationFeedbackResponse = (overallResult: unknown): PronunciationFeedbackResponse => ({
  type: 'PRONUNCIATION_FEEDBACK',
  payload: {
    overallResult,
    timestamp: new Date().toISOString(),
  },
});

export const createSuccessResponse = (message: string): SuccessResponse => ({
  type: 'SUCCESS',
  payload: {
    message,
    timestamp: new Date().toISOString(),
  },
});
