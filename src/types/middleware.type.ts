import type { AuthenticatedWebSocket } from './websocket.type.ts';

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
}

// Error handling types
export interface ErrorWithCode extends Error {
  code?: string;
  statusCode?: number;
}
