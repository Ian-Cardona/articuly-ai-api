// Response types for server-to-client messages
export interface BaseResponse {
  type: string;
  payload: Record<string, unknown>;
}

export interface StreamReadyResponse extends BaseResponse {
  type: 'STREAM_READY';
  payload: {
    message: string;
    expectedText: string;
    exerciseType: 'tongueTwister';
    timestamp: string;
  };
}

export interface StreamStoppedResponse extends BaseResponse {
  type: 'STREAM_STOPPED';
  payload: {
    message: string;
    timestamp: string;
  };
}

export interface WordFeedbackResponse extends BaseResponse {
  type: 'WORD_FEEDBACK_LIVE';
  payload: {
    word: string;
    index: number;
    status: 'matched' | 'skipped' | 'misrecognized';
    timestamp: string;
  };
}

export interface PronunciationFeedbackResponse extends BaseResponse {
  type: 'PRONUNCIATION_FEEDBACK';
  payload: {
    overallResult: unknown; // Raw JSON from Azure
    timestamp: string;
  };
}

export interface SuccessResponse extends BaseResponse {
  type: 'SUCCESS';
  payload: {
    message: string;
    timestamp: string;
  };
}

export type WebSocketResponse =
  | StreamReadyResponse
  | StreamStoppedResponse
  | WordFeedbackResponse
  | PronunciationFeedbackResponse
  | SuccessResponse;
