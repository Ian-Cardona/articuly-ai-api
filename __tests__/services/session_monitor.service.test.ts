import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// ESM-compatible Jest mocks for firebase-admin and firebase-admin/firestore
// Removed per-file jest.mock() for firebase-admin and firebase-admin/firestore; now globally mocked in setup.ts

import { 
  getSessionStats, 
  getUserSessionInfo, 
  hasUserActiveSession, 
  getOrCreateUserSession, 
  removeUserSession, 
  cleanupAllSessions, 
  getActiveSessionsWithDuration,
  logSessionStats 
} from '../../src/services/session_monitor.service.ts';
import { sessionStoreManager } from '../../src/services/session_store.service.ts';
import type { AudioSession } from '../../src/types/session.type.ts';
import { ExerciseType } from '../../src/types/session.type.ts';

// Mock console.log to avoid output during tests
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = vi.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  sessionStoreManager.cleanupAllSessions();
});

describe('SessionMonitorService', () => {
  beforeEach(() => {
    sessionStoreManager.cleanupAllSessions();
  });

  const createMockSession = (userId: string, isActive: boolean = false): AudioSession => ({
    userId,
    state: {
      isActive,
      exerciseConfig: isActive ? {
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
        expectedWords: ['Test', 'exercise'],
      } : null,
      nextWordToConfirmIndex: 0,
      startTime: isActive ? new Date() : null,
      endTime: null,
      attempts: [],
      currentAttemptIndex: -1,
    },
    azureRecognizer: null,
    azurePushStream: null,
  });

  describe('getSessionStats', () => {
    it('should return correct stats for empty store', () => {
      const stats = getSessionStats();
      
      expect(stats.totalSessions).toBe(0);
      expect(stats.activeSessions).toBe(0);
      expect(stats.allSessions).toHaveLength(0);
    });

    it('should return correct stats for sessions', () => {
      const session1 = createMockSession('user1', false);
      const session2 = createMockSession('user2', true);
      const session3 = createMockSession('user3', true);

      sessionStoreManager.setSession('user1', session1);
      sessionStoreManager.setSession('user2', session2);
      sessionStoreManager.setSession('user3', session3);

      const stats = getSessionStats();
      
      expect(stats.totalSessions).toBe(3);
      expect(stats.activeSessions).toBe(2);
      expect(stats.allSessions).toHaveLength(3);
    });

    it('should include session info in stats', () => {
      const session = createMockSession('user1', true);
      sessionStoreManager.setSession('user1', session);

      const stats = getSessionStats();
      
      expect(stats.allSessions).toHaveLength(1);
      expect(stats.allSessions[0].userId).toBe('user1');
      expect(stats.allSessions[0].isActive).toBe(true);
      expect(stats.allSessions[0].exerciseConfig).toBeDefined();
    });
  });

  describe('getUserSessionInfo', () => {
    it('should return null for non-existent user', () => {
      const sessionInfo = getUserSessionInfo('non-existent');
      expect(sessionInfo).toBeNull();
    });

    it('should return session for existing user', () => {
      const session = createMockSession('user1', true);
      sessionStoreManager.setSession('user1', session);

      const sessionInfo = getUserSessionInfo('user1');
      expect(sessionInfo).toEqual(session);
    });
  });

  describe('hasUserActiveSession', () => {
    it('should return false for non-existent user', () => {
      const hasActive = hasUserActiveSession('non-existent');
      expect(hasActive).toBe(false);
    });

    it('should return false for user with inactive session', () => {
      const session = createMockSession('user1', false);
      sessionStoreManager.setSession('user1', session);

      const hasActive = hasUserActiveSession('user1');
      expect(hasActive).toBe(false);
    });

    it('should return true for user with active session', () => {
      const session = createMockSession('user1', true);
      sessionStoreManager.setSession('user1', session);

      const hasActive = hasUserActiveSession('user1');
      expect(hasActive).toBe(true);
    });
  });

  describe('getOrCreateUserSession', () => {
    it('should return existing session', () => {
      const session = createMockSession('user1', false);
      sessionStoreManager.setSession('user1', session);

      const retrievedSession = getOrCreateUserSession('user1');
      expect(retrievedSession).toEqual(session);
    });

    it('should return null for non-existent user', () => {
      const retrievedSession = getOrCreateUserSession('non-existent');
      expect(retrievedSession).toBeNull();
    });
  });

  describe('removeUserSession', () => {
    it('should remove existing session', () => {
      const session = createMockSession('user1', false);
      sessionStoreManager.setSession('user1', session);

      expect(sessionStoreManager.getSessionCount()).toBe(1);

      const removed = removeUserSession('user1');
      expect(removed).toBe(true);
      expect(sessionStoreManager.getSessionCount()).toBe(0);
    });

    it('should return false for non-existent user', () => {
      const removed = removeUserSession('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('cleanupAllSessions', () => {
    it('should clear all sessions', () => {
      const session1 = createMockSession('user1', false);
      const session2 = createMockSession('user2', true);
      const session3 = createMockSession('user3', true);

      sessionStoreManager.setSession('user1', session1);
      sessionStoreManager.setSession('user2', session2);
      sessionStoreManager.setSession('user3', session3);

      expect(sessionStoreManager.getSessionCount()).toBe(3);

      cleanupAllSessions();

      expect(sessionStoreManager.getSessionCount()).toBe(0);
      expect(sessionStoreManager.getActiveSessionCount()).toBe(0);
    });
  });

  describe('getActiveSessionsWithDuration', () => {
    it('should return empty array for no active sessions', () => {
      const session = createMockSession('user1', false);
      sessionStoreManager.setSession('user1', session);

      const activeSessions = getActiveSessionsWithDuration();
      expect(activeSessions).toHaveLength(0);
    });

    it('should return active sessions with duration', () => {
      const session = createMockSession('user1', true);
      sessionStoreManager.setSession('user1', session);

      const activeSessions = getActiveSessionsWithDuration();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].userId).toBe('user1');
      expect(activeSessions[0].isActive).toBe(true);
      expect(activeSessions[0].durationInSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should calculate duration correctly', () => {
      const startTime = new Date();
      startTime.setSeconds(startTime.getSeconds() - 30); // 30 seconds ago

      const session: AudioSession = {
        userId: 'user1',
        state: {
          isActive: true,
          exerciseConfig: {
            exerciseType: ExerciseType.TongueTwister,
            expectedText: 'Test exercise',
            expectedWords: ['Test', 'exercise'],
          },
          nextWordToConfirmIndex: 0,
          startTime,
          endTime: null,
          attempts: [],
          currentAttemptIndex: -1,
        },
        azureRecognizer: null,
        azurePushStream: null,
      };

      sessionStoreManager.setSession('user1', session);

      const activeSessions = getActiveSessionsWithDuration();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].durationInSeconds).toBeGreaterThanOrEqual(25); // Should be around 30 seconds
      expect(activeSessions[0].durationInSeconds).toBeLessThanOrEqual(35);
    });
  });

  describe('logSessionStats', () => {
    it('should log stats for empty store', () => {
      logSessionStats();
      
      expect(console.log).toHaveBeenCalledWith('=== Session Statistics ===');
      expect(console.log).toHaveBeenCalledWith('Total Sessions: 0');
      expect(console.log).toHaveBeenCalledWith('Active Sessions: 0');
      expect(console.log).toHaveBeenCalledWith('========================\n');
    });

    it('should log stats for sessions', () => {
      const session1 = createMockSession('user1', false);
      const session2 = createMockSession('user2', true);
      const session3 = createMockSession('user3', true);

      sessionStoreManager.setSession('user1', session1);
      sessionStoreManager.setSession('user2', session2);
      sessionStoreManager.setSession('user3', session3);

      logSessionStats();
      
      expect(console.log).toHaveBeenCalledWith('=== Session Statistics ===');
      expect(console.log).toHaveBeenCalledWith('Total Sessions: 3');
      expect(console.log).toHaveBeenCalledWith('Active Sessions: 2');
      expect(console.log).toHaveBeenCalledWith('\nActive Sessions:');
      expect(console.log).toHaveBeenCalledWith('========================\n');
    });

    it('should log active session details', () => {
      const session = createMockSession('user1', true);
      sessionStoreManager.setSession('user1', session);

      logSessionStats();
      
      expect(console.log).toHaveBeenCalledWith('=== Session Statistics ===');
      expect(console.log).toHaveBeenCalledWith('Total Sessions: 1');
      expect(console.log).toHaveBeenCalledWith('Active Sessions: 1');
      expect(console.log).toHaveBeenCalledWith('\nActive Sessions:');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('User: user1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Exercise: "Test exercise"'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Next Word Index: 0'));
      expect(console.log).toHaveBeenCalledWith('========================\n');
    });
  });
}); 