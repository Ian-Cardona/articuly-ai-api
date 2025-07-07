import { jest } from '@jest/globals';

jest.unstable_mockModule('firebase-admin', () => {
  const mockAuth = {
    verifyIdToken: jest.fn(),
  };
  return {
    default: {
      apps: [],
      initializeApp: jest.fn(() => ({ auth: () => mockAuth })),
      credential: {
        cert: jest.fn(),
      },
      auth: jest.fn(() => mockAuth),
    },
    auth: jest.fn(() => mockAuth),
    credential: {
      cert: jest.fn(),
    },
    apps: [],
  };
});

let verifyIdToken: typeof import('../../src/firebase/firebase_admin').verifyIdToken;
let auth: any;

describe('Firebase Authentication Backend', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const firebaseAdmin = await import('../../src/firebase/firebase_admin');
    verifyIdToken = firebaseAdmin.verifyIdToken;
    auth = firebaseAdmin.auth;
  });

  it('should successfully verify a valid ID token', async () => {
    const mockDecodedToken = {
      uid: 'testUserId123',
      email: 'test@example.com',
      aud: 'test-audience',
      auth_time: 1234567890,
      exp: 1234567890 + 3600,
      firebase: {
        sign_in_provider: 'password',
        identities: { email: ['test@example.com'] }
      },
      iat: 1234567890,
      iss: 'https://securetoken.google.com/test-project',
      sub: 'testUserId123'
    };
    (auth.verifyIdToken as jest.Mock<any>).mockResolvedValue(mockDecodedToken);

    const idToken = 'mockValidIdToken';
    const decoded = await verifyIdToken(idToken);

    expect(decoded).toEqual(mockDecodedToken);
    expect(auth.verifyIdToken).toHaveBeenCalledTimes(1);
    expect(auth.verifyIdToken).toHaveBeenCalledWith(idToken);
  });

  it('should throw an error for an invalid ID token', async () => {
    const errorMessage = 'Firebase ID token has invalid signature.';
    (auth.verifyIdToken as jest.Mock<any>).mockRejectedValue(new Error(errorMessage));

    const idToken = 'mockInvalidIdToken';

    await expect(verifyIdToken(idToken)).rejects.toThrow('Invalid or expired ID token.');
    expect(auth.verifyIdToken).toHaveBeenCalledTimes(1);
    expect(auth.verifyIdToken).toHaveBeenCalledWith(idToken);
  });
});