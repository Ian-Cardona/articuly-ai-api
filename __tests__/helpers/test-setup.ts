import { vi } from 'vitest';

/**
 * Mocks Firebase Admin for all tests.
 */
export function mockFirebase(): void {
  vi.mock('firebase-admin', () => ({
    default: {
      auth: () => ({
        verifyIdToken: vi.fn(async (token: string) => {
          if (token === 'valid-token') return { uid: 'testUserId' };
          throw new Error('Invalid or expired ID token.');
        }),
      }),
      firestore: () => ({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({
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
            set: vi.fn(() => Promise.resolve()),
            update: vi.fn(() => Promise.resolve())
          }))
        }))
      }),
      initializeApp: vi.fn(),
      credential: {
        cert: vi.fn(),
        applicationDefault: vi.fn(),
      },
      apps: [],
      app: vi.fn(),
    },
    auth: () => ({
      verifyIdToken: vi.fn(async (token: string) => {
        if (token === 'valid-token') return { uid: 'testUserId' };
        throw new Error('Invalid or expired ID token.');
      }),
    }),
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve({
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
          set: vi.fn(() => Promise.resolve()),
          update: vi.fn(() => Promise.resolve())
        }))
      }))
    })),
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'valid-token') return { uid: 'testUserId' };
      throw new Error('Invalid or expired ID token.');
    }),
    initializeApp: vi.fn(),
  }));

  vi.mock('firebase-admin/firestore', () => ({
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve({
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
          set: vi.fn(() => Promise.resolve()),
          update: vi.fn(() => Promise.resolve())
        }))
      }))
    })),
    Firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve({
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
          set: vi.fn(() => Promise.resolve()),
          update: vi.fn(() => Promise.resolve())
        }))
      }))
    })),
  }));
}

/**
 * Mocks Azure Speech SDK for all tests.
 */
export function mockAzureSDK(): void {
  function createSpeechConfigMock() {
    return {
      setProperty: () => {},
    };
  }
  function createPronunciationAssessmentConfigMock() {
    return {
      applyTo: () => {},
    };
  }
  function createAudioInputStreamMock() {
    return {
      write: vi.fn(),
      close: vi.fn(),
    };
  }
  function createAudioStreamFormatMock() {
    return {};
  }
  function createAudioConfigMock() {
    return {};
  }
  function createSpeechRecognizerMock() {
    return {
      canceled: null,
      recognized: null,
      recognizing: null,
      sessionStarted: null,
      sessionStopped: null,
      speechStartDetected: null,
      speechEndDetected: null,
      startContinuousRecognitionAsync: (success: () => void) => setTimeout(success, 10),
      stopContinuousRecognitionAsync: (success: () => void) => setTimeout(success, 10),
      close: () => {},
      recognizeOnceAsync: (success: (result: any) => void) => setTimeout(() => success({}), 10),
    };
  }
  function createPronunciationAssessmentResultMock() {
    return {
      pronunciationScore: 100,
      accuracyScore: 100,
      fluencyScore: 100,
      completenessScore: 100,
    };
  }
  vi.mock('microsoft-cognitiveservices-speech-sdk', () => ({
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
    SpeechRecognizer: () => createSpeechRecognizerMock(),
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
export async function setupTestServer(): Promise<{ startTestServer: (port?: number) => Promise<{ port: number }>; stopTestServer: () => Promise<void> }> {
  mockFirebase();
  mockAzureSDK();
  // Import the server test utils only after all mocks are in place
  const serverModule = await import('./server.test-utils.ts');
  return {
    startTestServer: serverModule.startTestServer,
    stopTestServer: serverModule.stopTestServer,
  };
} 