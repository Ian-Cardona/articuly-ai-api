import * as speechSdk from 'microsoft-cognitiveservices-speech-sdk';

import { config } from '../config/index.ts';

import type { AuthenticatedWebSocket, PronunciationFeedbackPayload, WordFeedbackLivePayload } from '../types/websocket.type.ts';

class AzureSpeechService {
  private activeRecognizers = new Map<string, { recognizer: speechSdk.SpeechRecognizer, pushStream: speechSdk.PushAudioInputStream }>();

  async createAzureConnection(ws: AuthenticatedWebSocket, expectedText: string) {
    if (!ws.userId) {
      throw new Error('WebSocket user ID is required but not provided');
    }
    if (this.activeRecognizers.has(ws.userId)) {
      console.warn(`Azure connection already active for user ${ws.userId}. Re-initializing.`);
      await this.closeAzureConnection(ws.userId);
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

    ws.activeAzureRecognizer = recognizer;
    ws.activeAzurePushStream = pushStream;

    this.activeRecognizers.set(ws.userId, { recognizer, pushStream });

    // Store the expected words for real-time comparison
    ws.currentExercise = {
      exerciseType: 'tongueTwister',
      expectedText: expectedText,
      expectedWords: expectedText.toLowerCase().split(/\s+/),
      nextWordToConfirmIndex: 0,
    };

    // --- Event Handlers for Azure Speech SDK ---
    // 1. `recognizing` event: For immediate, partial feedback
    recognizer.recognizing = (_, e) => {
      if (e.result.reason === speechSdk.ResultReason.RecognizingSpeech && ws.currentExercise) {
        const partialText = e.result.text;
        const recognizedWords = partialText.toLowerCase().split(/\s+/).filter(word => word.length > 0);

        // We only care about words that are new and match our sequence
        let currentExpectedIndex = ws.currentExercise.nextWordToConfirmIndex;

        for (let i = 0; i < recognizedWords.length; i++) {
          const recognizedWord = recognizedWords[i];

          // If we haven't confirmed this expected word yet
          if (currentExpectedIndex < ws.currentExercise.expectedWords.length) {
            const expectedWord = ws.currentExercise.expectedWords[currentExpectedIndex];

            // Check if the recognized word matches the current expected word
            if (recognizedWord === expectedWord) {
              // If this is a new word we just matched (i.e., we haven't sent feedback for it yet)
              if (currentExpectedIndex === ws.currentExercise.nextWordToConfirmIndex) {
                console.log(`[Azure Recognizing - Match] User ${ws.userId}: "${recognizedWord}" (Index: ${currentExpectedIndex})`);
                ws.send(JSON.stringify({
                  type: 'WORD_FEEDBACK_LIVE',
                  payload: {
                    word: ws.currentExercise.expectedText.split(/\s+/)[currentExpectedIndex], // Send original casing
                    index: currentExpectedIndex,
                    status: 'matched',
                  } as WordFeedbackLivePayload,
                }));
                ws.currentExercise.nextWordToConfirmIndex++; // Move to the next expected word
              }
              currentExpectedIndex++; // Advance the local pointer for recognized words
            } else {
              // If the recognized word doesn't match the expected word at the current index,
              // and we haven't moved past this expected word yet, it might be a misrecognition
              // or a skipped word. For immediate positive feedback, we might not send
              // a 'misrecognized' status here, as it's still tentative.
              // We'll rely on the final `recognized` event for detailed errors.
              // However, we could send a 'misrecognized' for the *expected* word if it's clearly off.
              // For simplicity, we'll only send 'matched' for now in recognizing.
            }
          }
        }
      }
    };

    // 2. `recognized` event: For final, detailed assessment
    recognizer.recognized = (_, e) => {
      if (e.result.reason === speechSdk.ResultReason.RecognizedSpeech) {
        const pronunciationResult = speechSdk.PronunciationAssessmentResult.fromResult(e.result);
        console.log(`[Azure Recognized] User ${ws.userId}: "${e.result.text}"`);
        console.log(`[Azure Score] Pronunciation: ${pronunciationResult.pronunciationScore}, Accuracy: ${pronunciationResult.accuracyScore}, Fluency: ${pronunciationResult.fluencyScore}, Completeness: ${pronunciationResult.completenessScore}`);
        // Send the raw JSON result back to the client, which contains word-level details
        ws.send(JSON.stringify({
          type: 'PRONUNCIATION_FEEDBACK',
          payload: { overallResult: JSON.parse(e.result.json) } as PronunciationFeedbackPayload,
        }));
        // Reset the word confirmation index for the next utterance
        if (ws.currentExercise) {
          ws.currentExercise.nextWordToConfirmIndex = 0;
        }
      } else if (e.result.reason === speechSdk.ResultReason.NoMatch) {
        console.log(`[Azure NoMatch] User ${ws.userId}: Speech could not be recognized.`);
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'NO_SPEECH_MATCH', message: 'Azure could not recognize speech.' } }));
        if (ws.currentExercise) {
          ws.currentExercise.nextWordToConfirmIndex = 0; // Reset on no match
        }
      }
    };

    recognizer.canceled = (_, e) => {
      console.error(`[Azure Canceled] User ${ws.userId}: Reason=${e.reason}`);
      if (e.reason === speechSdk.CancellationReason.Error) {
        console.error(`[Azure Canceled] ErrorCode=${e.errorCode}, ErrorDetails=${e.errorDetails}`);
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: String(e.errorCode), message: `Azure Error: ${e.errorDetails}` } }));
      }
      if (ws.userId) {
        this.closeAzureConnection(ws.userId);
      }
      if (ws.currentExercise) {
        ws.currentExercise.nextWordToConfirmIndex = 0; // Reset on cancel
      }
    };

    recognizer.sessionStopped = (_, _e) => {
      console.log(`[Azure Session Stopped] User ${ws.userId}: Session ended.`);
      if (ws.userId) {
        this.closeAzureConnection(ws.userId);
      }
      if (ws.currentExercise) {
        ws.currentExercise.nextWordToConfirmIndex = 0; // Reset on session stop
      }
    };

    recognizer.speechStartDetected = (_, _e) => {
      console.log(`[Azure Event] User ${ws.userId}: Speech start detected.`);
    };

    recognizer.speechEndDetected = (_, _e) => {
      console.log(`[Azure Event] User ${ws.userId}: Speech end detected.`);
    };

    return new Promise<void>((resolve, reject) => {
      recognizer.startContinuousRecognitionAsync(
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

  async sendAudioToAzure(userId: string, audioBase64: string) {
    const connection = this.activeRecognizers.get(userId);
    if (!connection?.pushStream) {
      throw new Error(`No active Azure connection for user ${userId}`);
    }
    if (typeof audioBase64 !== 'string') {
      throw new Error('audioBase64 must be a string');
    }
    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      connection.pushStream.write(audioBuffer);
    } catch (error) {
      console.error(`Error sending audio to Azure for user ${userId}:`, error);
      throw error;
    }
  }

  async closeAzureConnection(userId: string) {
    const connection = this.activeRecognizers.get(userId);
    if (connection) {
      return new Promise<void>((resolve) => {
        connection.pushStream.close();
        connection.recognizer.stopContinuousRecognitionAsync(
          () => {
            connection.recognizer.close();
            this.activeRecognizers.delete(userId);
            console.log(`Azure connection closed and resources released for user ${userId}.`);
            resolve();
          },
          (error) => {
            console.error(`Error stopping Azure recognizer for user ${userId}:`, error);
            connection.recognizer.close();
            this.activeRecognizers.delete(userId);
            resolve();
          },
        );
      });
    }
  }
}

export const azureSpeechService = new AzureSpeechService();
