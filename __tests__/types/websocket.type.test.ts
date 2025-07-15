import { describe, it, expect, vi } from 'vitest';
// ESM-compatible Jest mocks for firebase-admin and firebase-admin/firestore
// Removed per-file jest.mock() for firebase-admin and firebase-admin/firestore; now globally mocked in setup.ts

import type {
  WebSocketMessage,
  AuthMessage,
  AuthenticatedWebSocket,
  StartSessionPayload,
  AudioDataPayload,
  StopSessionPayload,
  WordFeedbackLivePayload
} from '../../src/types/websocket.type.ts';

describe('WebSocket Types', () => {
  describe('WebSocketMessage', () => {
    it('should have correct structure for startSession message', () => {
      const message: WebSocketMessage = {
        type: 'startSession',
        payload: { type: 'startSession', exerciseText: 'Test' }
      };
      expect(message.type).toBe('startSession');
      expect((message.payload as any).exerciseText).toBe('Test');
    });

    it('should allow audioData message', () => {
      const message: WebSocketMessage = {
        type: 'audioData',
        payload: { type: 'audioData', audioBase64: 'test' }
      };
      expect(message.type).toBe('audioData');
      expect((message.payload as any).audioBase64).toBe('test');
    });
  });

  describe('AuthMessage', () => {
    it('should extend WebSocketMessage with auth properties', () => {
      const authMessage: AuthMessage = {
        type: 'AUTH',
        idToken: 'test-jwt-token'
      };
      expect(authMessage.type).toBe('AUTH');
      expect(authMessage.idToken).toBe('test-jwt-token');
    });
  });

  describe('AuthenticatedWebSocket', () => {
    it('should extend WebSocket with additional properties', () => {
      // Create a mock WebSocket with required methods
      const mockWebSocket = {
        close: vi.fn(),
        ping: vi.fn(),
        pong: vi.fn(),
        send: vi.fn(),
        terminate: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        readyState: 1,
        url: 'ws://localhost:3000',
        protocol: '',
        extensions: '',
        bufferedAmount: 0,
        onopen: null,
        onclose: null,
        onmessage: null,
        onerror: null,
        binaryType: 'nodebuffer',
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3,
        userId: 'user123',
        id: 'id123',
        isReconnecting: false,
        previousSessionId: 'sess1',
        isPaused: false,
        pause: vi.fn(),
        resume: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        once: vi.fn(),
        removeListener: vi.fn(),
        setMaxListeners: vi.fn(),
        getMaxListeners: vi.fn(),
        listeners: vi.fn(),
        rawListeners: vi.fn(),
        emit: vi.fn(),
        eventNames: vi.fn(),
        prependListener: vi.fn(),
        prependOnceListener: vi.fn(),
        removeAllListeners: vi.fn(),
      } as unknown as AuthenticatedWebSocket;
      expect(mockWebSocket.userId).toBe('user123');
      expect(mockWebSocket.id).toBe('id123');
      expect(mockWebSocket.isReconnecting).toBe(false);
      expect(mockWebSocket.previousSessionId).toBe('sess1');
    });

    it('should allow optional properties to be undefined', () => {
      const minimalSocket: AuthenticatedWebSocket = {} as AuthenticatedWebSocket;
      expect(minimalSocket.userId).toBeUndefined();
      expect(minimalSocket.id).toBeUndefined();
      expect(minimalSocket.isReconnecting).toBeUndefined();
      expect(minimalSocket.previousSessionId).toBeUndefined();
    });
  });

  describe('StartSessionPayload', () => {
    it('should have correct structure for startSession payload', () => {
      const payload: StartSessionPayload = {
        type: 'startSession',
        exerciseText: 'She sells seashells by the seashore'
      };
      expect(payload.type).toBe('startSession');
      expect(payload.exerciseText).toBe('She sells seashells by the seashore');
    });
  });

  describe('AudioDataPayload', () => {
    it('should have correct structure for audio data', () => {
      const payload: AudioDataPayload = {
        type: 'audioData',
        audioBase64: 'base64EncodedAudioData'
      };
      expect(payload.type).toBe('audioData');
      expect(payload.audioBase64).toBe('base64EncodedAudioData');
    });
  });

  describe('StopSessionPayload', () => {
    it('should be an object with type stopSession', () => {
      const payload: StopSessionPayload = { type: 'stopSession' };
      expect(payload).toEqual({ type: 'stopSession' });
    });
  });

  describe('WordFeedbackLivePayload', () => {
    it('should have correct structure for matched word', () => {
      const payload: WordFeedbackLivePayload = {
        word: 'Peter',
        index: 0,
        status: 'matched'
      };
      
      expect(payload.word).toBe('Peter');
      expect(payload.index).toBe(0);
      expect(payload.status).toBe('matched');
    });

    it('should support all status types', () => {
      const matched: WordFeedbackLivePayload = {
        word: 'Piper',
        index: 1,
        status: 'matched'
      };
      
      const skipped: WordFeedbackLivePayload = {
        word: 'picked',
        index: 2,
        status: 'skipped'
      };
      
      const misrecognized: WordFeedbackLivePayload = {
        word: 'packed',
        index: 2,
        status: 'misrecognized'
      };
      
      expect(matched.status).toBe('matched');
      expect(skipped.status).toBe('skipped');
      expect(misrecognized.status).toBe('misrecognized');
    });

    it('should support different word indices', () => {
      const payload: WordFeedbackLivePayload = {
        word: 'peppers',
        index: 7,
        status: 'matched'
      };
      
      expect(payload.index).toBe(7);
    });
  });

  // The following integration and feedback tests reference properties/types not present in the actual type definitions and are commented out to resolve linter errors.
  /*
  describe('Type Integration Tests', () => {
    it('should work with WebSocketMessage generic types', () => {
      const authMessage: WebSocketMessage<{ idToken: string }> = {
        type: 'AUTH',
        payload: { idToken: 'test-token' }
      };
      
      const audioChunkMessage: WebSocketMessage<AudioDataPayload> = {
        type: 'AUDIO_CHUNK',
        payload: {
          data: 'base64data',
          sequence: 1
        }
      };
      
      expect(authMessage.type).toBe('AUTH');
      expect(authMessage.payload?.idToken).toBe('test-token');
      expect(audioChunkMessage.type).toBe('AUDIO_CHUNK');
      expect(audioChunkMessage.payload?.sequence).toBe(1);
    });

    it('should validate exercise structure in AuthenticatedWebSocket', () => {
      const exercise = {
        exerciseType: 'tongueTwister' as const,
        expectedText: 'How much wood would a woodchuck chuck',
        expectedWords: ['How', 'much', 'wood', 'would', 'a', 'woodchuck', 'chuck'],
        nextWordToConfirmIndex: 3
      };
      
      const socket: AuthenticatedWebSocket = {
        userId: 'user456',
        currentExercise: exercise
      } as AuthenticatedWebSocket;
      
      expect(socket.currentExercise?.exerciseType).toBe('tongueTwister');
      expect(socket.currentExercise?.expectedWords).toHaveLength(7);
      expect(socket.currentExercise?.nextWordToConfirmIndex).toBe(3);
    });
  });

  /*
  describe('AuthenticatedWebSocket with currentExercise', () => {
    it('should allow currentExercise property', () => {
      // const ws: AuthenticatedWebSocket = {
      //   userId: 'user1',
      //   currentExercise: {
      //     exerciseType: 'tongueTwister',
      //     expectedText: 'Peter Piper picked a peck of pickled peppers',
      //     expectedWords: ['Peter', 'Piper', 'picked', 'a', 'peck', 'of', 'pickled', 'peppers'],
      //     nextWordToConfirmIndex: 0
      //   }
      // } as unknown as AuthenticatedWebSocket;
      // expect(ws.currentExercise?.exerciseType).toBe('tongueTwister');
      // expect(ws.currentExercise?.expectedWords).toHaveLength(8);
      // expect(ws.currentExercise?.nextWordToConfirmIndex).toBe(0);
    });
  });
  */
});

