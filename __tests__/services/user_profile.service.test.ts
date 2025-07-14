import { jest } from '@jest/globals';
// ESM-compatible Jest mocks for firebase-admin and firebase-admin/firestore

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { userProfileService } from '../../src/services/user_profile.service.ts';
import type { UserAccount, CreateUserParams, UpdateUserParams } from '../../src/types/user.type.ts';

// Remove per-file Firestore mock; global mock is now used.

describe('UserProfileService', () => {
  let mockDoc: any;
  let mockCollection: any;
  let mockFirestore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked instances
    const { getFirestore } = require('firebase-admin');
    mockFirestore = getFirestore();
    mockCollection = mockFirestore.collection();
    mockDoc = mockCollection.doc();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateGmailDomain', () => {
    it('should validate Gmail addresses correctly', () => {
      const validEmails = [
        'test@gmail.com',
        'user.name@gmail.com',
        'TEST@GMAIL.COM',
      ];

      validEmails.forEach(email => {
        const result = userProfileService.validateGmailDomain(email);
        expect(result.isValid).toBe(true);
        expect(result.normalizedEmail).toBe(email.toLowerCase());
      });
    });

    it('should reject non-Gmail addresses', () => {
      const invalidEmails = [
        'test@yahoo.com',
        'user@outlook.com',
        'invalid-email',
        '',
        null,
        undefined,
      ];

      invalidEmails.forEach(email => {
        const result = userProfileService.validateGmailDomain(email as string);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should normalize email addresses', () => {
      const result = userProfileService.validateGmailDomain('  TEST@GMAIL.COM  ');
      expect(result.isValid).toBe(true);
      expect(result.normalizedEmail).toBe('test@gmail.com');
    });
  });

  describe('createUser', () => {
    const validUserParams: CreateUserParams = {
      userId: 'test-user-123',
      email: 'test@gmail.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
      dailyLimit: 5,
    };

    it('should create a new user successfully', async () => {
      // Mock that user doesn't exist
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await userProfileService.createUser(validUserParams);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.userId).toBe(validUserParams.userId);
      expect(result.user?.email).toBe('test@gmail.com');
      expect(result.user?.displayName).toBe('Test User');
      expect(result.user?.subscription).toBe('free');
      expect(result.user?.status).toBe('active');
      expect(result.user?.attemptsToday).toBe(0);
      expect(result.user?.totalSessions).toBe(0);

      expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
        userId: validUserParams.userId,
        email: 'test@gmail.com',
      }));
    });

    it('should reject non-Gmail addresses', async () => {
      const invalidParams = { ...validUserParams, email: 'test@yahoo.com' };
      const result = await userProfileService.createUser(invalidParams);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_EMAIL_DOMAIN');
      expect(mockDoc.set).not.toHaveBeenCalled();
    });

    it('should not create duplicate users', async () => {
      // Mock that user already exists
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });

      const result = await userProfileService.createUser(validUserParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User already exists');
      expect(mockDoc.set).not.toHaveBeenCalled();
    });

    it('should use default daily limit when not provided', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue({ exists: false });

      const paramsWithoutLimit = { ...validUserParams };
      delete paramsWithoutLimit.dailyLimit;

      const result = await userProfileService.createUser(paramsWithoutLimit);

      expect(result.success).toBe(true);
      expect(result.user?.dailyLimit).toBe(2); // Default value
    });

    it('should handle Firestore errors', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue({ exists: false });
      mockDoc.set.mockRejectedValue(new Error('Firestore error'));

      const result = await userProfileService.createUser(validUserParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create user profile');
    });
  });

  describe('getUser', () => {
    const mockUserData: UserAccount = {
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
    };

    it('should retrieve existing user successfully', async () => {
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.data.mockReturnValue(mockUserData);

      const result = await userProfileService.getUser('test-user-123');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUserData);
      expect(mockCollection.doc).toHaveBeenCalledWith('test-user-123');
    });

    it('should return error for non-existent user', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await userProfileService.getUser('non-existent');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('USER_NOT_FOUND');
    });

    it('should reject suspended accounts', async () => {
      const suspendedUser = { ...mockUserData, status: 'suspended' as const };
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.data.mockReturnValue(suspendedUser);

      const result = await userProfileService.getUser('test-user-123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ACCOUNT_SUSPENDED');
    });

    it('should reject deleted accounts', async () => {
      const deletedUser = { ...mockUserData, status: 'deleted' as const };
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.data.mockReturnValue(deletedUser);

      const result = await userProfileService.getUser('test-user-123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ACCOUNT_DELETED');
    });

    it('should handle invalid user data', async () => {
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.data.mockReturnValue({ invalid: 'data' });

      const result = await userProfileService.getUser('test-user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User data is invalid');
    });

    it('should handle Firestore errors', async () => {
      mockDoc.get.mockRejectedValue(new Error('Firestore error'));

      const result = await userProfileService.getUser('test-user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to retrieve user profile');
    });
  });

  describe('updateUser', () => {
    const mockUserData: UserAccount = {
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
    };

    it('should update user successfully', async () => {
      const updateParams: UpdateUserParams = {
        displayName: 'Updated Name',
        subscription: 'premium',
      };

      // Mock getUser to return existing user
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.data.mockReturnValue(mockUserData);

      const result = await userProfileService.updateUser('test-user-123', updateParams);

      expect(result.success).toBe(true);
      expect(result.user?.displayName).toBe('Updated Name');
      expect(result.user?.subscription).toBe('premium');
      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
        displayName: 'Updated Name',
        subscription: 'premium',
        updatedAt: expect.any(String),
      }));
    });

    it('should return error for non-existent user', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await userProfileService.updateUser('non-existent', { displayName: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('USER_NOT_FOUND');
    });
  });

  describe('getOrCreateUser', () => {
    const mockUserData: UserAccount = {
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
    };

    it('should return existing user if found', async () => {
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.data.mockReturnValue(mockUserData);

      const result = await userProfileService.getOrCreateUser(
        'test-user-123',
        'test@gmail.com',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUserData);
      expect(mockDoc.set).not.toHaveBeenCalled(); // Should not create new user
    });

    it('should create new user if not found', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await userProfileService.getOrCreateUser(
        'new-user-123',
        'new@gmail.com',
        'New User'
      );

      expect(result.success).toBe(true);
      expect(result.user?.userId).toBe('new-user-123');
      expect(result.user?.email).toBe('new@gmail.com');
      expect(mockDoc.set).toHaveBeenCalled(); // Should create new user
    });
  });

  describe('checkUsageLimit', () => {
    const mockUserData: UserAccount = {
      userId: 'test-user-123',
      email: 'test@gmail.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
      dailyLimit: 3,
      attemptsToday: 2,
      lastAttemptDate: new Date().toISOString(),
      totalSessions: 10,
      subscription: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    };

    it('should allow attempts when under daily limit', async () => {
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.data.mockReturnValue(mockUserData);

      const result = await userProfileService.checkUsageLimit('test-user-123');

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(2);
      expect(result.dailyLimit).toBe(3);
      expect(result.remainingAttempts).toBe(1);
    });

    it('should block attempts when at daily limit', async () => {
      const userAtLimit = { ...mockUserData, attemptsToday: 3 };
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.data.mockReturnValue(userAtLimit);

      const result = await userProfileService.checkUsageLimit('test-user-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily limit exceeded');
      expect(result.remainingAttempts).toBe(0);
    });

    it('should return error for non-existent user', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await userProfileService.checkUsageLimit('non-existent');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('User not found');
    });
  });

  describe('incrementAttempts', () => {
    const mockUserData: UserAccount = {
      userId: 'test-user-123',
      email: 'test@gmail.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
      dailyLimit: 3,
      attemptsToday: 1,
      lastAttemptDate: new Date().toISOString(),
      totalSessions: 5,
      subscription: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    };

    it('should increment attempts successfully', async () => {
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.data.mockReturnValue(mockUserData);

      const result = await userProfileService.incrementAttempts('test-user-123');

      expect(result).toBe(true);
      expect(mockFirestore.runTransaction).toHaveBeenCalled();
    });

    it('should reset attempts for new day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const userWithOldAttempts = { ...mockUserData, lastAttemptDate: yesterday.toISOString() };
      
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.data.mockReturnValue(userWithOldAttempts);

      const result = await userProfileService.incrementAttempts('test-user-123');

      expect(result).toBe(true);
      expect(mockFirestore.runTransaction).toHaveBeenCalled();
    });

    it('should handle non-existent user', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await userProfileService.incrementAttempts('non-existent');

      expect(result).toBe(false);
    });

    it('should handle invalid user data', async () => {
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.data.mockReturnValue({ invalid: 'data' });

      const result = await userProfileService.incrementAttempts('test-user-123');

      expect(result).toBe(false);
    });
  });
}); 