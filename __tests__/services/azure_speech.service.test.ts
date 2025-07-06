import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { azureSpeechService } from '../../src/services/azure_speech.service';
import { createMockWebSocket, createMockRecognizer, createMockPushStream, clearActiveRecognizers } from '../helpers/azure_speech.helper';

// Mock the Azure Speech SDK
jest.mock('microsoft-cognitiveservices-speech-sdk', () => {
  return {
    SpeechConfig: {
      fromSubscription: jest.fn().mockReturnValue({
        speechRecognitionLanguage: 'en-US'
      })
    },
    PronunciationAssessmentConfig: {
      fromJSON: jest.fn().mockReturnValue({
        applyTo: jest.fn()
      })
    },
    AudioInputStream: {
      createPushStream: jest.fn().mockReturnValue(createMockPushStream())
    },
    AudioStreamFormat: {
      getWaveFormatPCM: jest.fn().mockReturnValue({})
    },
    AudioConfig: {
      fromStreamInput: jest.fn().mockReturnValue({})
    },
    SpeechRecognizer: jest.fn(() => createMockRecognizer()),
    ResultReason: {
      RecognizingSpeech: 'RecognizingSpeech',
      RecognizedSpeech: 'RecognizedSpeech',
      NoMatch: 'NoMatch'
    },
    CancellationReason: {
      Error: 'Error'
    },
    PronunciationAssessmentResult: {
      fromResult: jest.fn().mockReturnValue({
        pronunciationScore: 85,
        accuracyScore: 90,
        fluencyScore: 88,
        completenessScore: 92
      })
    }
  };
});

// Mock the config
jest.mock('../../src/config/index.ts', () => ({
  config: {
    azureSpeechKey: 'test-key',
    azureSpeechRegion: 'test-region'
  }
}));

describe('Azure Speech Service', () => {
  beforeEach(() => {
    clearActiveRecognizers(azureSpeechService as any);
  });

  afterEach(async () => {
    // Clean up any active connections to prevent Jest hanging
    const activeRecognizers = (azureSpeechService as any).activeRecognizers;
    if (activeRecognizers) {
      for (const [userId] of activeRecognizers) {
        try {
          await azureSpeechService.closeAzureConnection(userId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  });

  it('should be properly instantiated', () => {
    expect(azureSpeechService).toBeDefined();
    expect(typeof azureSpeechService.createAzureConnection).toBe('function');
    expect(typeof azureSpeechService.sendAudioToAzure).toBe('function');
    expect(typeof azureSpeechService.closeAzureConnection).toBe('function');
  });

  it('should validate audio data type in sendAudioToAzure', async () => {
    // Mock an active connection by directly accessing the private property
    const activeRecognizers = (azureSpeechService as any).activeRecognizers;
    activeRecognizers.set('user123', { recognizer: createMockRecognizer(), pushStream: createMockPushStream() });
    await expect(azureSpeechService.sendAudioToAzure('user123', 123 as any))
      .rejects
      .toThrow('audioBase64 must be a string');
    activeRecognizers.delete('user123');
  });

  it('should throw error when no active connection exists', async () => {
    await expect(azureSpeechService.sendAudioToAzure('nonexistent-user', 'base64data'))
      .rejects
      .toThrow('No active Azure connection for user nonexistent-user');
  });

  describe('createAzureConnection', () => {
    it('should throw if ws.userId is missing', async () => {
      const ws: any = {};
      await expect(azureSpeechService.createAzureConnection(ws, 'test text'))
        .rejects
        .toThrow('WebSocket user ID is required but not provided');
    });

    it('should close existing connection if one exists', async () => {
      const ws = createMockWebSocket('user1');
      const closeAzureConnectionSpy = jest.spyOn(azureSpeechService, 'closeAzureConnection').mockImplementationOnce(async () => {});
      // Simulate an existing connection with required methods
      const activeRecognizers = (azureSpeechService as any).activeRecognizers;
      activeRecognizers.set('user1', { recognizer: createMockRecognizer(), pushStream: createMockPushStream() });
      await azureSpeechService.createAzureConnection(ws, 'test text');
      expect(closeAzureConnectionSpy).toHaveBeenCalledWith('user1');
      closeAzureConnectionSpy.mockRestore();
    });

    it('should set up recognizer and push stream on the WebSocket', async () => {
      const ws = createMockWebSocket('user2');
      await azureSpeechService.createAzureConnection(ws, 'hello world');
      expect(ws.activeAzureRecognizer).toBeDefined();
      expect(ws.activeAzurePushStream).toBeDefined();
      expect(ws.currentExercise).toBeDefined();
      expect(ws.currentExercise!.expectedText).toBe('hello world');
    });

    it('should resolve the promise on successful recognition start', async () => {
      const ws = createMockWebSocket('user3');
      await expect(azureSpeechService.createAzureConnection(ws, 'test')).resolves.toBeUndefined();
    });

    it('should reject the promise if recognition fails to start', async () => {
      jest.resetModules();
      jest.doMock('microsoft-cognitiveservices-speech-sdk', () => ({
        SpeechConfig: { fromSubscription: jest.fn().mockReturnValue({ speechRecognitionLanguage: 'en-US' }) },
        PronunciationAssessmentConfig: { fromJSON: jest.fn().mockReturnValue({ applyTo: jest.fn() }) },
        AudioInputStream: { createPushStream: jest.fn().mockReturnValue({ write: jest.fn(), close: jest.fn() }) },
        AudioStreamFormat: { getWaveFormatPCM: jest.fn().mockReturnValue({}) },
        AudioConfig: { fromStreamInput: jest.fn().mockReturnValue({}) },
        SpeechRecognizer: jest.fn(() => ({
          startContinuousRecognitionAsync: jest.fn((success, error) => error && (error as (err: Error) => void)(new Error('fail'))),
          stopContinuousRecognitionAsync: jest.fn(),
          close: jest.fn(),
        })),
        ResultReason: { RecognizingSpeech: 'RecognizingSpeech', RecognizedSpeech: 'RecognizedSpeech', NoMatch: 'NoMatch' },
        CancellationReason: { Error: 'Error' },
        PronunciationAssessmentResult: { fromResult: jest.fn().mockReturnValue({}) }
      }));

      // Dynamically import the service after mocking
      const { azureSpeechService } = await import('../../src/services/azure_speech.service');
      const { createMockWebSocket } = await import('../helpers/azure_speech.helper');
      const ws = createMockWebSocket('user4');
      await expect(azureSpeechService.createAzureConnection(ws, 'fail test')).rejects.toThrow('fail');
    });
  });
});
