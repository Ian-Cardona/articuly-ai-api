import { getFirestore } from 'firebase-admin/firestore';

import type {
  UserAccount,
  CreateUserParams,
  UpdateUserParams,
  AuthResult,
  UsageCheckResult,
  GmailValidationResult,
} from '../types/user.type.ts';

const db = getFirestore();

function isUserAccount(obj: unknown): obj is UserAccount {
  if (!obj || typeof obj !== 'object') return false;
  const u = obj as Partial<UserAccount>;
  return (
    typeof u.userId === 'string' &&
    typeof u.email === 'string' &&
    typeof u.displayName === 'string' &&
    typeof u.dailyLimit === 'number' &&
    typeof u.attemptsToday === 'number' &&
    typeof u.lastAttemptDate === 'string' &&
    typeof u.totalSessions === 'number' &&
    typeof u.subscription === 'string' &&
    typeof u.createdAt === 'string' &&
    typeof u.updatedAt === 'string' &&
    typeof u.status === 'string'
  );
}

export class UserProfileService {
  private readonly usersCollection = 'users';
  private readonly dailyUsageCollection = 'daily_usage';

  /**
   * Validate Gmail domain and normalize email
   */
  validateGmailDomain(email: string): GmailValidationResult {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email is required' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@gmail\.com$/;

    if (!emailRegex.test(normalizedEmail)) {
      return { isValid: false, error: 'Only Gmail addresses are allowed' };
    }

    return { isValid: true, normalizedEmail };
  }

