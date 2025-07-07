import { AudioSession } from './audio_session.model.ts';

export class SessionManager {
  private sessions = new Map<string, AudioSession>();

  // Create a new session for a user
  createSession(userId: string): AudioSession {
    if (this.sessions.has(userId)) {
      throw new Error(`Session already exists for user ${userId}`);
    }

    const session = new AudioSession(userId);
    this.sessions.set(userId, session);
    return session;
  }

  // Get an existing session
  getSession(userId: string): AudioSession | null {
    return this.sessions.get(userId) ?? null;
  }

  // Get or create a session
  getOrCreateSession(userId: string): AudioSession {
    return this.getSession(userId) ?? this.createSession(userId);
  }

  // Check if a user has an active session
  hasActiveSession(userId: string): boolean {
    const session = this.getSession(userId);
    return session?.isActive ?? false;
  }

  // Stop and remove a session
  removeSession(userId: string): boolean {
    const session = this.sessions.get(userId);
    if (session) {
      session.cleanup();
      this.sessions.delete(userId);
      return true;
    }
    return false;
  }

  // Get all active sessions
  getActiveSessions(): AudioSession[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  // Get session count
  getSessionCount(): number {
    return this.sessions.size;
  }

  // Get active session count
  getActiveSessionCount(): number {
    return this.getActiveSessions().length;
  }

  // Clean up all sessions
  cleanupAllSessions(): void {
    for (const session of this.sessions.values()) {
      session.cleanup();
    }
    this.sessions.clear();
  }

  // Get session info for all sessions
  getAllSessionInfo() {
    return Array.from(this.sessions.entries()).map(([sessionUserId, session]) => {
      const sessionInfo = session.getSessionInfo();
      return {
        ...sessionInfo,
        userId: sessionUserId, // Override with the key from the map
      };
    });
  }

  // Get session info for a specific user
  getSessionInfo(userId: string) {
    const session = this.getSession(userId);
    return session ? session.getSessionInfo() : null;
  }
}
