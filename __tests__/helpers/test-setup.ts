import { jest } from '@jest/globals';
// ESM-compatible Jest mocks for firebase-admin and firebase-admin/firestore
// Removed per-file jest.mock() for firebase-admin and firebase-admin/firestore; now globally mocked in setup.ts

/**
 * Mocks Firebase Admin for all tests.
 */
export function mockFirebase() {
  jest.unstable_mockModule('firebase-admin', () => ({
    default: {
      auth: () => ({
        verifyIdToken: jest.fn(async (token: string) => {
          if (token === 'valid-token') return { uid: 'testUserId' };
          throw new Error('Invalid or expired ID token.');
        }),
      }),
      firestore: () => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({
              exists: true,
              data: () => ({
                userId: 'testUserId',
                email: 'test@example.com',
                displayName: 'Test User',
                dailyLimit: 10,
                attemptsToday: 0,
                lastAttemptDate: new Date().toISOString(),
                totalSessions: 0,
                subscription: 'free',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active'
              })
            })),
            set: jest.fn(() => Promise.resolve()),
            update: jest.fn(() => Promise.resolve())
          }))
        }))
      }),
      initializeApp: jest.fn(),
      credential: {
        cert: jest.fn(),
        applicationDefault: jest.fn(),
      },
      apps: [],
      app: jest.fn(),
    },
    auth: () => ({
      verifyIdToken: jest.fn(async (token: string) => {
        if (token === 'valid-token') return { uid: 'testUserId' };
        throw new Error('Invalid or expired ID token.');
      }),
    }),
    getFirestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({
            exists: true,
            data: () => ({
              userId: 'testUserId',
              email: 'test@example.com',
              displayName: 'Test User',
              dailyLimit: 10,
              attemptsToday: 0,
              lastAttemptDate: new Date().toISOString(),
              totalSessions: 0,
              subscription: 'free',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              status: 'active'
            })
          })),
          set: jest.fn(() => Promise.resolve()),
          update: jest.fn(() => Promise.resolve())
        }))
      }))
    })),
    verifyIdToken: jest.fn(async (token: string) => {
      if (token === 'valid-token') return { uid: 'testUserId' };
      throw new Error('Invalid or expired ID token.');
    }),
    initializeApp: jest.fn(),
  }));

  jest.unstable_mockModule('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({
            exists: true,
            data: () => ({
              userId: 'testUserId',
              email: 'test@example.com',
              displayName: 'Test User',
              dailyLimit: 10,
              attemptsToday: 0,
              lastAttemptDate: new Date().toISOString(),
              totalSessions: 0,
              subscription: 'free',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              status: 'active'
            })
          })),
          set: jest.fn(() => Promise.resolve()),
          update: jest.fn(() => Promise.resolve())
        }))
      }))
    })),
    Firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({
            exists: true,
            data: () => ({
              userId: 'testUserId',
              email: 'test@example.com',
              displayName: 'Test User',
              dailyLimit: 10,
              attemptsToday: 0,
              lastAttemptDate: new Date().toISOString(),
              totalSessions: 0,
              subscription: 'free',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              status: 'active'
            })
          })),
          set: jest.fn(() => Promise.resolve()),
          update: jest.fn(() => Promise.resolve())
        }))
      }))
    })),
  }));
}

/**
 * Mocks Azure Speech SDK for all tests.
 */
export function mockAzureSDK() {
  jest.unstable_mockModule('microsoft-cognitiveservices-speech-sdk', () => ({
    SpeechConfig: class {
      static fromSubscription() { return new this(); }
      static fromJSON() { return new this(); }
      setProperty() {}
    },
    PronunciationAssessmentConfig: class {
      static fromJSON() { return new this(); }
      applyTo() {}
    },
    AudioInputStream: class {
      static createPushStream() { return { write: jest.fn(), close: jest.fn() }; }
    },
    AudioStreamFormat: class {
      static getWaveFormatPCM() { return {}; }
    },
    AudioConfig: class {
      static fromStreamInput() { return {}; }
    },
    SpeechRecognizer: class {
      public canceled: any = null;
      public recognized: any = null;
      public recognizing: any = null;
      public sessionStarted: any = null;
      public sessionStopped: any = null;
      public speechStartDetected: any = null;
      public speechEndDetected: any = null;
      constructor() {
        this.canceled = null;
        this.recognized = null;
        this.recognizing = null;
        this.sessionStarted = null;
        this.sessionStopped = null;
        this.speechStartDetected = null;
        this.speechEndDetected = null;
      }
      startContinuousRecognitionAsync(success: () => void) { setTimeout(success, 10); }
      stopContinuousRecognitionAsync(success: () => void) { setTimeout(success, 10); }
      close() {}
      recognizeOnceAsync(success: (result: any) => void) { setTimeout(() => success({}), 10); }
    },
    PronunciationAssessmentResult: class {
      static fromResult() { return { pronunciationScore: 100, accuracyScore: 100, fluencyScore: 100, completenessScore: 100 }; }
    },
    ResultReason: {
      RecognizingSpeech: 'RecognizingSpeech',
      RecognizedSpeech: 'RecognizedSpeech',
      NoMatch: 'NoMatch',
    },
    CancellationReason: {
      Error: 'Error',
    },
  }));
}

/**
 * Opens a WebSocket connection and tracks it for teardown.
 * @param wsList Array to track open WebSockets for cleanup.
 * @param WS_URL The WebSocket server URL.
 * @returns The opened WebSocket instance.
 */
export async function openTestWebSocket(
  wsList: import('ws').WebSocket[],
  WS_URL: string
): Promise<import('ws').WebSocket> {
  const { WebSocket } = await import('ws');
  const ws = new WebSocket(WS_URL);
  wsList.push(ws);
  return ws;
}

/**
 * Waits for a WebSocket to receive a message matching a predicate.
 * @param ws The WebSocket instance.
 * @param predicate Function to test each message.
 * @param timeoutMs Timeout in milliseconds.
 * @returns The matching message.
 */
export function waitForMessage(
  ws: import('ws').WebSocket,
  predicate: (msg: any) => boolean,
  timeoutMs = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error('Timeout waiting for WebSocket message'));
    }, timeoutMs);

    function onMessage(data: Buffer) {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        // ignore parse errors
        return;
      }
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off('message', onMessage);
        resolve(msg);
      }
    }
    ws.on('message', onMessage);
  });
}

/**
 * Sets up all mocks and imports the server only after mocks are in place.
 * Returns the server control functions (startTestServer, stopTestServer).
 */
export async function setupTestServer() {
  mockFirebase();
  mockAzureSDK();
  // Import the server only after all mocks are in place
  const serverModule = await import('../../src/server.js');
  return {
    startTestServer: serverModule.startTestServer,
    stopTestServer: serverModule.stopTestServer,
  };
} 