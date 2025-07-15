// ESM-compatible Jest mocks for firebase-admin and firebase-admin/firestore
// Removed per-file jest.mock() for firebase-admin and firebase-admin/firestore; now globally mocked in setup.ts

import { describe, it, expect } from 'vitest';
import { 
  createStreamReadyResponse, 
  createStreamStoppedResponse, 
  createSessionResponse, 
  createExerciseResponse, 
  createWordFeedbackResponse, 
  createPronunciationFeedbackResponse, 
  createSuccessResponse, 
  createAuthSuccessResponse, 
  createReconnectResponse 
} from '../../src/utils/response.utils.ts';
import { ExerciseType } from '../../src/types/session.type.ts';
import type { UserAccount } from '../../src/types/user.type.ts';

describe('ResponseUtils', () => {
  describe('createStreamReadyResponse', () => {
    it('should create stream ready response correctly', () => {
      const response = createStreamReadyResponse('Test exercise');
      
      expect(response.type).toBe('STREAM_READY');
      expect(response.payload.message).toBe('Ready to receive audio chunks.');
      expect(response.payload.expectedText).toBe('Test exercise');
      expect(response.payload.exerciseType).toBe(ExerciseType.TongueTwister);
      expect(response.payload.timestamp).toBeDefined();
    });

    it('should use default exercise type', () => {
      const response = createStreamReadyResponse('Test exercise');
      expect(response.payload.exerciseType).toBe(ExerciseType.TongueTwister);
    });

    it('should use custom exercise type', () => {
      const response = createStreamReadyResponse('Test exercise', ExerciseType.TongueTwister);
      expect(response.payload.exerciseType).toBe(ExerciseType.TongueTwister);
    });

    it('should throw error for invalid expectedText', () => {
      expect(() => {
        createStreamReadyResponse(null as any);
      }).toThrow('expectedText must be a string');
    });

    it('should throw error for invalid exercise type', () => {
      expect(() => {
        createStreamReadyResponse('Test exercise', 'invalid' as any);
      }).toThrow('Invalid exerciseType');
    });
  });

  describe('createStreamStoppedResponse', () => {
    it('should create stream stopped response correctly', () => {
      const response = createStreamStoppedResponse();
      
      expect(response.type).toBe('STREAM_STOPPED');
      expect(response.payload.message).toBe('Audio stream stopped successfully.');
      expect(response.payload.timestamp).toBeDefined();
    });
  });

  describe('createSessionResponse', () => {
    it('should create session response correctly', () => {
      const exerciseConfig = {
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
        expectedWords: ['test', 'exercise'],
      };
      
      const response = createSessionResponse(exerciseConfig);
      
      expect(response.message).toBe('Session started successfully');
      expect(response.exerciseConfig.exerciseType).toBe(ExerciseType.TongueTwister);
      expect(response.exerciseConfig.expectedText).toBe('Test exercise');
      expect(response.exerciseConfig.expectedWords).toEqual(['test', 'exercise']);
    });

    it('should throw error for invalid exercise config', () => {
      const invalidConfig = {
        exerciseType: 'invalid',
        expectedText: 'Test exercise',
        expectedWords: ['test', 'exercise'],
      };
      
      expect(() => {
        createSessionResponse(invalidConfig as any);
      }).toThrow('Invalid exerciseConfig object');
    });

    it('should throw error for missing exercise type', () => {
      const invalidConfig = {
        expectedText: 'Test exercise',
        expectedWords: ['test', 'exercise'],
      };
      
      expect(() => {
        createSessionResponse(invalidConfig as any);
      }).toThrow('Invalid exerciseConfig object');
    });

    it('should throw error for missing expected text', () => {
      const invalidConfig = {
        exerciseType: ExerciseType.TongueTwister,
        expectedWords: ['test', 'exercise'],
      };
      
      expect(() => {
        createSessionResponse(invalidConfig as any);
      }).toThrow('Invalid exerciseConfig object');
    });

    it('should throw error for missing expected words', () => {
      const invalidConfig = {
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
      };
      
      expect(() => {
        createSessionResponse(invalidConfig as any);
      }).toThrow('Invalid exerciseConfig object');
    });
  });

  describe('createExerciseResponse', () => {
    it('should create exercise response correctly', () => {
      const exerciseConfig = {
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
        expectedWords: ['test', 'exercise'],
      };
      
      const response = createExerciseResponse(exerciseConfig);
      
      expect(response.message).toBe('Exercise submitted successfully');
      expect(response.exerciseConfig.exerciseType).toBe(ExerciseType.TongueTwister);
      expect(response.exerciseConfig.expectedText).toBe('Test exercise');
      expect(response.exerciseConfig.expectedWords).toEqual(['test', 'exercise']);
    });

    it('should throw error for invalid exercise config', () => {
      const invalidConfig = {
        exerciseType: 'invalid',
        expectedText: 'Test exercise',
        expectedWords: ['test', 'exercise'],
      };
      
      expect(() => {
        createExerciseResponse(invalidConfig as any);
      }).toThrow('Invalid exerciseConfig object');
    });
  });

  describe('createWordFeedbackResponse', () => {
    it('should create word feedback response correctly', () => {
      const response = createWordFeedbackResponse('test', 0, 'matched');
      
      expect(response.word).toBe('test');
      expect(response.index).toBe(0);
      expect(response.status).toBe('matched');
    });

    it('should handle skipped status', () => {
      const response = createWordFeedbackResponse('test', 1, 'skipped');
      
      expect(response.word).toBe('test');
      expect(response.index).toBe(1);
      expect(response.status).toBe('skipped');
    });

    it('should handle misrecognized status', () => {
      const response = createWordFeedbackResponse('test', 2, 'misrecognized');
      
      expect(response.word).toBe('test');
      expect(response.index).toBe(2);
      expect(response.status).toBe('misrecognized');
    });

    it('should throw error for invalid word', () => {
      expect(() => {
        createWordFeedbackResponse('', 0, 'matched');
      }).toThrow('Invalid arguments for createWordFeedbackResponse');
    });

    it('should throw error for invalid index', () => {
      expect(() => {
        createWordFeedbackResponse('test', -1, 'matched');
      }).toThrow('Invalid arguments for createWordFeedbackResponse');
    });

    it('should throw error for invalid status', () => {
      expect(() => {
        createWordFeedbackResponse('test', 0, 'invalid' as any);
      }).toThrow('Invalid arguments for createWordFeedbackResponse');
    });
  });

  describe('createPronunciationFeedbackResponse', () => {
    it('should create pronunciation feedback response correctly', () => {
      const overallResult = { score: 0.8, confidence: 0.9 };
      const response = createPronunciationFeedbackResponse(overallResult);
      
      expect(response.overallResult).toEqual(overallResult);
    });

    it('should throw error for null overall result', () => {
      expect(() => {
        createPronunciationFeedbackResponse(null);
      }).toThrow('Invalid overallResult for createPronunciationFeedbackResponse');
    });

    it('should throw error for undefined overall result', () => {
      expect(() => {
        createPronunciationFeedbackResponse(undefined);
      }).toThrow('Invalid overallResult for createPronunciationFeedbackResponse');
    });

    it('should throw error for primitive overall result', () => {
      expect(() => {
        createPronunciationFeedbackResponse('string');
      }).toThrow('Invalid overallResult for createPronunciationFeedbackResponse');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response correctly', () => {
      const response = createSuccessResponse('Operation completed successfully');
      
      expect(response.type).toBe('SUCCESS');
      expect(response.payload.message).toBe('Operation completed successfully');
      expect(response.payload.timestamp).toBeDefined();
    });

    it('should throw error for invalid message', () => {
      expect(() => {
        createSuccessResponse(null as any);
      }).toThrow('Message must be a string');
    });

    it('should throw error for non-string message', () => {
      expect(() => {
        createSuccessResponse(123 as any);
      }).toThrow('Message must be a string');
    });
  });

  describe('createAuthSuccessResponse', () => {
    const createValidUserAccount = (): UserAccount => ({
      userId: 'test-user-123',
      email: 'test@gmail.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
      dailyLimit: 5,
      attemptsToday: 2,
      lastAttemptDate: new Date().toISOString(),
      totalSessions: 10,
      subscription: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    });

    it('should create auth success response correctly', () => {
      const userAccount = createValidUserAccount();
      const response = createAuthSuccessResponse(userAccount);
      
      expect(response.type).toBe('auth_success');
      expect(response.payload.userId).toBe('test-user-123');
      expect(response.payload.email).toBe('test@gmail.com');
      expect(response.payload.displayName).toBe('Test User');
      expect(response.payload.dailyLimit).toBe(5);
      expect(response.payload.attemptsToday).toBe(2);
      expect(response.payload.remainingAttempts).toBe(3); // 5 - 2
      expect(response.payload.subscription).toBe('free');
      expect(response.payload.timestamp).toBeDefined();
    });

    it('should calculate remaining attempts correctly', () => {
      const userAccount = {
        ...createValidUserAccount(),
        dailyLimit: 10,
        attemptsToday: 7,
      };
      
      const response = createAuthSuccessResponse(userAccount);
      expect(response.payload.remainingAttempts).toBe(3);
    });

    it('should handle zero remaining attempts', () => {
      const userAccount = {
        ...createValidUserAccount(),
        dailyLimit: 5,
        attemptsToday: 5,
      };
      
      const response = createAuthSuccessResponse(userAccount);
      expect(response.payload.remainingAttempts).toBe(0);
    });

    it('should handle negative remaining attempts', () => {
      const userAccount = {
        ...createValidUserAccount(),
        dailyLimit: 5,
        attemptsToday: 10,
      };
      
      const response = createAuthSuccessResponse(userAccount);
      expect(response.payload.remainingAttempts).toBe(0);
    });

    it('should throw error for invalid userId', () => {
      const userAccount = {
        ...createValidUserAccount(),
        userId: null as any,
      };
      
      expect(() => {
        createAuthSuccessResponse(userAccount);
      }).toThrow('User account must be provided with valid userId');
    });

    it('should throw error for invalid email', () => {
      const userAccount = {
        ...createValidUserAccount(),
        email: null as any,
      };
      
      expect(() => {
        createAuthSuccessResponse(userAccount);
      }).toThrow('User account must have valid email');
    });

    it('should throw error for invalid displayName', () => {
      const userAccount = {
        ...createValidUserAccount(),
        displayName: null as any,
      };
      
      expect(() => {
        createAuthSuccessResponse(userAccount);
      }).toThrow('User account must have valid displayName');
    });

    it('should throw error for invalid dailyLimit', () => {
      const userAccount = {
        ...createValidUserAccount(),
        dailyLimit: null as any,
      };
      
      expect(() => {
        createAuthSuccessResponse(userAccount);
      }).toThrow('User account must have valid dailyLimit');
    });

    it('should throw error for invalid attemptsToday', () => {
      const userAccount = {
        ...createValidUserAccount(),
        attemptsToday: null as any,
      };
      
      expect(() => {
        createAuthSuccessResponse(userAccount);
      }).toThrow('User account must have valid attemptsToday');
    });

    it('should throw error for invalid subscription', () => {
      const userAccount = {
        ...createValidUserAccount(),
        subscription: 'invalid' as any,
      };
      
      expect(() => {
        createAuthSuccessResponse(userAccount);
      }).toThrow('User account must have valid subscription');
    });

    it('should accept valid subscription types', () => {
      const subscriptions = ['free', 'premium', 'enterprise'] as const;
      
      subscriptions.forEach(subscription => {
        const userAccount = {
          ...createValidUserAccount(),
          subscription,
        };
        
        const response = createAuthSuccessResponse(userAccount);
        expect(response.payload.subscription).toBe(subscription);
      });
    });
  });

  describe('createReconnectResponse', () => {
    it('should create reconnect response for restored session', () => {
      const exerciseConfig = {
        exerciseType: ExerciseType.TongueTwister,
        expectedText: 'Test exercise',
        expectedWords: ['test', 'exercise'],
      };
      
      const response = createReconnectResponse(true, 'session-123', exerciseConfig);
      
      expect(response.message).toBe('Session restored successfully');
      expect(response.sessionRestored).toBe(true);
      expect(response.sessionId).toBe('session-123');
      expect(response.exerciseConfig).toEqual(exerciseConfig);
    });

    it('should create reconnect response for no session', () => {
      const response = createReconnectResponse(false, 'session-123');
      
      expect(response.message).toBe('No active session to restore');
      expect(response.sessionRestored).toBe(false);
      expect(response.sessionId).toBe('session-123');
      expect(response.exerciseConfig).toBeUndefined();
    });

    it('should throw error for invalid sessionRestored', () => {
      expect(() => {
        createReconnectResponse(null as any, 'session-123');
      }).toThrow('sessionRestored must be a boolean');
    });

    it('should throw error for invalid sessionId', () => {
      expect(() => {
        createReconnectResponse(true, null as any);
      }).toThrow('sessionId must be a string');
    });

    it('should throw error for empty sessionId', () => {
      expect(() => {
        createReconnectResponse(true, '');
      }).toThrow('sessionId must be a string');
    });
  });
}); 