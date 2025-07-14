import { describe, it, expect } from '@jest/globals';
// ESM-compatible Jest mocks for firebase-admin and firebase-admin/firestore
// Removed per-file jest.mock() for firebase-admin and firebase-admin/firestore; now globally mocked in setup.ts

import { sessionUtils } from '../../src/utils/session.utils.ts';
import { ExerciseType } from '../../src/types/session.type.ts';
import type { CreateSessionParams, StartSessionParams } from '../../src/types/session.type.ts';

describe('SessionUtils', () => {
  describe('parseExpectedWords', () => {
    it('should parse words correctly', () => {
      const text = 'How much wood would a woodchuck chuck';
      const words = sessionUtils.parseExpectedWords(text);
      
      expect(words).toEqual(['how', 'much', 'wood', 'would', 'a', 'woodchuck', 'chuck']);
    });

    it('should handle empty string', () => {
      const words = sessionUtils.parseExpectedWords('');
      expect(words).toEqual([]);
    });

    it('should handle single word', () => {
      const words = sessionUtils.parseExpectedWords('Hello');
      expect(words).toEqual(['hello']);
    });

    it('should handle multiple spaces', () => {
      const words = sessionUtils.parseExpectedWords('  Hello   World  ');
      expect(words).toEqual(['hello', 'world']);
    });

    it('should filter out empty words', () => {
      const words = sessionUtils.parseExpectedWords('Hello   World');
      expect(words).toEqual(['hello', 'world']);
    });
  });

  describe('createExerciseConfig', () => {
    it('should create exercise config correctly', () => {
      const config = sessionUtils.createExerciseConfig(ExerciseType.TongueTwister, 'How much wood');
      
      expect(config.exerciseType).toBe(ExerciseType.TongueTwister);
      expect(config.expectedText).toBe('How much wood');
      expect(config.expectedWords).toEqual(['how', 'much', 'wood']);
    });

    it('should trim whitespace from expected text', () => {
      const config = sessionUtils.createExerciseConfig(ExerciseType.TongueTwister, '  Hello World  ');
      
      expect(config.expectedText).toBe('Hello World');
      expect(config.expectedWords).toEqual(['hello', 'world']);
    });

    it('should throw error for empty text', () => {
      expect(() => {
        sessionUtils.createExerciseConfig(ExerciseType.TongueTwister, '');
      }).toThrow();
    });

    it('should throw error for whitespace-only text', () => {
      expect(() => {
        sessionUtils.createExerciseConfig(ExerciseType.TongueTwister, '   ');
      }).toThrow();
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration correctly', () => {
      const startTime = new Date('2023-01-01T10:00:00Z');
      const endTime = new Date('2023-01-01T10:00:30Z');
      
      const duration = sessionUtils.calculateDuration(startTime, endTime);
      expect(duration).toBe(30000); // 30 seconds in milliseconds
    });

    it('should return null for null start time', () => {
      const endTime = new Date();
      const duration = sessionUtils.calculateDuration(null, endTime);
      expect(duration).toBeNull();
    });

    it('should use current time when end time is null', () => {
      const startTime = new Date();
      startTime.setSeconds(startTime.getSeconds() - 10);
      
      const duration = sessionUtils.calculateDuration(startTime, null);
      expect(duration).toBeGreaterThan(9000); // Should be around 10 seconds
      expect(duration).toBeLessThan(11000);
    });
  });

  describe('validateAudioData', () => {
    it('should validate valid base64 audio data', () => {
      const validAudio = Buffer.from('test audio data').toString('base64');
      const result = sessionUtils.validateAudioData({ audioBase64: validAudio });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.audioBuffer).toBeInstanceOf(Buffer);
    });

    it('should reject null audio data', () => {
      const result = sessionUtils.validateAudioData({ audioBase64: null as any });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid audio data format');
    });

    it('should reject undefined audio data', () => {
      const result = sessionUtils.validateAudioData({ audioBase64: undefined as any });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid audio data format');
    });

    it('should reject empty string', () => {
      const result = sessionUtils.validateAudioData({ audioBase64: '' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid audio data format');
    });

    it('should reject whitespace-only string', () => {
      const result = sessionUtils.validateAudioData({ audioBase64: '   ' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid audio data format');
    });

    it('should reject invalid base64', () => {
      const result = sessionUtils.validateAudioData({ audioBase64: 'not-base64-at-all!' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid audio data format');
    });

    it('should reject empty buffer', () => {
      const result = sessionUtils.validateAudioData({ audioBase64: Buffer.alloc(0).toString('base64') });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid audio data format');
    });
  });

  describe('createSession', () => {
    it('should create session correctly', () => {
      const params: CreateSessionParams = {
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      };
      
      const session = sessionUtils.createSession(params);
      
      expect(session.userId).toBe('test-user');
      expect(session.state.isActive).toBe(false);
      expect(session.state.exerciseConfig).toBeNull();
      expect(session.state.nextWordToConfirmIndex).toBe(0);
      expect(session.state.startTime).toBeNull();
      expect(session.state.endTime).toBeNull();
      expect(session.state.attempts).toEqual([]);
      expect(session.state.currentAttemptIndex).toBe(-1);
      expect(session.azureRecognizer).toBeNull();
      expect(session.azurePushStream).toBeNull();
    });

    it('should throw error for invalid userId', () => {
      const params: CreateSessionParams = {
        userId: '',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      };
      
      expect(() => {
        sessionUtils.createSession(params);
      }).toThrow();
    });

    it('should throw error for null userId', () => {
      const params: CreateSessionParams = {
        userId: null as any,
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      };
      
      expect(() => {
        sessionUtils.createSession(params);
      }).toThrow();
    });
  });

  describe('startSession', () => {
    it('should start session correctly', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const params: StartSessionParams = {
        session,
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'New exercise',
      };
      
      const startedSession = sessionUtils.startSession(params);
      
      expect(startedSession.state.isActive).toBe(true);
      expect(startedSession.state.exerciseConfig).toBeDefined();
      expect(startedSession.state.exerciseConfig?.expectedText).toBe('New exercise');
      expect(startedSession.state.nextWordToConfirmIndex).toBe(0);
      expect(startedSession.state.startTime).toBeInstanceOf(Date);
      expect(startedSession.state.endTime).toBeNull();
      expect(startedSession.state.attempts).toHaveLength(1);
      expect(startedSession.state.currentAttemptIndex).toBe(0);
    });

    it('should throw error if session is already active', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      // Start the session first
      const startedSession = sessionUtils.startSession({
        session,
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'First exercise',
      });
      
      // Try to start again
      expect(() => {
        sessionUtils.startSession({
          session: startedSession,
          exerciseType: ExerciseType.TongueTwister,
          expectedText: 'Second exercise',
        });
      }).toThrow();
    });
  });

  describe('stopSession', () => {
    it('should stop session correctly', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const startedSession = sessionUtils.startSession({
        session,
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const stoppedSession = sessionUtils.stopSession(startedSession);
      
      expect(stoppedSession.state.isActive).toBe(false);
      expect(stoppedSession.state.endTime).toBeInstanceOf(Date);
      expect(stoppedSession.state.nextWordToConfirmIndex).toBe(0);
    });

    it('should throw error if session is not active', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      expect(() => {
        sessionUtils.stopSession(session);
      }).toThrow();
    });
  });

  describe('advanceWordIndex', () => {
    it('should advance word index correctly', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const startedSession = sessionUtils.startSession({
        session,
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const advancedSession = sessionUtils.advanceWordIndex({ session: startedSession });
      
      expect(advancedSession.state.nextWordToConfirmIndex).toBe(1);
    });

    it('should throw error if session has no exercise config', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      expect(() => {
        sessionUtils.advanceWordIndex({ session });
      }).toThrow();
    });
  });

  describe('resetWordIndex', () => {
    it('should reset word index to 0', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const startedSession = sessionUtils.startSession({
        session,
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const advancedSession = sessionUtils.advanceWordIndex({ session: startedSession });
      expect(advancedSession.state.nextWordToConfirmIndex).toBe(1);
      
      const resetSession = sessionUtils.resetWordIndex(advancedSession);
      expect(resetSession.state.nextWordToConfirmIndex).toBe(0);
    });
  });

  describe('setAzureConnection', () => {
    it('should set Azure connection correctly', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const mockRecognizer = {} as any;
      const mockPushStream = {} as any;
      
      const updatedSession = sessionUtils.setAzureConnection({
        session,
        recognizer: mockRecognizer,
        pushStream: mockPushStream,
      });
      
      expect(updatedSession.azureRecognizer).toBe(mockRecognizer);
      expect(updatedSession.azurePushStream).toBe(mockPushStream);
    });
  });

  describe('clearAzureConnection', () => {
    it('should clear Azure connection correctly', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const mockRecognizer = {} as any;
      const mockPushStream = {} as any;
      
      const sessionWithAzure = sessionUtils.setAzureConnection({
        session,
        recognizer: mockRecognizer,
        pushStream: mockPushStream,
      });
      
      const clearedSession = sessionUtils.clearAzureConnection(sessionWithAzure);
      
      expect(clearedSession.azureRecognizer).toBeNull();
      expect(clearedSession.azurePushStream).toBeNull();
    });
  });

  describe('getSessionInfo', () => {
    it('should return session info correctly', async () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const startedSession = sessionUtils.startSession({
        session,
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      // Add a small delay to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const sessionInfo = sessionUtils.getSessionInfo(startedSession);
      
      expect(sessionInfo.userId).toBe('test-user');
      expect(sessionInfo.isActive).toBe(true);
      expect(sessionInfo.exerciseConfig).toBeDefined();
      expect(sessionInfo.exerciseConfig?.expectedText).toBe('Test exercise');
      expect(sessionInfo.startTime).toBeInstanceOf(Date);
      expect(sessionInfo.endTime).toBeNull();
      expect(sessionInfo.duration).toBeGreaterThan(0);
      expect(sessionInfo.hasAzureConnection).toBe(false);
    });

    it('should calculate duration correctly', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const startTime = new Date();
      startTime.setSeconds(startTime.getSeconds() - 30);
      
      const sessionWithStartTime = {
        ...session,
        state: {
          ...session.state,
          startTime,
        },
      };
      
      const sessionInfo = sessionUtils.getSessionInfo(sessionWithStartTime);
      expect(sessionInfo.duration).toBeGreaterThan(25000); // Should be around 30 seconds
      expect(sessionInfo.duration).toBeLessThan(35000);
    });
  });

  describe('canAdvanceWordIndex', () => {
    it('should return true when word index can be advanced', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const startedSession = sessionUtils.startSession({
        session,
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      expect(sessionUtils.canAdvanceWordIndex(startedSession)).toBe(true);
    });

    it('should return false when session is not active', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      expect(sessionUtils.canAdvanceWordIndex(session)).toBe(false);
    });

    it('should return false when no exercise config', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      expect(sessionUtils.canAdvanceWordIndex(session)).toBe(false);
    });

    it('should return false when at last word', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const startedSession = sessionUtils.startSession({
        session,
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      // Advance to last word
      const advancedSession = sessionUtils.advanceWordIndex({ session: startedSession });
      const finalSession = sessionUtils.advanceWordIndex({ session: advancedSession });
      
      expect(sessionUtils.canAdvanceWordIndex(finalSession)).toBe(false);
    });
  });

  describe('isSessionActive', () => {
    it('should return true for active session', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const startedSession = sessionUtils.startSession({
        session,
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      expect(sessionUtils.isSessionActive(startedSession)).toBe(true);
    });

    it('should return false for inactive session', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      expect(sessionUtils.isSessionActive(session)).toBe(false);
    });
  });

  describe('hasAzureConnection', () => {
    it('should return true when Azure connection exists', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const mockRecognizer = {} as any;
      const mockPushStream = {} as any;
      
      const sessionWithAzure = sessionUtils.setAzureConnection({
        session,
        recognizer: mockRecognizer,
        pushStream: mockPushStream,
      });
      
      expect(sessionUtils.hasAzureConnection(sessionWithAzure)).toBe(true);
    });

    it('should return false when no Azure connection', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      expect(sessionUtils.hasAzureConnection(session)).toBe(false);
    });

    it('should return false when only recognizer exists', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const sessionWithPartialAzure = {
        ...session,
        azureRecognizer: {} as any,
        azurePushStream: null,
      };
      
      expect(sessionUtils.hasAzureConnection(sessionWithPartialAzure)).toBe(false);
    });

    it('should return false when only push stream exists', () => {
      const session = sessionUtils.createSession({
        userId: 'test-user',
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      });
      
      const sessionWithPartialAzure = {
        ...session,
        azureRecognizer: null,
        azurePushStream: {} as any,
      };
      
      expect(sessionUtils.hasAzureConnection(sessionWithPartialAzure)).toBe(false);
    });
  });
}); 