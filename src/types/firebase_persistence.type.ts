import type { AudioSession } from './session.type.ts';
import type { UserAccount, DailyUsage, UserStats } from './user.type.ts';

/**
 * Firebase Firestore document structure for sessions
 */
export interface FirestoreSession {
  /** Document ID (session ID) */
  id: string;
  /** User ID */
  userId: string;
  /** Session data as JSON string */
  sessionData: string;
  /** Is session currently active */
  isActive: boolean;
  /** Session start time */
  startTime: string;
  /** Session end time */
  endTime?: string;
  /** Session duration in milliseconds */
  duration?: number;
  /** Exercise type */
  exerciseType: string;
  /** Expected text for the exercise */
  expectedText: string;
  /** Session result */
  result?: 'success' | 'fail' | 'timeout' | 'incomplete';
  /** Session score */
  score?: number;
  /** TTL for automatic deletion */
  ttl: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Firebase Firestore document structure for users
 */
export interface FirestoreUser {
  /** Document ID (user ID) */
  id: string;
  /** User account data */
  userData: UserAccount;
  /** TTL for automatic deletion (if needed) */
  ttl?: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Firebase Firestore document structure for daily usage
 */
export interface FirestoreDailyUsage {
  /** Document ID (userId_date) */
  id: string;
  /** User ID */
  userId: string;
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Usage data */
  usageData: DailyUsage;
  /** TTL for automatic deletion (30 days) */
  ttl: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Firebase Firestore document structure for user stats
 */
export interface FirestoreUserStats {
  /** Document ID (user ID) */
  id: string;
  /** User ID */
  userId: string;
  /** User statistics data */
  statsData: UserStats;
  /** Last calculation timestamp */
  lastCalculated: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Session persistence result
 */
export interface SessionPersistenceResult {
  /** Success status */
  success: boolean;
  /** Session data if successful */
  session?: FirestoreSession;
  /** Error message if failed */
  error?: string;
  /** Error code for specific handling */
  errorCode?: PersistenceErrorCode;
}

/**
 * User persistence result
 */
export interface UserPersistenceResult {
  /** Success status */
  success: boolean;
  /** User data if successful */
  user?: FirestoreUser;
  /** Error message if failed */
  error?: string;
  /** Error code for specific handling */
  errorCode?: PersistenceErrorCode;
}

/**
 * Usage persistence result
 */
export interface UsagePersistenceResult {
  /** Success status */
  success: boolean;
  /** Usage data if successful */
  usage?: FirestoreDailyUsage;
  /** Error message if failed */
  error?: string;
  /** Error code for specific handling */
  errorCode?: PersistenceErrorCode;
}

/**
 * Persistence error codes
 */
export type PersistenceErrorCode =
  | 'DOCUMENT_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'INVALID_DATA'
  | 'TTL_EXPIRED'
  | 'CONCURRENT_MODIFICATION';

/**
 * Session backup parameters
 */
export interface SessionBackupParams {
  /** Session to backup */
  session: AudioSession;
  /** User ID */
  userId: string;
  /** Exercise type */
  exerciseType: string;
  /** Expected text */
  expectedText: string;
  /** TTL in seconds */
  ttl?: number;
}

/**
 * Session recovery parameters
 */
export interface SessionRecoveryParams {
  /** User ID */
  userId: string;
  /** Session ID */
  sessionId?: string;
  /** Recovery timestamp */
  recoveryTime: string;
}

/**
 * Session cleanup parameters
 */
export interface SessionCleanupParams {
  /** User ID */
  userId: string;
  /** Cleanup timestamp */
  cleanupTime: string;
  /** Maximum age in seconds */
  maxAge?: number;
}

/**
 * Firebase collection names
 */
export const FIREBASE_COLLECTIONS = {
  USERS: 'users',
  SESSIONS: 'sessions',
  DAILY_USAGE: 'dailyUsage',
  USER_STATS: 'userStats',
} as const;

/**
 * Firebase collection name type
 */
export type FirebaseCollection = typeof FIREBASE_COLLECTIONS[keyof typeof FIREBASE_COLLECTIONS];

/**
 * Firebase operation types
 */
export type FirebaseOperation = 'create' | 'read' | 'update' | 'delete' | 'query';

/**
 * Firebase operation result
 */
export interface FirebaseOperationResult<T> {
  /** Success status */
  success: boolean;
  /** Data if successful */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Operation type */
  operation: FirebaseOperation;
  /** Collection name */
  collection: FirebaseCollection;
  /** Document ID */
  documentId?: string;
  /** Timestamp */
  timestamp: string;
}
