// ESM-compatible Jest mocks for firebase-admin and firebase-admin/firestore
// Removed per-file jest.mock() for firebase-admin and firebase-admin/firestore; now globally mocked in setup.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { sessionStoreManager, sessionStoreOps, createSessionStore } from '../../src/services/session_store.service.ts';
import type { AudioSession } from '../../src/types/session.type.ts';

describe('SessionStoreService', () => {
  beforeEach(() => {
    // Reset the global session store manager before each test
    sessionStoreManager.cleanupAllSessions();
  });

  describe('sessionStoreOps', () => {
    let store: ReturnType<typeof createSessionStore>;

    beforeEach(() => {
      store = createSessionStore();
    });

    describe('getSession', () => {
      it('should return null for non-existent session', () => {
        const session = sessionStoreOps.getSession(store, 'non-existent');
        expect(session).toBeNull();
      });

      it('should return session for existing user', () => {
        const mockSession: AudioSession = {
          userId: 'test-user',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        const updatedStore = sessionStoreOps.setSession(store, 'test-user', mockSession);
        const retrievedSession = sessionStoreOps.getSession(updatedStore, 'test-user');

        expect(retrievedSession).toEqual(mockSession);
      });
    });

    describe('setSession', () => {
      it('should add new session to store', () => {
        const mockSession: AudioSession = {
          userId: 'test-user',
          state: {
            isActive: true,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: new Date(),
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        const updatedStore = sessionStoreOps.setSession(store, 'test-user', mockSession);
        const retrievedSession = sessionStoreOps.getSession(updatedStore, 'test-user');

        expect(retrievedSession).toEqual(mockSession);
        expect(updatedStore.sessions.size).toBe(1);
      });

      it('should update existing session', () => {
        const initialSession: AudioSession = {
          userId: 'test-user',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        const updatedSession: AudioSession = {
          ...initialSession,
          state: {
            ...initialSession.state,
            isActive: true,
            startTime: new Date(),
          },
        };

        let updatedStore = sessionStoreOps.setSession(store, 'test-user', initialSession);
        updatedStore = sessionStoreOps.setSession(updatedStore, 'test-user', updatedSession);

        const retrievedSession = sessionStoreOps.getSession(updatedStore, 'test-user');
        expect(retrievedSession).toEqual(updatedSession);
        expect(retrievedSession?.state.isActive).toBe(true);
      });
    });

    describe('removeSession', () => {
      it('should remove existing session', () => {
        const mockSession: AudioSession = {
          userId: 'test-user',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        let updatedStore = sessionStoreOps.setSession(store, 'test-user', mockSession);
        expect(updatedStore.sessions.size).toBe(1);

        updatedStore = sessionStoreOps.removeSession(updatedStore, 'test-user');
        expect(updatedStore.sessions.size).toBe(0);

        const retrievedSession = sessionStoreOps.getSession(updatedStore, 'test-user');
        expect(retrievedSession).toBeNull();
      });

      it('should handle removing non-existent session', () => {
        const updatedStore = sessionStoreOps.removeSession(store, 'non-existent');
        expect(updatedStore.sessions.size).toBe(0);
      });
    });

    describe('getAllSessions', () => {
      it('should return all sessions', () => {
        const session1: AudioSession = {
          userId: 'user1',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        const session2: AudioSession = {
          userId: 'user2',
          state: {
            isActive: true,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: new Date(),
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        let updatedStore = sessionStoreOps.setSession(store, 'user1', session1);
        updatedStore = sessionStoreOps.setSession(updatedStore, 'user2', session2);

        const allSessions = sessionStoreOps.getAllSessions(updatedStore);
        expect(allSessions).toHaveLength(2);
        expect(allSessions).toContain(session1);
        expect(allSessions).toContain(session2);
      });

      it('should return empty array for empty store', () => {
        const allSessions = sessionStoreOps.getAllSessions(store);
        expect(allSessions).toHaveLength(0);
      });
    });

    describe('getActiveSessions', () => {
      it('should return only active sessions', () => {
        const activeSession: AudioSession = {
          userId: 'active-user',
          state: {
            isActive: true,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: new Date(),
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        const inactiveSession: AudioSession = {
          userId: 'inactive-user',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        let updatedStore = sessionStoreOps.setSession(store, 'active-user', activeSession);
        updatedStore = sessionStoreOps.setSession(updatedStore, 'inactive-user', inactiveSession);

        const activeSessions = sessionStoreOps.getActiveSessions(updatedStore);
        expect(activeSessions).toHaveLength(1);
        expect(activeSessions[0]).toEqual(activeSession);
      });
    });

    describe('getSessionCount', () => {
      it('should return correct session count', () => {
        expect(sessionStoreOps.getSessionCount(store)).toBe(0);

        const session1: AudioSession = {
          userId: 'user1',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        let updatedStore = sessionStoreOps.setSession(store, 'user1', session1);
        expect(sessionStoreOps.getSessionCount(updatedStore)).toBe(1);

        const session2: AudioSession = {
          userId: 'user2',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        updatedStore = sessionStoreOps.setSession(updatedStore, 'user2', session2);
        expect(sessionStoreOps.getSessionCount(updatedStore)).toBe(2);
      });
    });

    describe('getActiveSessionCount', () => {
      it('should return correct active session count', () => {
        expect(sessionStoreOps.getActiveSessionCount(store)).toBe(0);

        const activeSession: AudioSession = {
          userId: 'active-user',
          state: {
            isActive: true,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: new Date(),
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        let updatedStore = sessionStoreOps.setSession(store, 'active-user', activeSession);
        expect(sessionStoreOps.getActiveSessionCount(updatedStore)).toBe(1);

        const inactiveSession: AudioSession = {
          userId: 'inactive-user',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        updatedStore = sessionStoreOps.setSession(updatedStore, 'inactive-user', inactiveSession);
        expect(sessionStoreOps.getActiveSessionCount(updatedStore)).toBe(1);
      });
    });

    describe('cleanupAllSessions', () => {
      it('should clear all sessions', () => {
        const session1: AudioSession = {
          userId: 'user1',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        const session2: AudioSession = {
          userId: 'user2',
          state: {
            isActive: true,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: new Date(),
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        let updatedStore = sessionStoreOps.setSession(store, 'user1', session1);
        updatedStore = sessionStoreOps.setSession(updatedStore, 'user2', session2);
        expect(updatedStore.sessions.size).toBe(2);

        const cleanedStore = sessionStoreOps.cleanupAllSessions(updatedStore);
        expect(cleanedStore.sessions.size).toBe(0);
        expect(sessionStoreOps.getSessionCount(cleanedStore)).toBe(0);
      });
    });
  });

  describe('sessionStoreManager', () => {
    describe('getSession', () => {
      it('should return null for non-existent session', () => {
        const session = sessionStoreManager.getSession('non-existent');
        expect(session).toBeNull();
      });

      it('should return session for existing user', () => {
        const mockSession: AudioSession = {
          userId: 'test-user',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        sessionStoreManager.setSession('test-user', mockSession);
        const retrievedSession = sessionStoreManager.getSession('test-user');

        expect(retrievedSession).toEqual(mockSession);
      });
    });

    describe('setSession', () => {
      it('should add new session', () => {
        const mockSession: AudioSession = {
          userId: 'test-user',
          state: {
            isActive: true,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: new Date(),
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        sessionStoreManager.setSession('test-user', mockSession);
        const retrievedSession = sessionStoreManager.getSession('test-user');

        expect(retrievedSession).toEqual(mockSession);
        expect(sessionStoreManager.getSessionCount()).toBe(1);
      });
    });

    describe('removeSession', () => {
      it('should remove existing session', () => {
        const mockSession: AudioSession = {
          userId: 'test-user',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        sessionStoreManager.setSession('test-user', mockSession);
        expect(sessionStoreManager.getSessionCount()).toBe(1);

        const removed = sessionStoreManager.removeSession('test-user');
        expect(removed).toBe(true);
        expect(sessionStoreManager.getSessionCount()).toBe(0);

        const retrievedSession = sessionStoreManager.getSession('test-user');
        expect(retrievedSession).toBeNull();
      });

      it('should return false for non-existent session', () => {
        const removed = sessionStoreManager.removeSession('non-existent');
        expect(removed).toBe(false);
      });
    });

    describe('getAllSessions', () => {
      it('should return all sessions', () => {
        const session1: AudioSession = {
          userId: 'user1',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        const session2: AudioSession = {
          userId: 'user2',
          state: {
            isActive: true,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: new Date(),
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        sessionStoreManager.setSession('user1', session1);
        sessionStoreManager.setSession('user2', session2);

        const allSessions = sessionStoreManager.getAllSessions();
        expect(allSessions).toHaveLength(2);
        expect(allSessions).toContain(session1);
        expect(allSessions).toContain(session2);
      });
    });

    describe('getActiveSessions', () => {
      it('should return only active sessions', () => {
        const activeSession: AudioSession = {
          userId: 'active-user',
          state: {
            isActive: true,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: new Date(),
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        const inactiveSession: AudioSession = {
          userId: 'inactive-user',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        sessionStoreManager.setSession('active-user', activeSession);
        sessionStoreManager.setSession('inactive-user', inactiveSession);

        const activeSessions = sessionStoreManager.getActiveSessions();
        expect(activeSessions).toHaveLength(1);
        expect(activeSessions[0]).toEqual(activeSession);
      });
    });

    describe('getSessionCount', () => {
      it('should return correct session count', () => {
        expect(sessionStoreManager.getSessionCount()).toBe(0);

        const session: AudioSession = {
          userId: 'test-user',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        sessionStoreManager.setSession('test-user', session);
        expect(sessionStoreManager.getSessionCount()).toBe(1);
      });
    });

    describe('getActiveSessionCount', () => {
      it('should return correct active session count', () => {
        expect(sessionStoreManager.getActiveSessionCount()).toBe(0);

        const activeSession: AudioSession = {
          userId: 'active-user',
          state: {
            isActive: true,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: new Date(),
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        sessionStoreManager.setSession('active-user', activeSession);
        expect(sessionStoreManager.getActiveSessionCount()).toBe(1);
      });
    });

    describe('cleanupAllSessions', () => {
      it('should clear all sessions', () => {
        const session1: AudioSession = {
          userId: 'user1',
          state: {
            isActive: false,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: null,
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        const session2: AudioSession = {
          userId: 'user2',
          state: {
            isActive: true,
            exerciseConfig: null,
            nextWordToConfirmIndex: 0,
            startTime: new Date(),
            endTime: null,
            attempts: [],
            currentAttemptIndex: -1,
          },
          azureRecognizer: null,
          azurePushStream: null,
        };

        sessionStoreManager.setSession('user1', session1);
        sessionStoreManager.setSession('user2', session2);
        expect(sessionStoreManager.getSessionCount()).toBe(2);

        sessionStoreManager.cleanupAllSessions();
        expect(sessionStoreManager.getSessionCount()).toBe(0);
        expect(sessionStoreManager.getActiveSessionCount()).toBe(0);
      });
    });
  });
}); 