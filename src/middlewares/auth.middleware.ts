import { verifyIdToken } from '../firebase/firebase_admin.ts';

import type { AuthMessage, AuthStateWebSocket } from '../types/middleware.type.ts';

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
