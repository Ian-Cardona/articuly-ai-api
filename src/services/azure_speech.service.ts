import * as speechSdk from 'microsoft-cognitiveservices-speech-sdk';

import { config } from '../config/index.ts';
import { errorResponses } from '../types/error.type.ts';
import { createWordFeedbackResponse, createPronunciationFeedbackResponse } from '../utils/response.utils.ts';
import { sessionUtils } from '../utils/session.utils.ts';

import { sessionStoreManager } from './session_store.service.ts';

import type { AuthenticatedWebSocket } from '../types/websocket.type.ts';
import type { AzureConnection, AzureServiceState } from '../types/azure_speech.type.ts';

const createAzureServiceState = (): AzureServiceState => ({
  activeConnections: new Map(),
});

const azureOps = {
  createConnection: (
    state: AzureServiceState,
    userId: string,
    expectedText: string,
  ): { newState: AzureServiceState; connection: AzureConnection } => {
    if (state.activeConnections.has(userId)) {
      throw new Error(`Azure connection already active for user ${userId}`);
    }

    const speechConfig = speechSdk.SpeechConfig.fromSubscription(config.azureSpeechKey, config.azureSpeechRegion);
    speechConfig.speechRecognitionLanguage = 'en-US';

    const pronunciationAssessmentConfig = speechSdk.PronunciationAssessmentConfig.fromJSON(`{
      "ReferenceText": "${expectedText}",
      "GradingSystem": "HundredMark",
      "Granularity": "Word",
      "Dimension": "Comprehensive",
      "EnableProsodyAssessment": true
    }`);

    const pushStream = speechSdk.AudioInputStream.createPushStream(
      speechSdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1),
    );

    const audioConfig = speechSdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);

    pronunciationAssessmentConfig.applyTo(recognizer);

    const connection: AzureConnection = { recognizer, pushStream };

    const newConnections = new Map(state.activeConnections);
    newConnections.set(userId, connection);

    return {
      newState: { activeConnections: newConnections },
      connection,
    };
  },

  // Get connection
  getConnection: (state: AzureServiceState, userId: string): AzureConnection | null => {
    return state.activeConnections.get(userId) ?? null;
  },

  // Remove connection
  removeConnection: (state: AzureServiceState, userId: string): AzureServiceState => {
    const newConnections = new Map(state.activeConnections);
    newConnections.delete(userId);
    return { activeConnections: newConnections };
  },

  // Validate audio data
  validateAudioData: (audioBase64: string): { isValid: boolean; audioBuffer?: Buffer; error?: string } => {
    const validation = sessionUtils.validateAudioData({ audioBase64 });

    if (!validation.isValid) {
      return { isValid: false, error: validation.errors[0] };
    }

    return { isValid: true, audioBuffer: validation.audioBuffer };
  },
};

// Azure service manager
class AzureSpeechService {
  private state: AzureServiceState = createAzureServiceState();

  async createAzureConnection(ws: AuthenticatedWebSocket, expectedText: string): Promise<void> {
    if (!ws.userId) {
      throw new Error('WebSocket user ID is required but not provided');
    }

    if (!expectedText || typeof expectedText !== 'string' || expectedText.trim().length === 0) {
      throw new Error('Expected text is required and must be a non-empty string');
    }

    // Close existing connection if any
    if (this.state.activeConnections.has(ws.userId)) {
      console.warn(`Azure connection already active for user ${ws.userId}. Re-initializing.`);
      await this.closeAzureConnection(ws.userId);
    }

    // Create new connection
    const { newState, connection } = azureOps.createConnection(this.state, ws.userId, expectedText);
    this.state = newState;

    // Update session with Azure connection
    const session = sessionStoreManager.getSession(ws.userId);
    if (session) {
      const updatedSession = sessionUtils.setAzureConnection({
        session,
        recognizer: connection.recognizer,
        pushStream: connection.pushStream,
      });
      sessionStoreManager.setSession(ws.userId, updatedSession);
    }

    // Set up event handlers
    this.setupEventHandlers(connection.recognizer, ws, expectedText);

    return new Promise<void>((resolve, reject) => {
      connection.recognizer.startContinuousRecognitionAsync(
        () => {
          console.log(`Azure continuous recognition started for user ${ws.userId} with expected text: "${expectedText}"`);
          resolve();
        },
        (error) => {
          console.error(`Failed to start Azure recognition for user ${ws.userId}:`, error);
          reject(error);
        },
      );
    });
  }

  // Utility function to assert audioBuffer is present
  private assertAudioBuffer(audioBuffer: Buffer | undefined): asserts audioBuffer is Buffer {
    if (!audioBuffer) {
      throw new Error('Audio buffer is missing after validation.');
    }
  }

  async sendAudioToAzure(userId: string, audioBase64: string): Promise<void> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const validation = azureOps.validateAudioData(audioBase64);
    if (!validation.isValid) {
      throw new Error(validation.error ?? 'Invalid audio data');
    }

    const connection = azureOps.getConnection(this.state, userId);
    if (!connection?.pushStream) {
      throw new Error(`No active Azure connection for user ${userId}`);
    }