  /**
   * Create a new user profile
   */
  async createUser(params: CreateUserParams): Promise<AuthResult> {
    try {
      const { userId, email, displayName, photoURL, dailyLimit = 2 } = params;

      // Validate Gmail domain
      const emailValidation = this.validateGmailDomain(email);
      if (!emailValidation.isValid) {
        return {
          success: false,
          error: emailValidation.error,
          errorCode: 'INVALID_EMAIL_DOMAIN',
        };
      }
      const normalizedEmail = emailValidation.normalizedEmail as string;

      const now = new Date().toISOString();
      const userAccount: UserAccount = {
        userId,
        email: normalizedEmail,
        displayName: displayName.trim(),
        photoURL,
        dailyLimit,
        attemptsToday: 0,
        lastAttemptDate: now,
        totalSessions: 0,
        subscription: 'free',
        createdAt: now,
        updatedAt: now,
        status: 'active',
      };

      // Check if user already exists
      const existingUser = await this.getUser(userId);
      if (existingUser.success && existingUser.user) {
        return {
          success: false,
          error: 'User already exists',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      // Create user document
      await db.collection(this.usersCollection).doc(userId).set(userAccount);

      // Initialize daily usage
      await this.initializeDailyUsage(userId, dailyLimit);

      return { success: true, user: userAccount };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: 'Failed to create user profile',
      };
    }
  }

  /**
   * Get user profile by ID
   */
  async getUser(userId: string): Promise<AuthResult> {
    try {
      const userDoc = await db.collection(this.usersCollection).doc(userId).get();

      if (!userDoc.exists) {
        return {
          success: false,
          error: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      const userData = userDoc.data();
      if (!isUserAccount(userData)) {
        return {
          success: false,
          error: 'User data is invalid',
        };
      }

      // Check if account is suspended or deleted
      if (userData.status === 'suspended') {
        return {
          success: false,
          error: 'Account is suspended',
          errorCode: 'ACCOUNT_SUSPENDED',
        };
      }

      if (userData.status === 'deleted') {
        return {
          success: false,
          error: 'Account is deleted',
          errorCode: 'ACCOUNT_DELETED',
        };
      }

      return { success: true, user: userData };
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        success: false,
        error: 'Failed to retrieve user profile',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, params: UpdateUserParams): Promise<AuthResult> {
    try {
      const userResult = await this.getUser(userId);
      if (!userResult.success || !userResult.user) {
        return userResult;
      }

      const updateData: Partial<UserAccount> = {
        ...params,
        updatedAt: new Date().toISOString(),
      };

      await db.collection(this.usersCollection).doc(userId).update(updateData);

      // Get updated user
      return await this.getUser(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: 'Failed to update user profile',
      };
    }
  }

  /**
   * Get or create user profile (useful for authentication)
   */
  async getOrCreateUser(userId: string, email: string, displayName: string, photoURL?: string): Promise<AuthResult> {
    try {
      // Try to get existing user
      const userResult = await this.getUser(userId);
      if (userResult.success && userResult.user) {
        return userResult;
      }

      // Create new user if not found
      return await this.createUser({
        userId,
        email,
        displayName,
        photoURL,
      });
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      return {
        success: false,
        error: 'Failed to get or create user profile',
      };
    }
  }

  /**
   * Check if user can make an attempt (daily limit check)
   */
  async checkUsageLimit(userId: string): Promise<UsageCheckResult> {
    try {
      const userResult = await this.getUser(userId);
      if (!userResult.success || !userResult.user) {
        return {
          allowed: false,
          reason: 'User not found',
          currentUsage: 0,
          dailyLimit: 0,
          remainingAttempts: 0,
          nextResetTime: new Date().toISOString(),
        };
      }

      const user = userResult.user;
      const today = new Date().toDateString();
      const lastAttemptDate = new Date(user.lastAttemptDate).toDateString();

      // Reset attempts if it's a new day
      if (today !== lastAttemptDate) {
        await this.resetDailyUsage(userId);
        return {
          allowed: true,
          currentUsage: 0,
          dailyLimit: user.dailyLimit,
          remainingAttempts: user.dailyLimit,
          nextResetTime: this.getNextResetTime(),
        };
      }

      const remainingAttempts = Math.max(0, user.dailyLimit - user.attemptsToday);

      return {
        allowed: remainingAttempts > 0,
        reason: remainingAttempts === 0 ? 'Daily limit exceeded' : undefined,
        currentUsage: user.attemptsToday,
        dailyLimit: user.dailyLimit,
        remainingAttempts,
        nextResetTime: this.getNextResetTime(),
      };
    } catch (error) {
      console.error('Error checking usage limit:', error);
      return {
        allowed: false,
        reason: 'Error checking usage limit',
        currentUsage: 0,
        dailyLimit: 0,
        remainingAttempts: 0,
        nextResetTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Increment user's daily attempt count
   */
  async incrementAttempts(userId: string): Promise<boolean> {
    try {
      const userRef = db.collection(this.usersCollection).doc(userId);

      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        if (!isUserAccount(userData)) {
          throw new Error('User data is invalid');
        }
        const today = new Date().toDateString();
        const lastAttemptDate = new Date(userData.lastAttemptDate).toDateString();

        let attemptsToday = userData.attemptsToday;
        if (today !== lastAttemptDate) {
          attemptsToday = 0;
        }

        transaction.update(userRef, {
          attemptsToday: attemptsToday + 1,
          lastAttemptDate: new Date().toISOString(),
          totalSessions: userData.totalSessions + 1,
          updatedAt: new Date().toISOString(),
        });
      });

      return true;
    } catch (error) {
      console.error('Error incrementing attempts:', error);
      return false;
    }
  }

  /**
   * Initialize daily usage tracking
   */
  private async initializeDailyUsage(userId: string, dailyLimit: number): Promise<void> {
    try {
      const today = new Date().toDateString();
      const dailyUsageDoc = {
        userId,
        date: today,
        attempts: 0,
        lastAttempt: new Date().toISOString(),
        resetTime: this.getNextResetTime(),
        dailyLimit,
      };

      await db.collection(this.dailyUsageCollection).doc(`${userId}_${today}`).set(dailyUsageDoc);
    } catch (error) {
      console.error('Error initializing daily usage:', error);
    }
  }

  /**
   * Reset daily usage for a user
   */
  private async resetDailyUsage(userId: string): Promise<void> {
    try {
      const userRef = db.collection(this.usersCollection).doc(userId);

      await userRef.update({
        attemptsToday: 0,
        lastAttemptDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error resetting daily usage:', error);
    }
  }

  /**
   * Get next reset time (midnight)
   */
  private getNextResetTime(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }
}

export const userProfileService = new UserProfileService();
