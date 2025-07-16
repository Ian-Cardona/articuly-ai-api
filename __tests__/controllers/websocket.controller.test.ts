import '../setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleWebSocketMessage } from '../../src/controllers/websocket.controller.ts';
import { sessionStoreManager } from '../../src/services/session_store.service.ts';
import { azureSpeechService } from '../../src/services/azure_speech.service.ts';
import { sessionRecoveryService } from '../../src/services/session_recovery.service.ts';
import type { AuthenticatedWebSocket } from '../../src/types/websocket.type.ts';
import { ExerciseType } from '../../src/types/session.type.ts';

const createMockWS = (userId = 'user1'): AuthenticatedWebSocket => ({
  userId,
  send: vi.fn(),
  isAuthenticated: true,
} as any);

describe('handleWebSocketMessage', () => {
  beforeEach(() => {
    sessionStoreManager.cleanupAllSessions();
    vi.clearAllMocks();
  });

  it('should handle invalid JSON', async () => {
    const ws = createMockWS();
    await handleWebSocketMessage(ws, 'not json');
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Invalid message format'));
  });

  it('should handle unsupported message type', async () => {
    const ws = createMockWS();
    await handleWebSocketMessage(ws, JSON.stringify({ type: 'unknown', payload: {} }));
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('unsupported'));
  });

  it('should handle startSession', async () => {
    const ws = createMockWS();
    vi.spyOn(azureSpeechService, 'createAzureConnection').mockResolvedValue();
    await handleWebSocketMessage(ws, JSON.stringify({ type: 'startSession', payload: { type: 'startSession', exerciseText: 'Test' } }));
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Session started successfully'));
  });

  it('should handle submitExercise', async () => {
    const ws = createMockWS();
    vi.spyOn(azureSpeechService, 'createAzureConnection').mockResolvedValue();
    await handleWebSocketMessage(ws, JSON.stringify({ type: 'submitExercise', payload: { type: 'submitExercise', exerciseText: 'Test' } }));
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Exercise started successfully'));
  });

  it('should handle audioData', async () => {
    const ws = createMockWS();
    vi.spyOn(azureSpeechService, 'sendAudioToAzure').mockResolvedValue();
    sessionStoreManager.setSession('user1', { userId: 'user1', state: { isActive: true, exerciseConfig: { exerciseType: ExerciseType.TongueTwister, expectedText: 'Test', expectedWords: ['Test'] }, nextWordToConfirmIndex: 0, startTime: new Date(), endTime: null, attempts: [], currentAttemptIndex: -1 }, azureRecognizer: null, azurePushStream: null });
    await handleWebSocketMessage(ws, JSON.stringify({ type: 'audioData', payload: { type: 'audioData', audioBase64: 'test' } }));
    expect(azureSpeechService.sendAudioToAzure).toHaveBeenCalled();
  });

  it('should handle stopSession', async () => {
    const ws = createMockWS();
    vi.spyOn(azureSpeechService, 'closeAzureConnection').mockResolvedValue();
    sessionStoreManager.setSession('user1', { userId: 'user1', state: { isActive: true, exerciseConfig: { exerciseType: ExerciseType.TongueTwister, expectedText: 'Test', expectedWords: ['Test'] }, nextWordToConfirmIndex: 0, startTime: new Date(), endTime: null, attempts: [], currentAttemptIndex: -1 }, azureRecognizer: null, azurePushStream: null });
    await handleWebSocketMessage(ws, JSON.stringify({ type: 'stopSession', payload: { type: 'stopSession' } }));
    expect(azureSpeechService.closeAzureConnection).toHaveBeenCalled();
  });

  it('should handle reconnect', async () => {
    const ws = createMockWS();
    vi.spyOn(sessionRecoveryService, 'handleReconnection').mockResolvedValue({ success: true, sessionRestored: true, sessionId: 'id' });
    await handleWebSocketMessage(ws, JSON.stringify({ type: 'reconnect', payload: { type: 'reconnect', idToken: 'token' } }));
    expect(sessionRecoveryService.handleReconnection).toHaveBeenCalled();
  });

  it('should handle missing payload', async () => {
    const ws = createMockWS();
    await handleWebSocketMessage(ws, JSON.stringify({ type: 'startSession' }));
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Invalid message format'));
  });

  it('should reject unauthenticated user', async () => {
    const ws = { ...createMockWS(), isAuthenticated: false };
    await handleWebSocketMessage(ws as any, JSON.stringify({ type: 'startSession', payload: { type: 'startSession', exerciseText: 'Test' } }));
    expect((ws as any).send).toHaveBeenCalledWith(expect.stringContaining('Authentication required'));
  });

  it('should handle Azure error on startSession', async () => {
    const ws = createMockWS();
    vi.spyOn(azureSpeechService, 'createAzureConnection').mockRejectedValue(new Error('Azure error'));
    await handleWebSocketMessage(ws, JSON.stringify({ type: 'startSession', payload: { type: 'startSession', exerciseText: 'Test' } }));
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Azure error'));
  });

  it('should handle session not found on audioData', async () => {
    const ws = createMockWS();
    vi.spyOn(azureSpeechService, 'sendAudioToAzure').mockResolvedValue();
    // No session set for user
    await handleWebSocketMessage(ws, JSON.stringify({ type: 'audioData', payload: { type: 'audioData', audioBase64: 'test' } }));
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Session not found'));
  });

  it('should propagate error from service', async () => {
    const ws = createMockWS();
    vi.spyOn(azureSpeechService, 'sendAudioToAzure').mockRejectedValue(new Error('Service error'));
    sessionStoreManager.setSession('user1', { userId: 'user1', state: { isActive: true, exerciseConfig: { exerciseType: ExerciseType.TongueTwister, expectedText: 'Test', expectedWords: ['Test'] }, nextWordToConfirmIndex: 0, startTime: new Date(), endTime: null, attempts: [], currentAttemptIndex: -1 }, azureRecognizer: null, azurePushStream: null });
    await handleWebSocketMessage(ws, JSON.stringify({ type: 'audioData', payload: { type: 'audioData', audioBase64: 'test' } }));
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Service error'));
  });
}); 