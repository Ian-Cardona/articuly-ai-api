import { sessionStoreManager } from './session_store.service.ts';

import type { AudioSession, Attempt } from '../types/session.type.ts';
import type { AttemptLimitConfig } from '../types/attempt_limit.type.ts';

export class AttemptLimitService {
  private config: AttemptLimitConfig;

  constructor(config: AttemptLimitConfig = {
    maxAttemptsPerDay: 2,
    maxAttemptsPerSession: 5,
    resetTimeHour: 0, // Midnight
  }) {
    this.config = config;
  }

  /**
   * Check if user can start a new attempt
   */
  canStartAttempt(userId: string): { allowed: boolean; reason?: string; attemptsUsed: number; attemptsRemaining: number } {
    const session = sessionStoreManager.getSession(userId);
    if (!session) {
      return { allowed: true, attemptsUsed: 0, attemptsRemaining: this.config.maxAttemptsPerDay };
    }

    const today = this.getToday();
    const attemptsToday = this.getAttemptsForDate(session, today);
    const attemptsRemaining = this.config.maxAttemptsPerDay - attemptsToday;

    if (attemptsToday >= this.config.maxAttemptsPerDay) {
      return {
        allowed: false,
        reason: `Daily attempt limit reached (${this.config.maxAttemptsPerDay} attempts)`,
        attemptsUsed: attemptsToday,
        attemptsRemaining: 0,
      };
    }

    return {
      allowed: true,
      attemptsUsed: attemptsToday,
      attemptsRemaining,
    };
  }

  /**
   * Check if user can reconnect to an existing session
   */
  canReconnectToSession(userId: string): { allowed: boolean; reason?: string } {
    const session = sessionStoreManager.getSession(userId);
    if (!session) {
      return { allowed: true };
    }

    // Check if session has exceeded maximum attempts
    const completedAttempts = session.state.attempts.filter((attempt: Attempt) =>
      attempt.result === 'success' || attempt.result === 'fail' || attempt.result === 'timeout',
    );

    if (completedAttempts.length >= this.config.maxAttemptsPerSession) {
      return {
        allowed: false,
        reason: `Session attempt limit reached (${this.config.maxAttemptsPerSession} attempts)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get attempts for a specific date
   */
  private getAttemptsForDate(session: AudioSession, date: Date): number {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);

    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    return session.state.attempts.filter((attempt: Attempt) => {
      if (!attempt.endTime) return false;

      const attemptDate = new Date(attempt.endTime);
      return attemptDate >= dateStart && attemptDate <= dateEnd;
    }).length;
  }

  /**
   * Get today's date (with reset time consideration)
   */
  private getToday(): Date {
    const now = new Date();
    const today = new Date(now);

    // If current time is before reset hour, consider it yesterday
    if (now.getHours() < this.config.resetTimeHour) {
      today.setDate(today.getDate() - 1);
    }

    return today;
  }

  /**
   * Get attempt statistics for a user
   */
  getAttemptStats(userId: string): {
    attemptsToday: number;
    attemptsRemaining: number;
    totalAttempts: number;
    lastAttemptDate?: Date;
  } {
    const session = sessionStoreManager.getSession(userId);
    if (!session) {
      return {
        attemptsToday: 0,
        attemptsRemaining: this.config.maxAttemptsPerDay,
        totalAttempts: 0,
      };
    }

    const today = this.getToday();
    const attemptsToday = this.getAttemptsForDate(session, today);
    const totalAttempts = session.state.attempts.length;

    const lastAttempt = session.state.attempts
      .filter((attempt: Attempt) => attempt.endTime)
      .sort((a: Attempt, b: Attempt) => {
        const aTime = a.endTime ? new Date(a.endTime).getTime() : 0;
        const bTime = b.endTime ? new Date(b.endTime).getTime() : 0;
        return bTime - aTime;
      })[0];

    return {
      attemptsToday,
      attemptsRemaining: Math.max(0, this.config.maxAttemptsPerDay - attemptsToday),
      totalAttempts,
      lastAttemptDate: lastAttempt.endTime ? new Date(lastAttempt.endTime) : undefined,
    };
  }
}

export const attemptLimitService = new AttemptLimitService();
