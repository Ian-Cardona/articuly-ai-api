// Global mock for firebase-admin
const mockVerifyIdToken = jest.fn(async (token) => {
  if (token === 'valid-token') {
    return { uid: 'testUserId' };
  }
  throw new Error('Invalid or expired ID token.');
});

const mockAuth = {
  verifyIdToken: mockVerifyIdToken,
};

const mockFirestore = {
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
};

const mockGetFirestore = jest.fn(() => mockFirestore);

// Create the main mock object
const firebaseAdminMock = {
  auth: mockAuth,
  getFirestore: mockGetFirestore,
  verifyIdToken: mockVerifyIdToken,
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
    applicationDefault: jest.fn(),
  },
  firestore: jest.fn(() => mockFirestore),
  apps: [],
  app: jest.fn(),
};

// Export for CommonJS
module.exports = firebaseAdminMock;

// Export for ESM
module.exports.default = firebaseAdminMock; 