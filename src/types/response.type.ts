import type { UserAccount, UserStats } from './user.type.ts';

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
    overallResult: unknown;
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

export interface AuthSuccessResponse extends BaseResponse {
  type: 'auth_success';
  payload: {
    userId: string;
    email: string;
    displayName: string;
    dailyLimit: number;
    attemptsToday: number;
    remainingAttempts: number;
    subscription: 'free' | 'premium' | 'enterprise';
    timestamp: string;
  };
}

export interface AuthErrorResponse extends BaseResponse {
  type: 'auth_error';
  payload: {
    error: string;
    errorCode: string;
    timestamp: string;
  };
}

export interface DailyLimitResponse extends BaseResponse {
  type: 'daily_limit_info';
  payload: {
    currentUsage: number;
    dailyLimit: number;
    remainingAttempts: number;
    nextResetTime: string;
    subscription: 'free' | 'premium' | 'enterprise';
    timestamp: string;
  };
}

export interface DailyLimitExceededResponse extends BaseResponse {
  type: 'daily_limit_exceeded';
  payload: {
    error: string;
    currentUsage: number;
    dailyLimit: number;
    nextResetTime: string;
    subscription: 'free' | 'premium' | 'enterprise';
    upgradeMessage?: string;
    timestamp: string;
  };
}

export interface UserAccountResponse extends BaseResponse {
  type: 'user_account_info';
  payload: {
    user: UserAccount;
    stats: UserStats;
    timestamp: string;
  };
}

export interface SessionRecoveryResponse extends BaseResponse {
  type: 'session_recovery';
  payload: {
    sessionRestored: boolean;
    sessionId?: string;
    exerciseConfig?: {
      exerciseType: string;
      expectedText: string;
      expectedWords: string[];
    };
    timestamp: string;
  };
}

export interface HealthCheckResponse extends BaseResponse {
  type: 'health_check';
  payload: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, {
      healthy: boolean;
      responseTime: number;
      error?: string;
    }>;
    uptime: number;
    timestamp: string;
  };
}

export type WebSocketResponse =
  | StreamReadyResponse
  | StreamStoppedResponse
  | WordFeedbackResponse
  | PronunciationFeedbackResponse
  | SuccessResponse
  | AuthSuccessResponse
  | AuthErrorResponse
  | DailyLimitResponse
  | DailyLimitExceededResponse
  | UserAccountResponse
  | SessionRecoveryResponse
  | HealthCheckResponse;
