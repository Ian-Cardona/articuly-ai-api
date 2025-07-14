// Mock for firebase-admin/firestore
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

module.exports = {
  getFirestore: jest.fn(() => mockFirestore),
  Firestore: jest.fn(() => mockFirestore),
}; 