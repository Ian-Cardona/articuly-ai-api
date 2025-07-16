import '../setup';
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { azureSpeechService } from '../../src/services/azure_speech.service.js';
import { createMockWebSocket, createMockRecognizer, createMockPushStream } from '../helpers/azure_speech.helper.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the Azure Speech SDK
vi.mock('microsoft-cognitiveservices-speech-sdk', () => {
  return {
    SpeechConfig: {
      fromSubscription: vi.fn().mockReturnValue({
        speechRecognitionLanguage: 'en-US'
      })
    },
    PronunciationAssessmentConfig: {
      fromJSON: vi.fn().mockReturnValue({
        applyTo: vi.fn()
      })
    },
    AudioInputStream: {
      createPushStream: vi.fn().mockReturnValue(createMockPushStream())
    },
    AudioStreamFormat: {
      getWaveFormatPCM: vi.fn().mockReturnValue({})
    },
    AudioConfig: {
      fromStreamInput: vi.fn().mockReturnValue({})
    },
    SpeechRecognizer: vi.fn(() => createMockRecognizer()),
    ResultReason: {
      RecognizingSpeech: 'RecognizingSpeech',
      RecognizedSpeech: 'RecognizedSpeech',
      NoMatch: 'NoMatch'
    },
    CancellationReason: {
      Error: 'Error'
    },
    PronunciationAssessmentResult: {
      fromResult: vi.fn().mockReturnValue({
        pronunciationScore: 85,
        accuracyScore: 90,
        fluencyScore: 88,
        completenessScore: 92
      })
    }
  };
});

// Mock the config
vi.mock('../../src/config/index.ts', () => ({
  config: {
    azureSpeechKey: 'test-key',
    azureSpeechRegion: 'test-region'
  }
}));

// Helper function to clear active connections
function clearActiveConnections(service: any): void {
  if (service.state?.activeConnections) {
    service.state.activeConnections.clear();
  }
}

