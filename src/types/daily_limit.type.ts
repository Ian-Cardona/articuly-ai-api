/**
 * Daily limit configuration
 */
export interface DailyLimitConfig {
  /** Default daily limit for free users */
  defaultFreeLimit: number;
  /** Daily limit for premium users */
  premiumLimit: number;
  /** Daily limit for enterprise users */
  enterpriseLimit: number;
  /** Reset time (hour in UTC, 0-23) */
  resetTimeHour: number;
  /** Reset timezone (default: UTC) */
  resetTimezone: string;
  /** Whether to allow carryover of unused attempts */
  allowCarryover: boolean;
  /** Maximum carryover attempts */
  maxCarryover: number;
}

/**
 * Daily limit for a specific user
 */
export interface UserDailyLimit {
  /** User ID */
  userId: string;
  /** Daily limit for this user */
  limit: number;
  /** Current usage today */
  usage: number;
  /** Remaining attempts */
  remaining: number;
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Last reset time */
  lastReset: string;
  /** Next reset time */
  nextReset: string;
  /** User's subscription tier */
  subscription: 'free' | 'premium' | 'enterprise';
}

/**
 * Daily limit check result
 */
export interface DailyLimitCheckResult {
  /** Can user start a new session */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
  /** Current usage */
  currentUsage: number;
  /** Daily limit */
  dailyLimit: number;
  /** Remaining attempts */
  remainingAttempts: number;
  /** Next reset time */
  nextResetTime: string;
  /** User's subscription tier */
  subscription: 'free' | 'premium' | 'enterprise';
  /** Whether this is a carryover attempt */
  isCarryover: boolean;
  /** Carryover attempts used */
  carryoverUsed: number;
}

/**
 * Daily limit update parameters
 */
export interface DailyLimitUpdateParams {
  /** User ID */
  userId: string;
  /** New daily limit */
  newLimit?: number;
  /** New subscription tier */
  newSubscription?: 'free' | 'premium' | 'enterprise';
  /** Force reset usage */
  resetUsage?: boolean;
  /** Update timestamp */
  updateTime: string;
}

/**
 * Daily limit reset parameters
 */
export interface DailyLimitResetParams {
  /** User ID */
  userId: string;
  /** Reset date (YYYY-MM-DD) */
  resetDate: string;
  /** Reset timestamp */
  resetTime: string;
  /** Previous usage */
  previousUsage: number;
  /** New usage */
  newUsage: number;
  /** Carryover attempts */
  carryoverAttempts: number;
}

/**
 * Daily limit violation
 */
export interface DailyLimitViolation {
  /** User ID */
  userId: string;
  /** Violation timestamp */
  timestamp: string;
  /** Violation type */
  type: 'EXCEEDED_LIMIT' | 'INVALID_RESET' | 'CARRYOVER_VIOLATION';
  /** Violation details */
  details: string;
  /** Current usage */
  currentUsage: number;
  /** Daily limit */
  dailyLimit: number;
  /** User's subscription */
  subscription: 'free' | 'premium' | 'enterprise';
}

/**
 * Daily limit analytics
 */
export interface DailyLimitAnalytics {
  /** User ID */
  userId: string;
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Total attempts used */
  totalAttempts: number;
  /** Successful attempts */
  successfulAttempts: number;
  /** Failed attempts */
  failedAttempts: number;
  /** Average session duration (minutes) */
  averageSessionDuration: number;
  /** Peak usage hour */
  peakUsageHour: number;
  /** Usage pattern (hourly breakdown) */
  hourlyUsage: Record<string, number>;
  /** Subscription tier */
  subscription: 'free' | 'premium' | 'enterprise';
}

/**
 * Daily limit enforcement result
 */
export interface DailyLimitEnforcementResult {
  /** Success status */
  success: boolean;
  /** Enforcement action taken */
  action: 'ALLOWED' | 'DENIED' | 'WARNED' | 'RESET';
  /** Result details */
  details: string;
  /** Updated limit info */
  limitInfo?: UserDailyLimit;
  /** Error if failed */
  error?: string;
  /** Error code for specific handling */
  errorCode?: DailyLimitErrorCode;
}

/**
 * Daily limit error codes
 */
export type DailyLimitErrorCode =
  | 'LIMIT_EXCEEDED'
  | 'INVALID_USER'
  | 'INVALID_DATE'
  | 'RESET_FAILED'
  | 'UPDATE_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR';

/**
 * Daily limit configuration constants
 */
export const DEFAULT_DAILY_LIMITS = {
  FREE: 20,
  PREMIUM: 100,
  ENTERPRISE: 1000,
} as const;

/**
 * Daily limit reset times
 */
export const DAILY_LIMIT_RESET_TIMES = {
  UTC_MIDNIGHT: 0,
  UTC_6AM: 6,
  UTC_NOON: 12,
  UTC_6PM: 18,
} as const;

/**
 * Daily limit timezone options
 */
export const DAILY_LIMIT_TIMEZONES = {
  UTC: 'UTC',
  EST: 'America/New_York',
  PST: 'America/Los_Angeles',
  GMT: 'Europe/London',
  JST: 'Asia/Tokyo',
} as const;
