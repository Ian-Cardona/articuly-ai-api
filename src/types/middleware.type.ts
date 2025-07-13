import type { AuthenticatedWebSocket } from './websocket.type.ts';
import type { UserAccount, AuthResult, GmailValidationResult } from './user.type.ts';

// Rate limiting types
export interface RateLimitState {
  messageTimestamps: WeakMap<AuthenticatedWebSocket, number[]>;
  audioDataSizes: WeakMap<AuthenticatedWebSocket, { timestamps: number[]; sizes: number[] }>;
}

export type AudioDataMessage = { type: 'audioData'; audioBase64: string };

// Authentication types
export interface AuthMessage {
  type: 'AUTH';
  idToken: string;
}

export interface AuthStateWebSocket extends AuthenticatedWebSocket {
  isAuthenticated?: boolean;
  userAccount?: UserAccount;
  gmailValidation?: GmailValidationResult;
}

// Enhanced authentication result
export interface EnhancedAuthResult extends AuthResult {
  /** WebSocket instance */
  ws: AuthStateWebSocket;
  /** Authentication timestamp */
  authTime: string;
  /** Session ID */
  sessionId?: string;
}

// Gmail validation middleware types
export interface GmailValidationMiddleware {
  /** Validate Gmail domain */
  validateGmailDomain: (email: string) => GmailValidationResult;
  /** Check if user can authenticate */
  canAuthenticate: (email: string) => boolean;
  /** Get validation error message */
  getValidationError: (email: string) => string;
}

// Logging types
export interface LogContext {
  timestamp: string;
  method?: string;
  path?: string;
  userId?: string;
  messageType?: string;
  duration?: number;
  error?: string;
  userEmail?: string;
  sessionId?: string;
  operation?: string;
}

// Error handling types
export interface ErrorWithCode extends Error {
  code?: string;
  statusCode?: number;
}

// Health check types
export interface HealthCheckResult {
  /** Overall health status */
  healthy: boolean;
  /** Service name */
  service: string;
  /** Response time in milliseconds */
  responseTime: number;
  /** Error message if unhealthy */
  error?: string;
  /** Additional details */
  details?: Record<string, unknown>;
}

// System health status
export interface SystemHealth {
  /** Overall system health */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Health checks results */
  checks: Record<string, HealthCheckResult>;
  /** System uptime */
  uptime: number;
  /** Timestamp */
  timestamp: string;
  /** Version */
  version: string;
}
