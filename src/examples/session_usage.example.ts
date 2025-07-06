// Example usage of the new session management and monitoring features
import { sessionMonitor } from '../utils/session_monitor.ts';

import type { AudioSession } from '../models/audio_session.model.ts';

// Example 1: Basic session management
export function exampleBasicSessionManagement() {
  console.log('=== Basic Session Management Example ===');

  const userId = 'user123';

  // Get or create a session
  const session = sessionMonitor.getOrCreateUserSession(userId);
  console.log(`Created session for user: ${userId}`);

  // Start the session
  session.startSession('tongueTwister', 'Peter Piper picked a peck of pickled peppers');
  console.log('Session started with exercise');

  // Check session status
  console.log(`Session active: ${session.isActive}`);
  console.log(`Exercise text: "${session.exerciseConfig?.expectedText}"`);
  console.log(`Expected words: ${session.exerciseConfig?.expectedWords.join(', ')}`);

  // Simulate some word advancement
  session.advanceWordIndex();
  session.advanceWordIndex();
  console.log(`Next word index: ${session.nextWordToConfirmIndex}`);

  // Get session info
  const sessionInfo = session.getSessionInfo();
  console.log('Session info:', sessionInfo);

  // Stop the session
  session.stopSession();
  console.log(`Session active after stop: ${session.isActive}`);
  console.log(`Session duration: ${sessionInfo.duration}ms`);
}

// Example 2: Session monitoring and statistics
export function exampleSessionMonitoring() {
  console.log('\n=== Session Monitoring Example ===');

  // Create multiple sessions
  const users = ['user1', 'user2', 'user3'];

  users.forEach((userId, index) => {
    const session = sessionMonitor.getOrCreateUserSession(userId);
    session.startSession('tongueTwister', `Exercise ${index + 1} for user ${userId}`);
    console.log(`Started session for ${userId}`);
  });

  // Get session statistics
  const stats = sessionMonitor.getSessionStats();
  console.log('Session statistics:', stats);

  // Log detailed session info
  sessionMonitor.logSessionStats();

  // Get specific user session info
  const user1Info = sessionMonitor.getUserSessionInfo('user1');
  console.log('User1 session info:', user1Info);

  // Check if user has active session
  console.log(`User1 has active session: ${sessionMonitor.hasUserActiveSession('user1')}`);

  // Clean up
  users.forEach(userId => {
    sessionMonitor.removeUserSession(userId);
  });

  console.log(`Sessions after cleanup: ${sessionMonitor.getSessionStats().totalSessions}`);
}

// Example 3: Error handling with new error system
export function exampleErrorHandling() {
  console.log('\n=== Error Handling Example ===');

  const userId = 'user456';
  const session = sessionMonitor.getOrCreateUserSession(userId);

  try {
    // Try to start session with invalid text
    session.startSession('tongueTwister', '');
  } catch (error) {
    console.log('Caught error:', error instanceof Error ? error.message : 'Unknown error');
  }

  try {
    // Try to validate invalid audio data
    session.validateAudioData('invalid-base64-data!');
  } catch (error) {
    console.log('Caught audio validation error:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Clean up
  sessionMonitor.removeUserSession(userId);
}

// Example 4: Integration with WebSocket controller
export function exampleWebSocketIntegration() {
  console.log('\n=== WebSocket Integration Example ===');

  // This shows how the WebSocket controller would use the session monitor
  const userId = 'websocket-user';

  // Simulate WebSocket connection
  const mockWebSocket = {
    userId,
    audioSession: undefined as AudioSession | undefined,
    send: (message: string) => {
      console.log('WebSocket message sent:', JSON.parse(message));
    },
  };

  // Get or create session (what the controller would do)
  const session = sessionMonitor.getOrCreateUserSession(userId);
  mockWebSocket.audioSession = session;

  // Start session (what the controller would do)
  session.startSession('tongueTwister', 'She sells seashells by the seashore');

  // Simulate receiving audio chunk
  try {
    session.validateAudioData('dGVzdCBhdWRpbyBkYXRh'); // "test audio data" in base64
    console.log('Audio data validated successfully');
  } catch (error) {
    console.log('Audio validation failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Clean up
  sessionMonitor.removeUserSession(userId);
}

// Run all examples
export function runAllExamples() {
  console.log('Running all session management examples...\n');

  exampleBasicSessionManagement();
  exampleSessionMonitoring();
  exampleErrorHandling();
  exampleWebSocketIntegration();

  console.log('\nAll examples completed!');
}

// Uncomment to run examples
// runAllExamples();
