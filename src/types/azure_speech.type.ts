import type * as speechSdk from 'microsoft-cognitiveservices-speech-sdk';

export interface AzureConnection {
  readonly recognizer: speechSdk.SpeechRecognizer;
  readonly pushStream: speechSdk.PushAudioInputStream;
}

export interface AzureServiceState {
  readonly activeConnections: ReadonlyMap<string, AzureConnection>;
}
