// Azure SDK mock must be hoisted before any imports
vi.mock('microsoft-cognitiveservices-speech-sdk', () => {
  function createSpeechConfigMock() {
    return { setProperty: () => {} };
  }
  function createPronunciationAssessmentConfigMock() {
    return { applyTo: () => {} };
  }
  function createAudioInputStreamMock() {
    return { write: vi.fn(), close: vi.fn() };
  }
  function createAudioStreamFormatMock() {
    return {};
  }
  function createAudioConfigMock() {
    return {};
  }
  class SpeechRecognizer {
    canceled = null;
    recognized = null;
    recognizing = null;
    sessionStarted = null;
    sessionStopped = null;
    speechStartDetected = null;
    speechEndDetected = null;
    startContinuousRecognitionAsync = (success: () => void) => setTimeout(success, 10);
    stopContinuousRecognitionAsync = (success: () => void) => setTimeout(success, 10);
    close = () => {};
    recognizeOnceAsync = (success: (result: any) => void) => setTimeout(() => success({}), 10);
  }
  function createPronunciationAssessmentResultMock() {
    return {
      pronunciationScore: 100,
      accuracyScore: 100,
      fluencyScore: 100,
      completenessScore: 100,
    };
  }
  return {
    SpeechConfig: {
      fromSubscription: () => createSpeechConfigMock(),
      fromJSON: () => createSpeechConfigMock(),
    },
    PronunciationAssessmentConfig: {
      fromJSON: () => createPronunciationAssessmentConfigMock(),
    },
    AudioInputStream: {
      createPushStream: () => createAudioInputStreamMock(),
    },
    AudioStreamFormat: {
      getWaveFormatPCM: () => createAudioStreamFormatMock(),
    },
    AudioConfig: {
      fromStreamInput: () => createAudioConfigMock(),
    },
    SpeechRecognizer,
    PronunciationAssessmentResult: {
      fromResult: () => createPronunciationAssessmentResultMock(),
    },
    ResultReason: {
      RecognizingSpeech: 'RecognizingSpeech',
      RecognizedSpeech: 'RecognizedSpeech',
      NoMatch: 'NoMatch',
    },
    CancellationReason: {
      Error: 'Error',
    },
  };
});

import { vi } from 'vitest';

// Global Firestore and Auth mock
const getFirestoreMock = vi.fn(() => ({
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: false,
      data: vi.fn(),
    })),
  })),
}));

const verifyIdTokenMock = vi.fn();

class ServiceAccount {}

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  credential: {
    cert: vi.fn(),
    applicationDefault: vi.fn(),
  },
  firestore: () => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        exists: false,
        data: vi.fn(),
      })),
    })),
  }),
  getFirestore: getFirestoreMock,
  apps: [],
  app: vi.fn(),
  ServiceAccount,
  verifyIdToken: verifyIdTokenMock,
  __esModule: true,
  default: {
    getFirestore: getFirestoreMock,
    ServiceAccount,
    verifyIdToken: verifyIdTokenMock,
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: getFirestoreMock,
  Firestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        exists: false,
        data: vi.fn(),
      })),
    })),
  })),
  __esModule: true,
  default: {
    getFirestore: getFirestoreMock,
  },
})); 