    try {
      this.assertAudioBuffer(validation.audioBuffer);
      connection.pushStream.write(validation.audioBuffer);
    } catch (error) {
      console.error(`Error sending audio to Azure for user ${userId}:`, error);
      throw error;
    }
  }

  async closeAzureConnection(userId: string): Promise<void> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const connection = azureOps.getConnection(this.state, userId);
    if (connection) {
      return new Promise<void>((resolve) => {
        connection.pushStream.close();
        connection.recognizer.stopContinuousRecognitionAsync(
          () => {
            connection.recognizer.close();
            this.state = azureOps.removeConnection(this.state, userId);
            console.log(`Azure connection closed and resources released for user ${userId}.`);
            resolve();
          },
          (error) => {
            console.error(`Error stopping Azure recognizer for user ${userId}:`, error);
            connection.recognizer.close();
            this.state = azureOps.removeConnection(this.state, userId);
            resolve();
          },
        );
      });
    }
  }

  private setupEventHandlers(
    recognizer: speechSdk.SpeechRecognizer,
    ws: AuthenticatedWebSocket,
    _expectedText: string,
  ): void {
    // Recognizing event: For immediate, partial feedback
    recognizer.recognizing = (_, e) => {
      if (e.result.reason === speechSdk.ResultReason.RecognizingSpeech && ws.userId) {
        const session = sessionStoreManager.getSession(ws.userId);
        if (!session?.state.exerciseConfig) return;

        const partialText = e.result.text;
        const recognizedWords = partialText.toLowerCase().split(/\s+/).filter(word => word.length > 0);

        let currentExpectedIndex = session.state.nextWordToConfirmIndex;
        const exerciseConfig = session.state.exerciseConfig;

        for (let i = 0; i < recognizedWords.length; i++) {
          const recognizedWord = recognizedWords[i];

          if (currentExpectedIndex < exerciseConfig.expectedWords.length) {
            const expectedWord = exerciseConfig.expectedWords[currentExpectedIndex];

            if (recognizedWord === expectedWord) {
              if (currentExpectedIndex === session.state.nextWordToConfirmIndex) {
                console.log(`[Azure Recognizing - Match] User ${ws.userId}: "${recognizedWord}" (Index: ${currentExpectedIndex})`);
                ws.send(JSON.stringify(createWordFeedbackResponse(
                  exerciseConfig.expectedText.split(/\s+/)[currentExpectedIndex],
                  currentExpectedIndex,
                  'matched',
                )));

                // Update session with advanced word index
                const updatedSession = sessionUtils.advanceWordIndex({ session });
                sessionStoreManager.setSession(ws.userId, updatedSession);
              }
              currentExpectedIndex++;
            }
          }
        }
      }
    };

    // Recognized event: For final, detailed assessment
    recognizer.recognized = (_, e) => {
      if (e.result.reason === speechSdk.ResultReason.RecognizedSpeech && ws.userId) {
        const pronunciationResult = speechSdk.PronunciationAssessmentResult.fromResult(e.result);
        console.log(`[Azure Recognized] User ${ws.userId}: "${e.result.text}"`);
        console.log(`[Azure Score] Pronunciation: ${pronunciationResult.pronunciationScore}, Accuracy: ${pronunciationResult.accuracyScore}, Fluency: ${pronunciationResult.fluencyScore}, Completeness: ${pronunciationResult.completenessScore}`);

        ws.send(JSON.stringify(createPronunciationFeedbackResponse(JSON.parse(e.result.json))));

        // Reset word index
        const session = sessionStoreManager.getSession(ws.userId);
        if (session) {
          const updatedSession = sessionUtils.resetWordIndex(session);
          sessionStoreManager.setSession(ws.userId, updatedSession);
        }
      } else if (e.result.reason === speechSdk.ResultReason.NoMatch && ws.userId) {
        console.log(`[Azure NoMatch] User ${ws.userId}: Speech could not be recognized.`);
        ws.send(JSON.stringify(errorResponses.azureNotReady()));

        const session = sessionStoreManager.getSession(ws.userId);
        if (session) {
          const updatedSession = sessionUtils.resetWordIndex(session);
          sessionStoreManager.setSession(ws.userId, updatedSession);
        }
      }
    };

    recognizer.canceled = (_, e) => {
      console.error(`[Azure Canceled] User ${ws.userId}: Reason=${e.reason}`);
      if (e.reason === speechSdk.CancellationReason.Error) {
        console.error(`[Azure Canceled] ErrorCode=${e.errorCode}, ErrorDetails=${e.errorDetails}`);
        ws.send(JSON.stringify(errorResponses.internalError({
          operation: 'azure_recognition',
          errorCode: String(e.errorCode),
          errorDetails: e.errorDetails,
        })));
      }
      if (ws.userId) {
        this.closeAzureConnection(ws.userId);
        const session = sessionStoreManager.getSession(ws.userId);
        if (session) {
          const updatedSession = sessionUtils.resetWordIndex(session);
          sessionStoreManager.setSession(ws.userId, updatedSession);
        }
      }
    };

    recognizer.sessionStopped = (_, _e) => {
      console.log(`[Azure Session Stopped] User ${ws.userId}: Session ended.`);
      if (ws.userId) {
        this.closeAzureConnection(ws.userId);
        const session = sessionStoreManager.getSession(ws.userId);
        if (session) {
          const updatedSession = sessionUtils.resetWordIndex(session);
          sessionStoreManager.setSession(ws.userId, updatedSession);
        }
      }
    };

    recognizer.speechStartDetected = (_, _e) => {
      console.log(`[Azure Event] User ${ws.userId}: Speech start detected.`);
    };

    recognizer.speechEndDetected = (_, _e) => {
      console.log(`[Azure Event] User ${ws.userId}: Speech end detected.`);
    };
  }
}

export const azureSpeechService = new AzureSpeechService();
