import '../setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionRecoveryService } from '../../src/services/session_recovery.service.ts';
import { sessionStoreManager } from '../../src/services/session_store.service.ts';
import { azureSpeechService } from '../../src/services/azure_speech.service.ts';
import { sessionUtils } from '../../src/utils/session.utils.ts';
import type { AuthenticatedWebSocket } from '../../src/types/websocket.type.ts';
import { ExerciseType } from '../../src/types/session.type.ts';

const createMockWS = (userId = 'user1'): AuthenticatedWebSocket => ({ userId } as AuthenticatedWebSocket);

const createSession = (active = false, withConfig = false) => {
  const session = sessionUtils.createSession({
    userId: 'user1',
    exerciseType: ExerciseType.TongueTwister,
    expectedText: withConfig ? 'Test' : 'Test',
  });
  if (active && withConfig) {
    return {
      ...session,
      state: {
        ...session.state,
        isActive: true,
        exerciseConfig: {
          exerciseType: ExerciseType.TongueTwister,
          expectedText: 'Test',
          expectedWords: ['Test'],
        },
      },
    };
  } else if (active) {
    return {
      ...session,
      state: {
        ...session.state,
        isActive: true,
      },
    };
  } else if (withConfig) {
    return {
      ...session,
      state: {
        ...session.state,
        exerciseConfig: {
          exerciseType: ExerciseType.TongueTwister,
          expectedText: 'Test',
          expectedWords: ['Test'],
        },
      },
    };
  }
  return session;
};

describe('SessionRecoveryService', () => {
  beforeEach(() => {
    sessionStoreManager.cleanupAllSessions();
    vi.clearAllMocks();
  });

  it('should fail if no session exists', async () => {
    const ws = createMockWS();
    const result = await sessionRecoveryService.handleReconnection(ws, { idToken: 'token', type: 'reconnect' });
    expect(result.success).toBe(true);
    expect(result.sessionRestored).toBe(false);
    expect(result.error).toContain('No existing session');
  });

  it('should restore active session with config', async () => {
    const ws = createMockWS();
    const session = createSession(true, true);
    sessionStoreManager.setSession('user1', session);
    vi.spyOn(azureSpeechService, 'createAzureConnection').mockResolvedValue();
    const result = await sessionRecoveryService.handleReconnection(ws, { idToken: 'token', type: 'reconnect' });
    expect(result.success).toBe(true);
    expect(result.sessionRestored).toBe(true);
    expect(result.exerciseConfig).toBeDefined();
  });

  it('should not restore inactive session', async () => {
    const ws = createMockWS();
    const session = createSession(false, true);
    sessionStoreManager.setSession('user1', session);
    const result = await sessionRecoveryService.handleReconnection(ws, { idToken: 'token', type: 'reconnect' });
    expect(result.success).toBe(true);
    expect(result.sessionRestored).toBe(false);
  });

  it('should handle Azure connection failure', async () => {
    const ws = createMockWS();
    const session = createSession(true, true);
    sessionStoreManager.setSession('user1', session);
    vi.spyOn(azureSpeechService, 'createAzureConnection').mockRejectedValue(new Error('Azure fail'));
    const result = await sessionRecoveryService.handleReconnection(ws, { idToken: 'token', type: 'reconnect' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to restore Azure connection');
  });

  it('canRecoverSession returns true for active session with config', () => {
    const session = createSession(true, true);
    sessionStoreManager.setSession('user1', session);
    expect(sessionRecoveryService.canRecoverSession('user1')).toBe(true);
  });

  it('getRecoveryInfo returns correct info', () => {
    const session = createSession(true, true);
    sessionStoreManager.setSession('user1', session);
    const info = sessionRecoveryService.getRecoveryInfo('user1');
    expect(info.canRecover).toBe(true);
    expect(info.exerciseConfig).toBeDefined();
  });

  it('cleanupRecoveryState does not throw', () => {
    expect(() => sessionRecoveryService.cleanupRecoveryState('user1')).not.toThrow();
  });
}); 