// Types and interfaces for session monitor utilities
import type { SessionInfo } from './session.type.ts';

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  allSessions: readonly SessionInfo[];
}

export interface SessionInfoWithDuration extends SessionInfo {
  durationInSeconds: number;
}
