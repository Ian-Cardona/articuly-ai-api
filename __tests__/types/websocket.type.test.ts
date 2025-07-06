import { describe, it, expect, jest } from '@jest/globals';
import type { WebSocket } from 'ws';

import type {
  WebSocketMessage,
  AuthMessage,
  AuthenticatedWebSocket,
  StartAudioStreamPayload,
  AudioChunkPayload,
  StopAudioStreamPayload,
  WordFeedbackLivePayload,
  PronunciationFeedbackPayload,
  StreamReadyPayload,
  StreamStoppedPayload
} from '../../src/types/websocket.type';

describe('WebSocket Types', () => {
  describe('WebSocketMessage', () => {
    it('should have correct structure for basic message', () => {
      const message: WebSocketMessage = {
        type: 'TEST_MESSAGE'
      };
      
      expect(message.type).toBe('TEST_MESSAGE');
      expect(message.payload).toBeUndefined();
    });

    it('should support generic payload', () => {
      const message: WebSocketMessage<{ data: string }> = {
        type: 'DATA_MESSAGE',
        payload: { data: 'test data' }
      };
      
      expect(message.type).toBe('DATA_MESSAGE');
      expect(message.payload?.data).toBe('test data');
    });

    it('should allow payload to be optional', () => {
      const message: WebSocketMessage = {
        type: 'NO_PAYLOAD_MESSAGE'
      };
      
      expect(message.type).toBe('NO_PAYLOAD_MESSAGE');
      expect(message.payload).toBeUndefined();
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

    it('should not allow other message types', () => {
      // This should cause a TypeScript error if uncommented:
      // const invalidAuth: AuthMessage = {
      //   type: 'INVALID_TYPE',
      //   idToken: 'test-token'
      // };
      
      // Instead, we test that valid auth messages work
      const validAuth: AuthMessage = {
        type: 'AUTH',
        idToken: 'valid-jwt-token'
      };
      
      expect(validAuth.type).toBe('AUTH');
    });
  });

  describe('AuthenticatedWebSocket', () => {
    it('should extend WebSocket with additional properties', () => {
      // Create a mock WebSocket with required methods
      const mockWebSocket = {
        close: jest.fn(),
        ping: jest.fn(),
        pong: jest.fn(),
        send: jest.fn(),
        terminate: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
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
        CLOSED: 3
      } as unknown as WebSocket;
      
      const authenticatedSocket = {
        ...mockWebSocket,
        userId: 'user123',
        activeAzureRecognizer: undefined,
        activeAzurePushStream: undefined,
        currentExercise: {
          exerciseType: 'tongueTwister',
          expectedText: 'Peter Piper picked a peck of pickled peppers',
          expectedWords: ['Peter', 'Piper', 'picked', 'a', 'peck', 'of', 'pickled', 'peppers'],
          nextWordToConfirmIndex: 0
        }
      } as AuthenticatedWebSocket;
      
      expect(authenticatedSocket.userId).toBe('user123');
      expect(authenticatedSocket.currentExercise?.exerciseType).toBe('tongueTwister');
      expect(authenticatedSocket.currentExercise?.expectedWords).toHaveLength(8);
      expect(authenticatedSocket.currentExercise?.nextWordToConfirmIndex).toBe(0);
    });

    it('should allow optional properties to be undefined', () => {
      const minimalSocket: AuthenticatedWebSocket = {} as AuthenticatedWebSocket;
      
      expect(minimalSocket.userId).toBeUndefined();
      expect(minimalSocket.activeAzureRecognizer).toBeUndefined();
      expect(minimalSocket.activeAzurePushStream).toBeUndefined();
      expect(minimalSocket.currentExercise).toBeUndefined();
    });
  });

  describe('StartAudioStreamPayload', () => {
    it('should have correct structure for tongue twister exercise', () => {
      const payload: StartAudioStreamPayload = {
        exerciseType: 'tongueTwister',
        expectedText: 'She sells seashells by the seashore'
      };
      
      expect(payload.exerciseType).toBe('tongueTwister');
      expect(payload.expectedText).toBe('She sells seashells by the seashore');
    });

    it('should only allow tongueTwister as exercise type', () => {
      const payload: StartAudioStreamPayload = {
        exerciseType: 'tongueTwister',
        expectedText: 'Test text'
      };
      
      expect(payload.exerciseType).toBe('tongueTwister');
    });
  });

  describe('AudioChunkPayload', () => {
    it('should have correct structure for audio data', () => {
      const payload: AudioChunkPayload = {
        data: 'base64EncodedAudioData',
        sequence: 1
      };
      
      expect(payload.data).toBe('base64EncodedAudioData');
      expect(payload.sequence).toBe(1);
    });

    it('should support different sequence numbers', () => {
      const payload1: AudioChunkPayload = {
        data: 'chunk1',
        sequence: 0
      };
      
      const payload2: AudioChunkPayload = {
        data: 'chunk2',
        sequence: 100
      };
      
      expect(payload1.sequence).toBe(0);
      expect(payload2.sequence).toBe(100);
    });
  });

  describe('StopAudioStreamPayload', () => {
    it('should be an empty object as specified', () => {
      const payload: StopAudioStreamPayload = {};
      
      expect(payload).toEqual({});
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

  describe('PronunciationFeedbackPayload', () => {
    it('should have overallResult property', () => {
      const mockAzureResult = {
        pronunciationAssessment: {
          overallScore: 85.5,
          wordLevelResults: []
        }
      };
      
      const payload: PronunciationFeedbackPayload = {
        overallResult: mockAzureResult
      };
      
      expect(payload.overallResult).toEqual(mockAzureResult);
    });

    it('should accept unknown result type', () => {
      const payload: PronunciationFeedbackPayload = {
        overallResult: 'string result'
      };
      
      expect(payload.overallResult).toBe('string result');
    });
  });

  describe('StreamReadyPayload', () => {
    it('should have message property', () => {
      const payload: StreamReadyPayload = {
        message: 'Audio stream is ready to receive data'
      };
      
      expect(payload.message).toBe('Audio stream is ready to receive data');
    });
  });

  describe('StreamStoppedPayload', () => {
    it('should have message property', () => {
      const payload: StreamStoppedPayload = {
        message: 'Audio stream has been stopped'
      };
      
      expect(payload.message).toBe('Audio stream has been stopped');
    });
  });

  describe('Type Integration Tests', () => {
    it('should work with WebSocketMessage generic types', () => {
      const authMessage: WebSocketMessage<{ idToken: string }> = {
        type: 'AUTH',
        payload: { idToken: 'test-token' }
      };
      
      const audioChunkMessage: WebSocketMessage<AudioChunkPayload> = {
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
});
