import { verifyIdToken } from '../firebase/firebase_admin.ts';
import { userProfileService } from '../services/user_profile.service.ts';

import type { AuthMessage, AuthStateWebSocket as BaseAuthStateWebSocket } from '../types/middleware.type.ts';
import type { UserAccount } from '../types/user.type.ts';

// Extend AuthStateWebSocket to include userProfile
interface AuthStateWebSocket extends BaseAuthStateWebSocket {
  userProfile?: UserAccount;
}

/**
 * Validate authentication message format
 */
function validateAuthMessage(parsed: unknown): parsed is AuthMessage {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    (parsed as { type?: string }).type === 'AUTH' &&
    typeof (parsed as { idToken?: unknown }).idToken === 'string'
  );
}

/**
 * Authenticate WebSocket connection with Firebase token
 */
export async function authenticateConnection(ws: AuthStateWebSocket, data: Buffer): Promise<{ success: boolean; error?: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data.toString('utf-8'));
  } catch {
    return { success: false, error: 'Invalid JSON format' };
  }

  if (!validateAuthMessage(parsed)) {
    return { success: false, error: 'Authentication required as first message' };
  }

  try {
    const decoded = await verifyIdToken(parsed.idToken);
    ws.userId = decoded.uid;
    ws.isAuthenticated = true;

    // Create or load user profile from Firestore
    const userResult = await userProfileService.getOrCreateUser(
      decoded.uid,
      decoded.email ?? '',
      decoded.name ?? '',
      decoded.picture ?? undefined,
    );
    if (!userResult.success || !userResult.user) {
      return { success: false, error: userResult.error ?? 'Failed to load user profile' };
    }
    ws.userProfile = userResult.user;
    return { success: true };
  } catch {
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Check if WebSocket is authenticated
 */
export function isAuthenticated(ws: AuthStateWebSocket): boolean {
  return ws.isAuthenticated === true && !!ws.userId;
}

/**
 * Require authentication for a message handler
 */
export function requireAuth(ws: AuthStateWebSocket): { authenticated: boolean; error?: string } {
  if (!isAuthenticated(ws)) {
    return { authenticated: false, error: 'Authentication required' };
  }
  return { authenticated: true };
}
