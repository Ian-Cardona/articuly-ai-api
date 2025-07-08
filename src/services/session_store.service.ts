import { sessionUtils } from '../utils/session.utils.ts';

import type { SessionStore } from '../types/session_store.type.ts';
import type { AudioSession, SessionInfo } from '../types/session.type.ts';

// Create initial store
export const createSessionStore = (): SessionStore => ({
  sessions: new Map(),
});

// Pure functional store operations
export const sessionStoreOps = {
  // Get session by user ID
  getSession: (store: SessionStore, userId: string): AudioSession | null => {
    return store.sessions.get(userId) ?? null;
  },

  // Set session for user ID (immutable update)
  setSession: (store: SessionStore, userId: string, session: AudioSession): SessionStore => {
    const newSessions = new Map(store.sessions);
    newSessions.set(userId, session);
    return { sessions: newSessions };
  },

  // Remove session for user ID (immutable update)
  removeSession: (store: SessionStore, userId: string): SessionStore => {
    const newSessions = new Map(store.sessions);
    newSessions.delete(userId);
    return { sessions: newSessions };
  },

  // Get all sessions
  getAllSessions: (store: SessionStore): readonly AudioSession[] => {
    return Array.from(store.sessions.values());
  },

  // Get active sessions only
  getActiveSessions: (store: SessionStore): readonly AudioSession[] => {
    return Array.from(store.sessions.values()).filter((session: AudioSession) => sessionUtils.isSessionActive(session));
  },

  // Get session count
  getSessionCount: (store: SessionStore): number => {
    return store.sessions.size;
  },

  // Get active session count
  getActiveSessionCount: (store: SessionStore): number => {
    return sessionStoreOps.getActiveSessions(store).length;
  },

  // Get session info for all sessions
  getAllSessionInfo: (store: SessionStore): readonly SessionInfo[] => {
    return Array.from(store.sessions.entries()).map(([userId, session]: [string, AudioSession]) => {
      const sessionInfo = sessionUtils.getSessionInfo(session);
      return {
        ...sessionInfo,
        userId, // Override with the key from the map
      };
    });
  },

  // Clean up all sessions (immutable update)
  cleanupAllSessions: (_store: SessionStore): SessionStore => {
    return { sessions: new Map() };
  },
};

// Session store manager (functional wrapper)
export const createSessionStoreManager = (initialStore: SessionStore = createSessionStore()) => {
  let currentStore: SessionStore = initialStore;

  return {
    // Get current store state
    getStore: (): SessionStore => currentStore,

    // Update store state
    updateStore: (newStore: SessionStore): void => {
      currentStore = newStore;
    },

    // Convenience methods that update the store
    getSession: (userId: string): AudioSession | null => {
      return sessionStoreOps.getSession(currentStore, userId);
    },

    setSession: (userId: string, session: AudioSession): void => {
      const newStore = sessionStoreOps.setSession(currentStore, userId, session);
      currentStore = newStore;
    },

    removeSession: (userId: string): boolean => {
      const session = sessionStoreOps.getSession(currentStore, userId);
      if (session) {
        const newStore = sessionStoreOps.removeSession(currentStore, userId);
        currentStore = newStore;
        return true;
      }
      return false;
    },

    getAllSessions: (): readonly AudioSession[] => {
      return sessionStoreOps.getAllSessions(currentStore);
    },

    getActiveSessions: (): readonly AudioSession[] => {
      return sessionStoreOps.getActiveSessions(currentStore);
    },

    getSessionCount: (): number => {
      return sessionStoreOps.getSessionCount(currentStore);
    },

    getActiveSessionCount: (): number => {
      return sessionStoreOps.getActiveSessionCount(currentStore);
    },

    getAllSessionInfo: (): readonly SessionInfo[] => {
      return sessionStoreOps.getAllSessionInfo(currentStore);
    },

    cleanupAllSessions: (): void => {
      const newStore = sessionStoreOps.cleanupAllSessions(currentStore);
      currentStore = newStore;
    },
  };
};

// Global session store manager instance
export const sessionStoreManager = createSessionStoreManager();