describe('Azure Speech Service', () => {
  beforeEach(() => {
    clearActiveConnections(azureSpeechService as any);
  });

  afterEach(async () => {
    // Clean up any active connections to prevent Jest hanging
    const activeConnections = (azureSpeechService as any).state?.activeConnections;
    if (activeConnections) {
      const userIds = Array.from(activeConnections.keys());
      for (const userId of userIds) {
        try {
          // Force cleanup by directly removing from the map and calling close methods
          const connection = activeConnections.get(userId);
          if (connection) {
            if (connection.pushStream && typeof connection.pushStream.close === 'function') {
              connection.pushStream.close();
            }
            if (connection.recognizer && typeof connection.recognizer.close === 'function') {
              connection.recognizer.close();
            }
          }
          activeConnections.delete(userId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
    
    // Clear all mocks to prevent state leakage
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // Final cleanup to ensure Jest exits
    const activeConnections = (azureSpeechService as any).state?.activeConnections;
    if (activeConnections) {
      activeConnections.clear();
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
    const activeConnections = (azureSpeechService as any).state.activeConnections;
    activeConnections.set('user123', { recognizer: createMockRecognizer(), pushStream: createMockPushStream() });
    await expect(azureSpeechService.sendAudioToAzure('user123', 123 as any))
      .rejects
      .toThrow('Invalid audio data format');
    activeConnections.delete('user123');
  });

  it('should throw error when no active connection exists', async () => {
    await expect(azureSpeechService.sendAudioToAzure('nonexistent-user', 'base64data'))
      .rejects
      .toThrow('No active Azure connection for user nonexistent-user');
  });

  it('should successfully send audio to Azure', async () => {
    // Mock the push stream to track write calls
    const mockPushStream = createMockPushStream();
    const activeConnections = (azureSpeechService as any).state.activeConnections;
    activeConnections.set('user123', { 
      recognizer: createMockRecognizer(), 
      pushStream: mockPushStream 
    });
    
    // Send audio
    const audioData = 'dGVzdCBhdWRpbyBkYXRh'; // "test audio data" in base64
    await azureSpeechService.sendAudioToAzure('user123', audioData);
    
    // Verify audio was sent
    expect(mockPushStream.write).toHaveBeenCalledWith(
      expect.any(Buffer)
    );
    
    // Verify the buffer contains the decoded audio data
    const writeCall = mockPushStream.write.mock.calls[0];
    const sentBuffer = writeCall[0] as Buffer;
    expect(sentBuffer).toBeInstanceOf(Buffer);
    expect(sentBuffer.toString('base64')).toBe(audioData);
  }, 10000);

  it('should send real test audio file to Azure', async () => {
    // Setup connection with the correct tongue twister
    const expectedText = 'Terrific trolley treats trigger tremendously thankful, thoughtful, thorough testimonials';
    const ws = createMockWebSocket('user456');
    await azureSpeechService.createAzureConnection(ws, expectedText);
    
    // Mock the push stream to track write calls
    const mockPushStream = createMockPushStream();
    const activeConnections = (azureSpeechService as any).state.activeConnections;
    activeConnections.set('user456', { 
      recognizer: createMockRecognizer(), 
      pushStream: mockPushStream 
    });
    
    // Read the actual test audio file
    const audioFilePath = join(__dirname, '..', 'test-audio', 'Terrific trolleys treat trigger tremendously.m4a');
    const audioBuffer = readFileSync(audioFilePath);
    const audioBase64 = audioBuffer.toString('base64');
    
    // Send the real audio to Azure
    await azureSpeechService.sendAudioToAzure('user456', audioBase64);
    
    // Verify audio was sent
    expect(mockPushStream.write).toHaveBeenCalledWith(
      expect.any(Buffer)
    );
    
    // Verify the buffer contains the actual audio data
    const writeCall = mockPushStream.write.mock.calls[0];
    const sentBuffer = writeCall[0] as Buffer;
    expect(sentBuffer).toBeInstanceOf(Buffer);
    expect(sentBuffer.length).toBe(audioBuffer.length);
    expect(sentBuffer).toEqual(audioBuffer);
  }, 10000);

  describe('createAzureConnection', () => {
    it('should throw if ws.userId is missing', async () => {
      const ws: any = {};
      await expect(azureSpeechService.createAzureConnection(ws, 'test text'))
        .rejects
        .toThrow('WebSocket user ID is required but not provided');
    });

    it('should close existing connection if one exists', async () => {
      const ws = createMockWebSocket('user1');
      const closeAzureConnectionSpy = vi.spyOn(azureSpeechService, 'closeAzureConnection').mockImplementationOnce(async () => {
        // Actually remove the connection from the state to prevent the error
        const activeConnections = (azureSpeechService as any).state?.activeConnections;
        if (activeConnections) {
          activeConnections.delete('user1');
        }
      });
      
      // First create a connection
      await azureSpeechService.createAzureConnection(ws, 'test text');
      
      // Then try to create another one - this should trigger the close existing logic
      await azureSpeechService.createAzureConnection(ws, 'another test text');
      
      expect(closeAzureConnectionSpy).toHaveBeenCalledWith('user1');
      closeAzureConnectionSpy.mockRestore();
    });

    it('should set up recognizer and push stream on the WebSocket', async () => {
      const ws = createMockWebSocket('user2');
      await azureSpeechService.createAzureConnection(ws, 'hello world');
      // The service should create a connection without throwing errors
      expect(ws.userId).toBe('user2');
    });

    it('should resolve the promise on successful recognition start', async () => {
      const ws = createMockWebSocket('user3');
      await expect(azureSpeechService.createAzureConnection(ws, 'test')).resolves.toBeUndefined();
    });

    it('should reject the promise if recognition fails to start', async () => {
      vi.resetModules();
      vi.doMock('microsoft-cognitiveservices-speech-sdk', () => ({
        SpeechConfig: { fromSubscription: vi.fn().mockReturnValue({ speechRecognitionLanguage: 'en-US' }) },
        PronunciationAssessmentConfig: { fromJSON: vi.fn().mockReturnValue({ applyTo: vi.fn() }) },
        AudioInputStream: { createPushStream: vi.fn().mockReturnValue({ write: vi.fn(), close: vi.fn() }) },
        AudioStreamFormat: { getWaveFormatPCM: vi.fn().mockReturnValue({}) },
        AudioConfig: { fromStreamInput: vi.fn().mockReturnValue({}) },
        SpeechRecognizer: vi.fn(() => ({
          startContinuousRecognitionAsync: vi.fn((_success, error) => error && (error as (err: Error) => void)(new Error('fail'))),
          stopContinuousRecognitionAsync: vi.fn(),
          close: vi.fn(),
        })),
        ResultReason: { RecognizingSpeech: 'RecognizingSpeech', RecognizedSpeech: 'RecognizedSpeech', NoMatch: 'NoMatch' },
        CancellationReason: { Error: 'Error' },
        PronunciationAssessmentResult: { fromResult: vi.fn().mockReturnValue({}) }
      }));

      // Dynamically import the service after mocking
      const { azureSpeechService } = await import('../../src/services/azure_speech.service.js');
      const { createMockWebSocket } = await import('../helpers/azure_speech.helper.js');
      const ws = createMockWebSocket('user4');
      await expect(azureSpeechService.createAzureConnection(ws, 'fail test')).rejects.toThrow('fail');
    });
  });
});
