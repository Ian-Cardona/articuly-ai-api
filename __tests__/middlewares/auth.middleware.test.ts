import { jest } from '@jest/globals';
// ESM-compatible Jest mocks for firebase-admin and firebase-admin/firestore
// Removed per-file jest.mock() for firebase-admin and firebase-admin/firestore; now globally mocked in setup.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { authenticateConnection } from '../../src/middlewares/auth.middleware.ts';
import type { AuthStateWebSocket as BaseAuthStateWebSocket } from '../../src/types/middleware.type.ts';
import type { UserAccount } from '../../src/types/user.type.ts';

// Extend AuthStateWebSocket to include userProfile
interface AuthStateWebSocket extends BaseAuthStateWebSocket {
  userProfile?: UserAccount;
}

// Mock Firebase Admin
jest.mock('../../src/firebase/firebase_admin.ts', () => ({
  verifyIdToken: jest.fn(),
}));

// Mock UserProfileService
jest.mock('../../src/services/user_profile.service.ts', () => ({
  userProfileService: {
    getOrCreateUser: jest.fn(),
  },
}));

describe('AuthMiddleware', () => {
  let mockWs: AuthStateWebSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      isAuthenticated: false,
      userId: undefined,
      userProfile: undefined,
    } as any;
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
      const invalidMessage = {
        idToken: 'valid-token',
      };

      const data = Buffer.from(JSON.stringify(invalidMessage));

      const result = await authenticateConnection(mockWs, data);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid message format');
      expect(mockWs.isAuthenticated).toBe(false);
    });

    it('should handle non-AUTH message type', async () => {
      const invalidMessage = {
        type: 'OTHER',
        idToken: 'valid-token',
      };

      const data = Buffer.from(JSON.stringify(invalidMessage));

      const result = await authenticateConnection(mockWs, data);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid message format');
      expect(mockWs.isAuthenticated).toBe(false);
    });

    it('should handle missing idToken', async () => {
      const invalidMessage = {
        type: 'AUTH',
      };

      const data = Buffer.from(JSON.stringify(invalidMessage));

      const result = await authenticateConnection(mockWs, data);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid message format');
      expect(mockWs.isAuthenticated).toBe(false);
    });

    it('should handle invalid token type', async () => {
      const invalidMessage = {
        type: 'AUTH',
        idToken: 123,
      };

      const data = Buffer.from(JSON.stringify(invalidMessage));

      const result = await authenticateConnection(mockWs, data);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid message format');
      expect(mockWs.isAuthenticated).toBe(false);
    });

    it('should validate message structure correctly', async () => {
      const validMessage = {
        type: 'AUTH',
        idToken: 'valid-token',
      };

      const data = Buffer.from(JSON.stringify(validMessage));

      // This will fail at the Firebase verification step, but we can test the message validation
      const result = await authenticateConnection(mockWs, data);

      // Should fail at Firebase verification, not message validation
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });
  });
}); 