import '../setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { authenticateConnection } from '../../src/middlewares/auth.middleware.ts';
import type { AuthStateWebSocket } from '../types/auth.middleware.test.type.ts';
import type { UserAccount } from '../../src/types/user.type.ts';

// Purpose: Mock Firebase Admin and UserProfileService for authentication middleware tests
vi.mock('../../src/firebase/firebase_admin.ts', () => ({
  verifyIdToken: vi.fn(),
}));
vi.mock('../../src/services/user_profile.service.ts', () => ({
  userProfileService: {
    getOrCreateUser: vi.fn(),
  },
}));

describe('AuthMiddleware', () => {
  let mockWs: AuthStateWebSocket;
  let verifyIdToken: ReturnType<typeof vi.fn>;
  let getOrCreateUser: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      isAuthenticated: false,
      userId: undefined,
      userProfile: undefined,
    } as any;
    verifyIdToken = require('../../src/firebase/firebase_admin.ts').verifyIdToken;
    getOrCreateUser = require('../../src/services/user_profile.service.ts').userProfileService.getOrCreateUser;
  });

  describe('authenticateConnection', () => {
    it('should handle invalid JSON data', async () => {
      const invalidData = Buffer.from('invalid json');
      const result = await authenticateConnection(mockWs, invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON format');
      expect(mockWs.isAuthenticated).toBe(false);
    });

    it('should handle missing message type', async () => {
      const invalidMessage = { idToken: 'valid-token' };
      const data = Buffer.from(JSON.stringify(invalidMessage));
      const result = await authenticateConnection(mockWs, data);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid message format');
      expect(mockWs.isAuthenticated).toBe(false);
    });

    it('should handle non-AUTH message type', async () => {
      const invalidMessage = { type: 'OTHER', idToken: 'valid-token' };
      const data = Buffer.from(JSON.stringify(invalidMessage));
      const result = await authenticateConnection(mockWs, data);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid message format');
      expect(mockWs.isAuthenticated).toBe(false);
    });

    it('should handle missing idToken', async () => {
      const invalidMessage = { type: 'AUTH' };
      const data = Buffer.from(JSON.stringify(invalidMessage));
      const result = await authenticateConnection(mockWs, data);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid message format');
      expect(mockWs.isAuthenticated).toBe(false);
    });

    it('should handle invalid token type', async () => {
      const invalidMessage = { type: 'AUTH', idToken: 123 };
      const data = Buffer.from(JSON.stringify(invalidMessage));
      const result = await authenticateConnection(mockWs, data);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid message format');
      expect(mockWs.isAuthenticated).toBe(false);
    });

    it('should fail authentication with invalid token', async () => {
      const validMessage = { type: 'AUTH', idToken: 'invalid-token' };
      const data = Buffer.from(JSON.stringify(validMessage));
      verifyIdToken.mockRejectedValue(new Error('Invalid or expired ID token.'));
      const result = await authenticateConnection(mockWs, data);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
      expect(mockWs.isAuthenticated).toBe(false);
    });

    it('should authenticate successfully with valid token', async () => {
      const validMessage = { type: 'AUTH', idToken: 'valid-token' };
      const data = Buffer.from(JSON.stringify(validMessage));
      const mockUser: UserAccount = {
        userId: 'user1',
        email: 'test@example.com',
        displayName: 'Test User',
        dailyLimit: 10,
        attemptsToday: 0,
        lastAttemptDate: new Date().toISOString(),
        totalSessions: 0,
        subscription: 'free',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
      };
      verifyIdToken.mockResolvedValue({ uid: 'user1' });
      getOrCreateUser.mockResolvedValue(mockUser);
      const result = await authenticateConnection(mockWs, data);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockWs.isAuthenticated).toBe(true);
      expect(mockWs.userId).toBe('user1');
      expect(mockWs.userProfile).toEqual(mockUser);
    });
  });
}); 