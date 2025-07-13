import type { ExerciseType } from './session.type.ts';

export interface UserAccount {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  dailyLimit: number;
  attemptsToday: number;
  lastAttemptDate: string;
  totalSessions: number;
  subscription: UserSubscription;
  createdAt: string;
  updatedAt: string;
  status: UserStatus;
}

export type UserSubscription = 'free' | 'premium' | 'enterprise';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface DailyUsage {
  userId: string;
  date: string;
  attempts: number;
  lastAttempt: string;
  resetTime: string;
  dailyLimit: number;
}

export interface UserStats {
  userId: string;
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  averageSessionDuration: number;
  favoriteExerciseType: ExerciseType;
  lastSessionDate?: string;
  accountAgeDays: number;
}

export interface AuthResult {
  success: boolean;
  user?: UserAccount;
  error?: string;
  errorCode?: AuthErrorCode;
}

export type AuthErrorCode =
  | 'INVALID_EMAIL_DOMAIN'
  | 'ACCOUNT_SUSPENDED'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'USER_NOT_FOUND'
  | 'ACCOUNT_DELETED';

export interface CreateUserParams {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  dailyLimit?: number;
}

export interface UpdateUserParams {
  displayName?: string;
  photoURL?: string;
  dailyLimit?: number;
  subscription?: UserSubscription;
  status?: UserStatus;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  dailyLimit: number;
  remainingAttempts: number;
  nextResetTime: string;
}

export interface GmailValidationResult {
  isValid: boolean;
  error?: string;
  normalizedEmail?: string;
}
