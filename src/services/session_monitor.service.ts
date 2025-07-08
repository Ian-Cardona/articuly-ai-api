import { sessionStoreManager } from '../services/session_store.service.ts';

import type { SessionInfoWithDuration, SessionStats } from '../types/session_monitor.type.ts';

// Get session statistics
export function getSessionStats(): SessionStats {
  return {
    totalSessions: sessionStoreManager.getSessionCount(),
    activeSessions: sessionStoreManager.getActiveSessionCount(),
    allSessions: sessionStoreManager.getAllSessionInfo(),
  };
}

// Get session info for a specific user
export function getUserSessionInfo(userId: string) {
  return sessionStoreManager.getSession(userId);
}

// Check if user has active session
export function hasUserActiveSession(userId: string): boolean {
  const session = sessionStoreManager.getSession(userId);
  return session?.state.isActive ?? false;
}

// Get or create session for user
export function getOrCreateUserSession(userId: string) {
  return sessionStoreManager.getSession(userId);
}

// Remove user session
export function removeUserSession(userId: string): boolean {
  return sessionStoreManager.removeSession(userId);
}

// Clean up all sessions (useful for server shutdown)
export function cleanupAllSessions(): void {
  sessionStoreManager.cleanupAllSessions();
}

// Get active sessions with duration
export function getActiveSessionsWithDuration(): SessionInfoWithDuration[] {
  return sessionStoreManager.getActiveSessions().map(session => {
    const info = sessionStoreManager.getAllSessionInfo().find(s => s.userId === session.userId);
    return {
      ...info,
      durationInSeconds: info?.duration ? Math.round(info.duration / 1000) : 0,
    } as SessionInfoWithDuration;
  });
}

// Log session statistics
export function logSessionStats(): void {
  const stats = getSessionStats();
  console.log('=== Session Statistics ===');
  console.log(`Total Sessions: ${stats.totalSessions}`);
  console.log(`Active Sessions: ${stats.activeSessions}`);

  if (stats.activeSessions > 0) {
    console.log('\nActive Sessions:');
    getActiveSessionsWithDuration().forEach(session => {
      console.log(`  - User: ${session.userId}`);
      console.log(`    Exercise: "${session.exerciseConfig?.expectedText}"`);
      console.log(`    Duration: ${session.durationInSeconds}s`);
      console.log(`    Next Word Index: ${session.nextWordToConfirmIndex}`);
    });
  }
  console.log('========================\n');
}
