import { readFileSync } from 'fs';

import admin, { type ServiceAccount } from 'firebase-admin';

import { config } from '../config/index.ts';

const serviceAccount: ServiceAccount = JSON.parse(
  readFileSync(config.firebaseServiceAccountPath, 'utf8'),
) as ServiceAccount;

const app = admin.apps.length === 0
  ? admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: config.firebaseProjectId || process.env.FIREBASE_PROJECT_ID,
  })
  : admin.apps[0] ?? undefined;

export const auth = admin.auth(app);

/**
 * Verifies a Firebase ID token.
 * @param idToken - The ID token string received from the client.
 * @returns A promise that resolves with the decoded ID token.
 */
export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw new Error('Invalid or expired ID token.');
  }
}

export default app;
