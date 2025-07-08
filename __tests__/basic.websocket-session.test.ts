// ESM Jest mocking for verifyIdToken and Azure SDK
import { jest } from '@jest/globals';
import { mockFirebase, mockAzureSDK, openTestWebSocket, waitForMessage, setupTestServer } from './helpers/test-setup.js';

jest.setTimeout(20000);

let wsList: import('ws').WebSocket[] = [];
let startTestServer: (port?: number) => Promise<{ port: number }>;
let stopTestServer: () => Promise<void>;
let MESSAGE_LIMIT: number;
let MAX_AUDIO_KB_PER_WINDOW: number;
let WS_URL: string;

async function openWS() {
  const ws = await openTestWebSocket(wsList, WS_URL);
  ws.on('message', data => {
    try {
      console.log('WS MSG:', data.toString());
    } catch (e) {
      console.log('WS MSG (non-string):', data);
    }
  });
  return ws;
}

describe('WebSocket Session & Rate Limiting Integration', () => {
  let ws;

  beforeAll(async () => {
    // Set up all mocks and import server only after mocks are in place
    const serverSetup = await setupTestServer();
    startTestServer = serverSetup.startTestServer;
    stopTestServer = serverSetup.stopTestServer;
    ({ MESSAGE_LIMIT, MAX_AUDIO_KB_PER_WINDOW } = await import('../src/constants/rate_limit.constant.ts'));
    const { port } = await startTestServer(0); // use random available port
    WS_URL = `ws://localhost:${port}`;
  });

  afterAll(async () => {
    let closed = 0;
    if (wsList.length === 0) {
      await stopTestServer();
      return;
    }
    await Promise.all(wsList.map(ws => {
      return new Promise<void>(resolve => {
        if (ws.readyState === ws.OPEN) {
          ws.close();
          ws.on('close', () => {
            closed++;
            if (closed === wsList.length) {
              stopTestServer().then(resolve);
            } else {
              resolve();
            }
          });
        } else {
          closed++;
          if (closed === wsList.length) {
            stopTestServer().then(resolve);
          } else {
            resolve();
          }
        }
      });
    }));
  });

  afterEach((done) => {
    if (ws && ws.readyState === ws.OPEN) {
      ws.close();
      ws.on('close', () => done());
    } else {
      done();
    }
  });

  it('should allow session start after authentication', async () => {
    ws = await openWS();
    await new Promise((resolve) => ws.on('open', resolve));
    ws.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
    await waitForMessage(ws, msg => msg.type === 'auth_success');
    const expectedText = 'Test 0';
    ws.send(JSON.stringify({ type: 'startSession', payload: { type: 'startSession', exerciseText: expectedText } }));
    const sessionMsg = await waitForMessage(ws, msg => msg.message === 'Session started successfully' || msg.type === 'error', 10000);
    expect(sessionMsg.message).toBe('Session started successfully');
    expect(sessionMsg.exerciseConfig).toBeDefined();
    expect(sessionMsg.exerciseConfig.exerciseType).toBe('tongueTwister');
    expect(sessionMsg.exerciseConfig.expectedText).toBe(expectedText);
    expect(sessionMsg.exerciseConfig.expectedWords).toEqual(['test', '0']);
  });

  it('should enforce message rate limiting', async () => {
    ws = await openWS();
    await new Promise((resolve) => ws.on('open', resolve));
    ws.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
    await waitForMessage(ws, msg => msg.type === 'auth_success');
    
    // Send valid messages rapidly to exceed the rate limit
    const promises: Promise<void>[] = [];
    for (let i = 0; i < MESSAGE_LIMIT + 5; i++) {
      promises.push(new Promise<void>((resolve) => {
        setTimeout(() => {
          // Use a valid message type that will pass validation
          ws.send(JSON.stringify({ 
            type: 'stopSession', 
            payload: { type: 'stopSession' } 
          }));
          resolve();
        }, i * 10); // Small delay to ensure messages are processed
      }));
    }
    await Promise.all(promises);
    
    const errorMsg = await waitForMessage(ws, msg => msg.type === 'ERROR' && msg.payload.details?.errorDetails?.includes('Rate limit exceeded'), 10000);
    expect(errorMsg.payload.details.errorDetails).toContain('Rate limit exceeded');
  });

  it('should enforce audio data rate limiting', async () => {
    ws = await openWS();
    await new Promise((resolve) => ws.on('open', resolve));
    // Authenticate first
    ws.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
    await waitForMessage(ws, msg => msg.type === 'auth_success');
    // Start session first
    const expectedText = 'Terrific trolley treats trigger tremendously thankful, thoughtful, thorough testimonials.';
    ws.send(JSON.stringify({ type: 'startSession', payload: { type: 'startSession', exerciseText: expectedText } }));
    await waitForMessage(ws, msg => msg.message === 'Session started successfully', 10000);
    
    // Send large audio chunks to exceed the rate limit
    const chunkSize = 1024 * 200; // 200KB per chunk (close to the 500KB limit)
    const chunk = Buffer.alloc(chunkSize, 1).toString('base64');
    
    // Send 3 chunks to exceed the 500KB limit
    for (let i = 0; i < 3; i++) {
      const msg = {
        type: 'audioData',
        payload: {
          type: 'audioData',
          audioBase64: chunk
        }
      };
      ws.send(JSON.stringify(msg));
    }
    
    const errorMsg = await waitForMessage(ws, msg => msg.type === 'ERROR' && msg.payload.message.includes('Audio data rate limit exceeded'), 10000);
    expect(errorMsg.payload.message).toContain('Audio data rate limit exceeded');
  });
}); 