import './setup';
import { describe, it, expect } from 'vitest';
import { attemptLimitService } from '../src/services/attempt_limit.service.ts';

describe('Abuse Prevention', () => {
  describe('Attempt Limit Enforcement', () => {
    it('should prevent users from exceeding daily attempt limits', () => {
      const userId = 'test-user-123';
      const firstCheck = attemptLimitService.canStartAttempt(userId);
      expect(firstCheck.allowed).toBe(true);
      expect(firstCheck.attemptsRemaining).toBe(2);
      const secondCheck = attemptLimitService.canStartAttempt(userId);
      expect(secondCheck.allowed).toBe(true);
      expect(secondCheck.attemptsRemaining).toBe(1);
      const thirdCheck = attemptLimitService.canStartAttempt(userId);
      expect(thirdCheck.allowed).toBe(false);
      expect(thirdCheck.reason).toContain('Daily attempt limit reached');
    });
    it('should prevent reconnection abuse', () => {
      const userId = 'test-user-456';
      const reconnectCheck = attemptLimitService.canReconnectToSession(userId);
      expect(reconnectCheck.allowed).toBe(true);
    });
  });
}); 