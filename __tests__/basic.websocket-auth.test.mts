import './helpers/firestore-mock.js';
import { setFirestoreDoc } from './helpers/firestore-mock.js';
import { jest } from '@jest/globals';
import type WS from 'ws';

jest.unstable_mockModule('../src/firebase/firebase_admin.ts', () => ({
  verifyIdToken: jest.fn(async (token) => {
    if (token === 'valid-token') return { uid: 'testUserId' };
    throw new Error('Invalid or expired ID token.');
  })
}));

// All other imports and test code must be inside an async IIFE
await (async () => {
  const { WebSocket } = await import('ws');
  const { startTestServer, stopTestServer } = await import('../src/server.js');

  // jest.setTimeout(20000);

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

    afterEach((done) => {
      if (ws && ws.readyState === ws.OPEN) {
        ws.close();
        ws.once('close', () => done());
      } else {
        done();
      }
    });

    it('should authenticate with a valid token', (done) => {
      const timer = setTimeout(() => done(new Error('Timeout')), 10000);
      ws = openWS();
      ws.once('open', () => {
        ws!.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
      });
      ws.on('message', (data: WS.RawData) => {
        clearTimeout(timer);
        const msg = JSON.parse(data.toString());
        expect(msg.type).toBe('auth_success');
        expect(msg.payload.userId).toBe('testUserId');
        done();
      });
      ws.once('error', (err: Error) => {
        clearTimeout(timer);
        done(err);
      });
    });

    it('should reject invalid token', (done) => {
      const timer = setTimeout(() => done(new Error('Timeout')), 10000);
      ws = openWS();
      ws.once('open', () => {
        ws!.send(JSON.stringify({ type: 'AUTH', idToken: 'invalid-token' }));
      });
      ws.on('message', (data: WS.RawData) => {
        clearTimeout(timer);
        const msg = JSON.parse(data.toString());
        expect(msg.type).toBe('ERROR');
        // Accept either 'Authentication failed' or 'Unauthorized access' as valid error messages
        expect([
          'Authentication failed',
          'Unauthorized access',
        ]).toContain(msg.payload.message);
        done();
      });
      ws.once('error', (err: Error) => {
        clearTimeout(timer);
        done(err);
      });
    });

    it('should reject messages before authentication', (done) => {
      const timer = setTimeout(() => done(new Error('Timeout')), 10000);
      ws = openWS();
      ws.once('open', () => {
        ws!.send(JSON.stringify({ type: 'SOME_OTHER_TYPE' }));
      });
      ws.on('message', (data: WS.RawData) => {
        clearTimeout(timer);
        const msg = JSON.parse(data.toString());
        expect(msg.type).toBe('ERROR');
        // Accept either 'Authentication required' or 'Unauthorized access' as valid error messages
        expect([
          'Authentication required',
          'Unauthorized access',
        ]).toContain(msg.payload.message);
        done();
      });
      ws.once('error', (err: Error) => {
        clearTimeout(timer);
        done(err);
      });
    });
  });
})(); 