import type * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

export interface ExerciseConfig {
  exerciseType: 'tongueTwister';
  expectedText: string;
  expectedWords: string[];
}

export interface SessionState {
  isActive: boolean;
  exerciseConfig: ExerciseConfig | null;
  nextWordToConfirmIndex: number;
  startTime: Date | null;
  endTime: Date | null;
}

export class AudioSession {
  private state: SessionState;
  private azureRecognizer: speechsdk.SpeechRecognizer | null = null;
  private azurePushStream: speechsdk.PushAudioInputStream | null = null;

  constructor(private readonly userId: string) {
    this.state = {
      isActive: false,
      exerciseConfig: null,
      nextWordToConfirmIndex: 0,
      startTime: null,
      endTime: null,
    };
  }

  // Getters
  get isActive(): boolean {
    return this.state.isActive;
  }

  get exerciseConfig(): ExerciseConfig | null {
    return this.state.exerciseConfig;
  }

  get nextWordToConfirmIndex(): number {
    return this.state.nextWordToConfirmIndex;
  }

  get startTime(): Date | null {
    return this.state.startTime;
  }

  get endTime(): Date | null {
    return this.state.endTime;
  }

  get duration(): number | null {
    if (!this.state.startTime) return null;
    const endTime = this.state.endTime ?? new Date();
    return endTime.getTime() - this.state.startTime.getTime();
  }

  // Session management
  startSession(exerciseType: 'tongueTwister', expectedText: string): void {
    if (this.state.isActive) {
      throw new Error('Session is already active');
    }

    if (!expectedText || expectedText.trim().length === 0) {
      throw new Error('Expected text is required and must be non-empty');
    }

    this.state = {
      isActive: true,
      exerciseConfig: {
        exerciseType,
        expectedText: expectedText.trim(),
        expectedWords: expectedText.toLowerCase().split(/\s+/).filter(word => word.length > 0),
      },
      nextWordToConfirmIndex: 0,
      startTime: new Date(),
      endTime: null,
    };
  }

  stopSession(): void {
    if (!this.state.isActive) {
      throw new Error('No active session to stop');
    }

    this.state.isActive = false;
    this.state.endTime = new Date();
    this.state.nextWordToConfirmIndex = 0;
  }

  // Azure connection management
  setAzureConnection(
    recognizer: speechsdk.SpeechRecognizer,
    pushStream: speechsdk.PushAudioInputStream,
  ): void {
    this.azureRecognizer = recognizer;
    this.azurePushStream = pushStream;
  }

  getAzureRecognizer(): speechsdk.SpeechRecognizer | null {
    return this.azureRecognizer;
  }

  getAzurePushStream(): speechsdk.PushAudioInputStream | null {
    return this.azurePushStream;
  }

  clearAzureConnection(): void {
    this.azureRecognizer = null;
    this.azurePushStream = null;
  }

  // Word tracking
  advanceWordIndex(): void {
    if (!this.state.exerciseConfig) {
      throw new Error('No exercise configuration available');
    }
    this.state.nextWordToConfirmIndex++;
  }

  resetWordIndex(): void {
    this.state.nextWordToConfirmIndex = 0;
  }

  // Validation
  validateAudioData(audioBase64: string): void {
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      throw new Error('Audio data is required and must be a base64 string');
    }

    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      if (audioBuffer.length === 0) {
        throw new Error('Invalid audio data: empty buffer after base64 decoding');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid base64')) {
        throw new Error('Invalid base64 audio data format');
      }
      throw error;
    }
  }

  // Session info
  getSessionInfo() {
    return {
      userId: this.userId,
      isActive: this.state.isActive,
      exerciseConfig: this.state.exerciseConfig,
      nextWordToConfirmIndex: this.state.nextWordToConfirmIndex,
      startTime: this.state.startTime,
      endTime: this.state.endTime,
      duration: this.duration,
      hasAzureConnection: !!(this.azureRecognizer && this.azurePushStream),
    };
  }

  // Cleanup
  cleanup(): void {
    this.stopSession();
    this.clearAzureConnection();
  }
}
