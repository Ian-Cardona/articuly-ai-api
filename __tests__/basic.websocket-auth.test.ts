// ESM Jest mocking for verifyIdToken
import { jest } from '@jest/globals';

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

  jest.setTimeout(20000);

  let testServer: any;
  let port = 0;

  function openWS() {
    return new WebSocket(`ws://localhost:${port}`);
  }

  describe('WebSocket Authentication Integration', () => {
    let ws;

    beforeAll(async () => {
      const result = await startTestServer();
      port = result.port;
      testServer = result;
    });

    afterAll(async () => {
      await stopTestServer();
    });

    afterEach((done) => {
      if (ws && ws.readyState === ws.OPEN) {
        ws.close();
        ws.on('close', () => done());
      } else {
        done();
      }
    });

    it('should authenticate with a valid token', (done) => {
      const timer = setTimeout(() => done(new Error('Timeout')), 10000);
      ws = openWS();
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'AUTH', idToken: 'valid-token' }));
      });
      ws.on('message', (data) => {
        clearTimeout(timer);
        const msg = JSON.parse(data.toString());
        expect(msg.type).toBe('auth_success');
        expect(msg.payload.userId).toBe('testUserId');
        done();
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        done(err);
      });
    });

    it('should reject invalid token', (done) => {
      const timer = setTimeout(() => done(new Error('Timeout')), 10000);
      ws = openWS();
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'AUTH', idToken: 'invalid-token' }));
      });
      ws.on('message', (data) => {
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
      ws.on('error', (err) => {
        clearTimeout(timer);
        done(err);
      });
    });

    it('should reject messages before authentication', (done) => {
      const timer = setTimeout(() => done(new Error('Timeout')), 10000);
      ws = openWS();
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'SOME_OTHER_TYPE' }));
      });
      ws.on('message', (data) => {
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
      ws.on('error', (err) => {
        clearTimeout(timer);
        done(err);
      });
    });
  });
})(); 