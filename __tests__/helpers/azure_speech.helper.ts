// Test helpers for AzureSpeechService tests

import { jest } from '@jest/globals';
import type { AuthenticatedWebSocket } from '../../src/types/websocket.type';

export function createMockWebSocket(userId = 'user1'): AuthenticatedWebSocket {
  // Minimal mock for all required WebSocket properties
  return {
    userId,
    activeAzureRecognizer: undefined,
    activeAzurePushStream: undefined,
    currentExercise: undefined,
    // WebSocket interface properties
    binaryType: 'nodebuffer',
    bufferedAmount: 0,
    extensions: '',
    isPaused: false,
    onclose: null,
    onerror: null,
    onmessage: null,
    onopen: null,
    protocol: '',
    readyState: 1,
    url: 'ws://localhost:3000',
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    addEventListener: jest.fn(),
    close: jest.fn(),
    dispatchEvent: jest.fn(),
    emit: jest.fn(),
    eventNames: jest.fn(),
    getMaxListeners: jest.fn(),
    listenerCount: jest.fn(),
    listeners: jest.fn(),
    off: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    pause: jest.fn(),
    ping: jest.fn(),
    pong: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
    removeAllListeners: jest.fn(),
    removeEventListener: jest.fn(),
    removeListener: jest.fn(),
    resume: jest.fn(),
    send: jest.fn(),
    setMaxListeners: jest.fn(),
    terminate: jest.fn(),
  } as unknown as AuthenticatedWebSocket;
}

export function createMockRecognizer() {
  return {
    startContinuousRecognitionAsync: jest.fn((success, error) => success && (success as () => void)()),
    stopContinuousRecognitionAsync: jest.fn((success, error) => {
      // Always call success callback to prevent hanging promises
      if (success && typeof success === 'function') {
        success();
      }
    }),
    close: jest.fn(),
  };
}

export function createMockPushStream() {
  return {
    write: jest.fn(),
    close: jest.fn(),
  };
}

export function clearActiveRecognizers(service) {
  const activeRecognizers = service.activeRecognizers;
  if (activeRecognizers && typeof activeRecognizers.clear === 'function') {
    activeRecognizers.clear();
  }
} 