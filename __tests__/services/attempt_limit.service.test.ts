// __tests__/services/attempt_limit.service.test.ts
// Tests for AttemptLimitService (rate limiting/abuse prevention)
import '../setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttemptLimitService } from '../../src/services/attempt_limit.service.ts';
import { sessionStoreManager } from '../../src/services/session_store.service.ts';

describe('AttemptLimitService', () => {
  const userId = 'user-test';
  let service: AttemptLimitService;

  beforeEach(() => {
    service = new AttemptLimitService({ maxAttemptsPerDay: 2, maxAttemptsPerSession: 3, resetTimeHour: 0 });
    sessionStoreManager.cleanupAllSessions();
    vi.clearAllMocks();
  });

  it('allows attempt if no session exists', () => {
    const result = service.canStartAttempt(userId);
    expect(result.allowed).toBe(true);
    expect(result.attemptsUsed).toBe(0);
    expect(result.attemptsRemaining).toBe(2);
  });

  it('blocks attempt if daily limit reached', () => {
    const now = new Date();
    sessionStoreManager.setSession(userId, {
      userId,
      state: {
        attempts: [
          { endTime: now.toISOString(), result: 'success' },
          { endTime: now.toISOString(), result: 'fail' },
        ],
      },
    } as any);
    const result = service.canStartAttempt(userId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Daily attempt limit reached/);
    expect(result.attemptsRemaining).toBe(0);
  });

  it('allows attempt if under daily limit', () => {
    const now = new Date();
    sessionStoreManager.setSession(userId, {
      userId,
      state: {
        attempts: [
          { endTime: now.toISOString(), result: 'success' },
        ],
      },
    } as any);
    const result = service.canStartAttempt(userId);
    expect(result.allowed).toBe(true);
    expect(result.attemptsUsed).toBe(1);
    expect(result.attemptsRemaining).toBe(1);
  });

  it('allows reconnect if under session limit', () => {
    sessionStoreManager.setSession(userId, {
      userId,
      state: {
        attempts: [
          { result: 'success', endTime: new Date().toISOString() },
        ],
      },
    } as any);
    const result = service.canReconnectToSession(userId);
    expect(result.allowed).toBe(true);
  });

  it('blocks reconnect if session limit reached', () => {
    sessionStoreManager.setSession(userId, {
      userId,
      state: {
        attempts: [
          { result: 'success', endTime: new Date().toISOString() },
          { result: 'fail', endTime: new Date().toISOString() },
          { result: 'timeout', endTime: new Date().toISOString() },
        ],
      },
    } as any);
    const result = service.canReconnectToSession(userId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Session attempt limit reached/);
  });

  it('getAttemptStats returns correct stats for no session', () => {
    const stats = service.getAttemptStats(userId);
    expect(stats.attemptsToday).toBe(0);
    expect(stats.attemptsRemaining).toBe(2);
    expect(stats.totalAttempts).toBe(0);
    expect(stats.lastAttemptDate).toBeUndefined();
  });

  it('getAttemptStats returns correct stats for session with attempts', () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 1000 * 60 * 60);
    sessionStoreManager.setSession(userId, {
      userId,
      state: {
        attempts: [
          { endTime: earlier.toISOString(), result: 'success' },
          { endTime: now.toISOString(), result: 'fail' },
        ],
      },
    } as any);
    const stats = service.getAttemptStats(userId);
    expect(stats.attemptsToday).toBe(2);
    expect(stats.attemptsRemaining).toBe(0);
    expect(stats.totalAttempts).toBe(2);
    expect(stats.lastAttemptDate?.toISOString()).toBe(now.toISOString());
  });

  it('handles attempts with missing endTime gracefully', () => {
    sessionStoreManager.setSession(userId, {
      userId,
      state: {
        attempts: [
          { result: 'success' },
        ],
      },
    } as any);
    const stats = service.getAttemptStats(userId);
    expect(stats.attemptsToday).toBe(0);
    expect(stats.totalAttempts).toBe(1);
    expect(stats.lastAttemptDate).toBeUndefined();
  });

  it('respects resetTimeHour for getToday', () => {
    const customService = new AttemptLimitService({ maxAttemptsPerDay: 2, maxAttemptsPerSession: 3, resetTimeHour: 23 });
    const now = new Date();
    const today = customService['getToday']();
    if (now.getHours() < 23) {
      expect(today.getDate()).toBe(now.getDate() - 1);
    } else {
      expect(today.getDate()).toBe(now.getDate());
    }
  });
}); 