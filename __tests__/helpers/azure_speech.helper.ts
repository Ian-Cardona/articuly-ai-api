import { vi } from 'vitest';
// ESM-compatible Jest mocks for firebase-admin and firebase-admin/firestore
// Removed per-file jest.mock() for firebase-admin and firebase-admin/firestore; now globally mocked in setup.ts

import type { AuthenticatedWebSocket } from '../../src/types/websocket.type.ts';

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
    addEventListener: vi.fn(),
    close: vi.fn(),
    dispatchEvent: vi.fn(),
    emit: vi.fn(),
    eventNames: vi.fn(),
    getMaxListeners: vi.fn(),
    listenerCount: vi.fn(),
    listeners: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    pause: vi.fn(),
    ping: vi.fn(),
    pong: vi.fn(),
    prependListener: vi.fn(),
    prependOnceListener: vi.fn(),
    removeAllListeners: vi.fn(),
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
    resume: vi.fn(),
    send: vi.fn(),
    setMaxListeners: vi.fn(),
    terminate: vi.fn(),
  } as unknown as AuthenticatedWebSocket;
}

export function createMockRecognizer() {
  return {
    startContinuousRecognitionAsync: vi.fn((success) => success && (success as () => void)()),
    stopContinuousRecognitionAsync: vi.fn((success) => {
      // Always call success callback to prevent hanging promises
      if (success && typeof success === 'function') {
        success();
      }
    }),
    close: vi.fn(),
  };
}

export function createMockPushStream() {
  return {
    write: vi.fn(),
    close: vi.fn(),
  };
}

export function clearActiveRecognizers(service: any) {
  const activeRecognizers = service.activeRecognizers;
  if (activeRecognizers && typeof activeRecognizers.clear === 'function') {
    activeRecognizers.clear();
  }
} 