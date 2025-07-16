import type WS from 'ws';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { openTestWebSocket, waitForMessage, setupTestServer } from './helpers/test-setup.js';

let wsList: WS[] = [];
let startTestServer: (port?: number) => Promise<{ port: number }>;
let stopTestServer: () => Promise<void>;
let MESSAGE_LIMIT: number;
let WS_URL: string;
let ws: WS | undefined;

async function openWS() {
  return await openTestWebSocket(wsList, WS_URL);
}

describe('WebSocket Session & Rate Limiting Integration', () => {
  beforeAll(async () => {
    const serverSetup = await setupTestServer();
    startTestServer = serverSetup.startTestServer;
    stopTestServer = serverSetup.stopTestServer;
    ({ MESSAGE_LIMIT } = await import('../src/constants/rate_limit.constant.ts'));
    const { port } = await startTestServer(0);
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

  afterEach(async () => {
    if (ws && ws.readyState === ws.OPEN) {
      await new Promise<void>(resolve => {
        ws!.once('close', () => resolve());
        ws!.close();
      });
    }
  });

  it('should allow session start after authentication', async () => {
    ws = await openWS();
    await new Promise((resolve) => ws!.on('open', resolve));
    ws!.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
    await waitForMessage(ws, msg => msg.type === 'auth_success');
    const expectedText = 'Test 0';
    ws!.send(JSON.stringify({ type: 'startSession', payload: { type: 'startSession', exerciseText: expectedText } }));
    const sessionMsg = await waitForMessage(ws, msg => msg.message === 'Session started successfully' || msg.type === 'error', 10000);
    expect(sessionMsg.message).toBe('Session started successfully');
    expect(sessionMsg.exerciseConfig).toBeDefined();
    expect(sessionMsg.exerciseConfig.exerciseType).toBe('tongueTwister');
    expect(sessionMsg.exerciseConfig.expectedText).toBe(expectedText);
    expect(sessionMsg.exerciseConfig.expectedWords).toEqual(['test', '0']);
  });

  it('should enforce message rate limiting', async () => {
    ws = await openWS();
    await new Promise((resolve) => ws!.on('open', resolve));
    ws!.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
    await waitForMessage(ws, msg => msg.type === 'auth_success');
    
    // Send valid messages rapidly to exceed the rate limit
    const promises: Promise<void>[] = [];
    for (let i = 0; i < MESSAGE_LIMIT + 5; i++) {
      promises.push(new Promise<void>((resolve) => {
        setTimeout(() => {
          // Use a valid message type that will pass validation
          ws!.send(JSON.stringify({ 
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
    await new Promise((resolve) => ws!.on('open', resolve));
    // Authenticate first
    ws!.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
    await waitForMessage(ws, msg => msg.type === 'auth_success');
    // Start session first
    const expectedText = 'Terrific trolley treats trigger tremendously thankful, thoughtful, thorough testimonials.';
    ws!.send(JSON.stringify({ type: 'startSession', payload: { type: 'startSession', exerciseText: expectedText } }));
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
      ws!.send(JSON.stringify(msg));
    }
    
    const errorMsg = await waitForMessage(ws, msg => msg.type === 'ERROR' && msg.payload.message.includes('Audio data rate limit exceeded'), 20000);
    expect(errorMsg.payload.message).toContain('Audio data rate limit exceeded');
  });

  it('should handle audio streaming: happy path', async () => {
    ws = await openWS();
    await new Promise((resolve) => ws!.on('open', resolve));
    ws!.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
    await waitForMessage(ws, msg => msg.type === 'auth_success');
    const expectedText = 'She sells seashells by the seashore';
    ws!.send(JSON.stringify({ type: 'startSession', payload: { type: 'startSession', exerciseText: expectedText } }));
    await waitForMessage(ws, msg => msg.message === 'Session started successfully', 10000);
    // Send valid audio data
    const audioBase64 = Buffer.from('test audio').toString('base64');
    ws!.send(JSON.stringify({ type: 'audioData', payload: { type: 'audioData', audioBase64 } }));
    // Expect feedback (mocked)
    const feedbackMsg = await waitForMessage(ws, msg => msg.type === 'pronunciationFeedback' || msg.type === 'feedback' || msg.type === 'AUDIO_FEEDBACK', 10000);
    expect(['pronunciationFeedback', 'feedback', 'AUDIO_FEEDBACK']).toContain(feedbackMsg.type);
  });

  it('should reject malformed audio data', async () => {
    ws = await openWS();
    await new Promise((resolve) => ws!.on('open', resolve));
    ws!.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
    await waitForMessage(ws, msg => msg.type === 'auth_success');
    const expectedText = 'How much wood would a woodchuck chuck';
    ws!.send(JSON.stringify({ type: 'startSession', payload: { type: 'startSession', exerciseText: expectedText } }));
    await waitForMessage(ws, msg => msg.message === 'Session started successfully', 10000);
    // Send malformed audio (missing audioBase64)
    ws!.send(JSON.stringify({ type: 'audioData', payload: { type: 'audioData' } }));
    const errorMsg = await waitForMessage(ws, msg => msg.type === 'ERROR' && msg.payload.message && msg.payload.message.toLowerCase().includes('audio'), 20000);
    expect(errorMsg.payload.message.toLowerCase()).toContain('audio');
  });

  it('should reject audio data before session is started', async () => {
    ws = await openWS();
    await new Promise((resolve) => ws!.on('open', resolve));
    ws!.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
    await waitForMessage(ws, msg => msg.type === 'auth_success');
    // Send audio data before starting session
    const audioBase64 = Buffer.from('test audio').toString('base64');
    ws!.send(JSON.stringify({ type: 'audioData', payload: { type: 'audioData', audioBase64 } }));
    const errorMsg = await waitForMessage(ws, msg => msg.type === 'ERROR' && msg.payload.message && msg.payload.message.toLowerCase().includes('session'), 20000);
    expect(errorMsg.payload.message.toLowerCase()).toContain('session');
  });

  it('should reject audio data before authentication', async () => {
    ws = await openWS();
    await new Promise((resolve) => ws!.on('open', resolve));
    // Send audio data before authenticating
    const audioBase64 = Buffer.from('test audio').toString('base64');
    ws!.send(JSON.stringify({ type: 'audioData', payload: { type: 'audioData', audioBase64 } }));
    const errorMsg = await waitForMessage(ws, msg => msg.type === 'ERROR' && msg.payload.message && (msg.payload.message.toLowerCase().includes('auth') || msg.payload.message.toLowerCase().includes('unauthorized')), 20000);
    expect(
      errorMsg.payload.message.toLowerCase().includes('auth') ||
      errorMsg.payload.message.toLowerCase().includes('unauthorized')
    ).toBe(true);
  });

  it('should handle multiple valid audio chunks', async () => {
    ws = await openWS();
    await new Promise((resolve) => ws!.on('open', resolve));
    ws!.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
    await waitForMessage(ws, msg => msg.type === 'auth_success');
    const expectedText = 'Peter Piper picked a peck of pickled peppers';
    ws!.send(JSON.stringify({ type: 'startSession', payload: { type: 'startSession', exerciseText: expectedText } }));
    await waitForMessage(ws, msg => msg.message === 'Session started successfully', 10000);
    // Send multiple valid audio chunks
    const audioBase64 = Buffer.from('test audio').toString('base64');
    for (let i = 0; i < 3; i++) {
      ws!.send(JSON.stringify({ type: 'audioData', payload: { type: 'audioData', audioBase64 } }));
    }
    // Expect at least one feedback message and no errors
    const feedbackMsg = await waitForMessage(ws, msg => msg.type === 'pronunciationFeedback' || msg.type === 'feedback' || msg.type === 'AUDIO_FEEDBACK', 20000);
    expect(['pronunciationFeedback', 'feedback', 'AUDIO_FEEDBACK']).toContain(feedbackMsg.type);
  });
}); 