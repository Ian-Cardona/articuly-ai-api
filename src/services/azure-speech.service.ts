import { SpeechRecognizer, SpeechConfig, PronunciationAssessmentConfig, AudioConfig, AudioInputStream, AudioStreamFormat, ResultReason, PronunciationAssessmentResult, CancellationReason } from 'microsoft-cognitiveservices-speech-sdk';

import { config } from '../config/index.ts';

import type { PushAudioInputStream } from 'microsoft-cognitiveservices-speech-sdk';
import type { HandlerWebSocket, PronunciationFeedbackPayload } from '../types/websocket.type.js';

class AzureSpeechService {
  private activeRecognizers = new Map<string, { recognizer: SpeechRecognizer, pushStream: PushAudioInputStream }>();

  async createAzureConnection(ws: HandlerWebSocket, expectedText: string) {
    if (!ws.userId) {
      throw new Error('WebSocket does not have a userId');
    }
    const speechConfig = SpeechConfig.fromSubscription(config.azureSpeechKey, config.azureSpeechRegion);
    speechConfig.speechRecognitionLanguage = 'en-US';

    const pronunciationAssessmentConfig = PronunciationAssessmentConfig.fromJSON(`{
            "ReferenceText": "${expectedText}",
            "GradingSystem": "HundredMark",
            "Granularity": "Word",
            "Dimension": "Comprehensive",
            "EnableProsodyAssessment": true
        }`);

    const pushStream = AudioInputStream.createPushStream(
      AudioStreamFormat.getWaveFormatPCM(16000, 16, 1),
    );

    const audioConfig = AudioConfig.fromStreamInput(pushStream);
    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    pronunciationAssessmentConfig.applyTo(recognizer);

    ws.activeAzureRecognizer = recognizer;
    ws.activeAzurePushStream = pushStream;

    this.activeRecognizers.set(ws.userId, { recognizer, pushStream });

    recognizer.recognized = (_, e) => {
      if (e.result.reason === ResultReason.RecognizedSpeech) {
        const pronunciationResult = PronunciationAssessmentResult.fromResult(e.result);
        console.log(`[Azure Recognized] User ${ws.userId} "${e.result.text}"`);
        console.log(`[Azure Recognized] Pronunciation: ${pronunciationResult.pronunciationScore}, Accuracy: ${pronunciationResult.accuracyScore}, Fluency: ${pronunciationResult.fluencyScore} , Completeness: ${pronunciationResult.completenessScore}`);

        ws.send(JSON.stringify({
          type: 'PRONUNCIATION_FEEDBACK',
          payload: { overallResult: JSON.parse(e.result.json) } as PronunciationFeedbackPayload,
        }));
      } else if (e.result.reason === ResultReason.NoMatch) {
        console.log(`[Azure NoMatch] User ${ws.userId}: Speech could not be recognized.`);
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'NO_SPEECH_MATCH', message: 'Azure could not recognize speech.' } }));
      }
    };

    recognizer.canceled = (_, e) => {
      console.error(`[Azure Cancelled] User ${ws.userId}: Reason=${e.reason}`);
      if (e.reason === CancellationReason.Error) {
        console.error(`[Azure Canceled] ErrorCode=${e.errorCode}, ErrorDetails=${e.errorDetails}`);
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: e.errorCode, message: `Azure Error:  ${e.errorDetails}` } }));
      }

      if (ws.userId) {
        this.closeAzureConnection(ws.userId);
      }
    };
  }

  async sendAudioToAzure(userId: string, audioBase64: string) {
    const connection = this.activeRecognizers.get(userId);
    if (!connection?.pushStream) {
      throw new Error(`No active Azure connection for user ${userId}`);
    }
    if (typeof audioBase64 !== 'string') {
      throw new Error('audioBase64 must be a string');
    }
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    connection.pushStream.write(audioBuffer);
  }

  async closeAzureConnection(userId: string) {
    const connection = this.activeRecognizers.get(userId);
    if (connection) {
      connection.pushStream.close();
      connection.recognizer.stopContinuousRecognitionAsync(
        () => {
          connection.recognizer.close();
        },
        (error) => {
          console.error(`Error stopping Azure recognizer for user ${userId}:`, error);
          connection.recognizer.close();
        },
      );
      this.activeRecognizers.delete(userId);
      console.log(`Azure connection closed and resources released for user ${userId}.`);
    }
  }


}

export const azureSpeechService = new AzureSpeechService();
