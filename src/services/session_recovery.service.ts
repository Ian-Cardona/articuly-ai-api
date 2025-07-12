import { sessionUtils } from '../utils/session.utils.ts';

import { sessionStoreManager } from './session_store.service.ts';
import { azureSpeechService } from './azure_speech.service.ts';

import type { AuthenticatedWebSocket } from '../types/websocket.type.ts';
import type { ReconnectPayload } from '../types/websocket.type.ts';
import type { AudioSession, ExerciseConfig } from '../types/session.type.ts';
import type { RecoveryResult } from '../types/session_recovery.type.ts';

export class SessionRecoveryService {
  /**
   * Handle reconnection attempt for a user
   */
  async handleReconnection(ws: AuthenticatedWebSocket, payload: ReconnectPayload): Promise<RecoveryResult> {
    try {
      // Validate payload
      if (!payload.idToken) {
        return {
          success: false,
          sessionRestored: false,
          sessionId: '',
          error: 'Missing authentication token',
        };
      }

      // Check if user has an existing session
      const existingSession = sessionStoreManager.getSession(ws.userId ?? '');

      if (!existingSession) {
        return {
          success: true,
          sessionRestored: false,
          sessionId: this.generateSessionId(),
          error: 'No existing session found',
        };
      }

      // Check if session was active and can be restored
      if (existingSession.state.isActive && existingSession.state.exerciseConfig) {
        return await this.restoreActiveSession(ws, existingSession);
      } else {
        // Session exists but was not active - return session info without restoration
        return {
          success: true,
          sessionRestored: false,
          sessionId: this.generateSessionId(),
          exerciseConfig: existingSession.state.exerciseConfig ?? undefined,
        };
      }
    } catch (error) {
      console.error(`Error handling reconnection for user ${ws.userId}:`, error);
      return {
        success: false,
        sessionRestored: false,
        sessionId: '',
        error: error instanceof Error ? error.message : 'Unknown error during reconnection',
      };
    }
  }

  /**
   * Restore an active session with Azure connection
   */
  private async restoreActiveSession(ws: AuthenticatedWebSocket, session: AudioSession): Promise<RecoveryResult> {
    try {
      const exerciseConfig = session.state.exerciseConfig;

      if (!exerciseConfig) {
        return {
          success: false,
          sessionRestored: false,
          sessionId: this.generateSessionId(),
          error: 'No exercise configuration found in active session',
        };
      }

      // Re-establish Azure connection
      await azureSpeechService.createAzureConnection(ws, exerciseConfig.expectedText);

      // Get the updated session with new Azure connection
      const updatedSession = sessionStoreManager.getSession(ws.userId ?? '');
      if (!updatedSession) {
        return {
          success: false,
          sessionRestored: false,
          sessionId: this.generateSessionId(),
          error: 'Session not found after Azure connection creation',
        };
      }

      // Check if Azure connection was successfully established
      if (!updatedSession.azureRecognizer || !updatedSession.azurePushStream) {
        return {
          success: false,
          sessionRestored: false,
          sessionId: this.generateSessionId(),
          error: 'Azure connection not available after restoration',
        };
      }

      // Mark session as restored with the new Azure connection
      const restoredSession = sessionUtils.setAzureConnection({
        session: updatedSession,
        recognizer: updatedSession.azureRecognizer,
        pushStream: updatedSession.azurePushStream,
      });

      if (ws.userId) {
        sessionStoreManager.setSession(ws.userId, restoredSession);
      }

      console.log(`Session restored for user ${ws.userId} with exercise: "${exerciseConfig.expectedText}"`);

      return {
        success: true,
        sessionRestored: true,
        exerciseConfig,
        sessionId: this.generateSessionId(),
      };
    } catch (error) {
      console.error(`Error restoring session for user ${ws.userId}:`, error);

      // If Azure connection fails, stop the session to prevent inconsistent state
      try {
        const stoppedSession = sessionUtils.stopSession(session);
        if (ws.userId) {
          sessionStoreManager.setSession(ws.userId, stoppedSession);
        }
      } catch (stopError) {
        console.error(`Error stopping session after restoration failure for user ${ws.userId}:`, stopError);
      }

      return {
        success: false,
        sessionRestored: false,
        sessionId: this.generateSessionId(),
        error: `Failed to restore Azure connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if a session can be recovered
   */
  canRecoverSession(userId: string): boolean {
    const session = sessionStoreManager.getSession(userId);
    return session !== null && session.state.isActive && session.state.exerciseConfig !== null;
  }

  /**
   * Get recovery information for a user
   */
  getRecoveryInfo(userId: string): { canRecover: boolean; exerciseConfig?: ExerciseConfig } {
    const session = sessionStoreManager.getSession(userId);
    if (!session) {
      return { canRecover: false };
    }

    return {
      canRecover: session.state.isActive && session.state.exerciseConfig !== null,
      exerciseConfig: session.state.exerciseConfig ?? undefined,
    };
  }

  /**
   * Generate a unique session ID for tracking
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up recovery state for a user
   */
  cleanupRecoveryState(userId: string): void {
    // This could be extended to clean up any recovery-specific state
    // For now, we rely on the existing session cleanup mechanisms
    console.log(`Recovery state cleaned up for user ${userId}`);
  }
}

export const sessionRecoveryService = new SessionRecoveryService();
