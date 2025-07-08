import type { AudioSession, SessionInfo } from './session.type.ts';

export interface SessionStore {
  readonly sessions: ReadonlyMap<string, AudioSession>;
}

export interface SessionStoreOperations {
  readonly getSession: (userId: string) => AudioSession | null;
  readonly setSession: (userId: string, session: AudioSession) => SessionStore;
  readonly removeSession: (userId: string) => SessionStore;
  readonly getAllSessions: () => readonly AudioSession[];
  readonly getActiveSessions: () => readonly AudioSession[];
  readonly getSessionCount: () => number;
  readonly getActiveSessionCount: () => number;
  readonly getAllSessionInfo: () => readonly SessionInfo[];
  readonly cleanupAllSessions: () => SessionStore;
}
