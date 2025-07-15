import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import './helpers/firestore-mock.js';
import { setFirestoreDoc } from './helpers/firestore-mock.js';
import type WS from 'ws';

vi.mock('../src/firebase/firebase_admin.ts', () => ({
  verifyIdToken: vi.fn(async (token) => {
    if (token === 'valid-token') return { uid: 'testUserId' };
    throw new Error('Invalid or expired ID token.');
  })
}));

// All other imports and test code must be inside an async IIFE
await (async () => {
  const { WebSocket } = await import('ws');
  const { startTestServer, stopTestServer } = await import('../src/server.js');

  let port = 0;

  function openWS(): WS {
    return new WebSocket(`ws://localhost:${port}`) as WS;
  }

  // Pre-populate Firestore mock with test user before all tests
  beforeAll(() => {
    setFirestoreDoc('users', 'testUserId', {
      userId: 'testUserId',
      email: 'test@gmail.com',
      displayName: 'Test User',
      photoURL: '',
      dailyLimit: 2,
      attemptsToday: 0,
      lastAttemptDate: new Date().toISOString(),
      totalSessions: 0,
      subscription: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    });
  });

  describe('WebSocket Authentication Integration', () => {
    let ws: WS | undefined;

    beforeAll(async () => {
      const result = await startTestServer();
      port = result.port;
    });

    afterAll(async () => {
      await stopTestServer();
    });

    afterEach(async () => {
      if (ws && ws.readyState === ws.OPEN) {
        await new Promise<void>(resolve => {
          ws!.once('close', () => resolve());
          ws!.close();
        });
      }
    });

    it('should authenticate with a valid token', async () => {
      ws = openWS();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), 10000);
        ws!.once('open', () => {
          ws!.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
        });
        ws!.on('message', (data: WS.RawData) => {
          clearTimeout(timer);
          const msg = JSON.parse(data.toString());
          try {
            expect(msg.type).toBe('auth_success');
            expect(msg.payload.userId).toBe('testUserId');
            resolve();
          } catch (err) {
            reject(err);
          }
        });
        ws!.once('error', (err: Error) => {
          clearTimeout(timer);
          reject(err);
        });
      });
    });

    it('should reject invalid token', async () => {
      ws = openWS();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), 10000);
        ws!.once('open', () => {
          ws!.send(JSON.stringify({ type: 'AUTH', idToken: 'invalid-token' }));
        });
        ws!.on('message', (data: WS.RawData) => {
          clearTimeout(timer);
          const msg = JSON.parse(data.toString());
          try {
            expect(msg.type).toBe('ERROR');
            expect([
              'Authentication failed',
              'Unauthorized access',
            ]).toContain(msg.payload.message);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
        ws!.once('error', (err: Error) => {
          clearTimeout(timer);
          reject(err);
        });
      });
    });

    it('should reject messages before authentication', async () => {
      ws = openWS();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), 10000);
        ws!.once('open', () => {
          ws!.send(JSON.stringify({ type: 'SOME_OTHER_TYPE' }));
        });
        ws!.on('message', (data: WS.RawData) => {
          clearTimeout(timer);
          const msg = JSON.parse(data.toString());
          try {
            expect(msg.type).toBe('ERROR');
            expect([
              'Authentication required',
              'Unauthorized access',
            ]).toContain(msg.payload.message);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
        ws!.once('error', (err: Error) => {
          clearTimeout(timer);
          reject(err);
        });
      });
    });
  });
})(); 