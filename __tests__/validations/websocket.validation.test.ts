import '../setup';
import { describe, it, expect } from 'vitest';
import { validateWebSocketMessage, safeJsonParse } from '../../src/validations/websocket.validation.ts';

describe('websocket.validation', () => {
  it('should parse valid JSON', () => {
    const result = safeJsonParse('{"type":"test","payload":{}}');
    expect(result.success).toBe(true);
  });
  it('should fail on invalid JSON', () => {
    const result = safeJsonParse('not json');
    expect(result.success).toBe(false);
  });
  it('should validate startSession message', () => {
    const msg = JSON.stringify({ type: 'startSession', payload: { exerciseText: 'Test', type: 'startSession' } });
    const result = validateWebSocketMessage(msg);
    expect(result.isValid).toBe(true);
  });
  it('should invalidate missing payload', () => {
    const msg = JSON.stringify({ type: 'startSession' });
    const result = validateWebSocketMessage(msg);
    expect(result.isValid).toBe(false);
  });
  it('should invalidate invalid payload', () => {
    const msg = JSON.stringify({ type: 'startSession', payload: {} });
    const result = validateWebSocketMessage(msg);
    expect(result.isValid).toBe(false);
  });
  it('should validate audioData message', () => {
    const msg = JSON.stringify({ type: 'audioData', payload: { audioBase64: 'test', type: 'audioData' } });
    const result = validateWebSocketMessage(msg);
    expect(result.isValid).toBe(true);
  });
  it('should invalidate audioData with missing audioBase64', () => {
    const msg = JSON.stringify({ type: 'audioData', payload: { type: 'audioData' } });
    const result = validateWebSocketMessage(msg);
    expect(result.isValid).toBe(false);
  });
  it('should validate reconnect message', () => {
    const msg = JSON.stringify({ type: 'reconnect', payload: { idToken: 'token', type: 'reconnect' } });
    const result = validateWebSocketMessage(msg);
    expect(result.isValid).toBe(true);
  });
  it('should invalidate reconnect with missing idToken', () => {
    const msg = JSON.stringify({ type: 'reconnect', payload: { type: 'reconnect' } });
    const result = validateWebSocketMessage(msg);
    expect(result.isValid).toBe(false);
  });
}); 