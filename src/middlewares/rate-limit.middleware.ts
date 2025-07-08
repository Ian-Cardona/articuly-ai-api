import { MESSAGE_LIMIT, TIME_WINDOW_MS, MAX_AUDIO_KB_PER_WINDOW } from '../constants/rate_limit.constant.ts';

import type { AuthenticatedWebSocket } from '../types/websocket.type.ts';
import type { RateLimitState, AudioDataMessage } from '../types/middleware.type.ts';

// Module-level state
const state: RateLimitState = {
  messageTimestamps: new WeakMap(),
  audioDataSizes: new WeakMap(),
};

function isAudioDataMessage(msg: unknown): msg is AudioDataMessage {
  if (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    'audioBase64' in msg
  ) {
    const m = msg as Record<string, unknown>;
    return m.type === 'audioData' && typeof m.audioBase64 === 'string';
  }
  return false;
}

function slidingWindow<T>(timestamps: number[], values: T[], now: number, windowMs: number): { timestamps: number[]; values: T[] } {
  const validIndices = timestamps
    .map((ts, i) => now - ts < windowMs ? i : -1)
    .filter(i => i !== -1);
  return {
    timestamps: validIndices.map(i => timestamps[i]),
    values: validIndices.map(i => values[i]),
  };
}

/**
 * Initialize rate limiting for a new WebSocket connection
 */
export function initializeConnection(ws: AuthenticatedWebSocket): void {
  state.messageTimestamps.set(ws, []);
  state.audioDataSizes.set(ws, { timestamps: [], sizes: [] });
}

/**
 * Clean up rate limiting data for a closed connection
 */
export function cleanupConnection(ws: AuthenticatedWebSocket): void {
  state.messageTimestamps.delete(ws);
  state.audioDataSizes.delete(ws);
}

/**
 * Check message rate limit
 */
export function checkMessageRateLimit(ws: AuthenticatedWebSocket): { allowed: boolean; error?: string } {
  const now = Date.now();
  const timestamps = state.messageTimestamps.get(ws) ?? [];
  const { timestamps: recentTimestamps } = slidingWindow(timestamps, timestamps, now, TIME_WINDOW_MS);

  recentTimestamps.push(now);
  state.messageTimestamps.set(ws, recentTimestamps);

  if (recentTimestamps.length > MESSAGE_LIMIT) {
    return {
      allowed: false,
      error: `Rate limit exceeded: Max ${MESSAGE_LIMIT} messages per ${TIME_WINDOW_MS / 1000} seconds.`,
    };
  }

  return { allowed: true };
}

/**
 * Check audio data rate limit
 */
export function checkAudioDataRateLimit(ws: AuthenticatedWebSocket, audioBase64: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  let audioBuffer: Buffer | null = null;

  try {
    audioBuffer = Buffer.from(audioBase64, 'base64');
  } catch {
    audioBuffer = null;
  }

  if (!audioBuffer) {
    return { allowed: true }; // Skip rate limiting for invalid audio data
  }

  const audioDataSizes = state.audioDataSizes.get(ws) ?? { timestamps: [], sizes: [] };
  const sw = slidingWindow(audioDataSizes.timestamps, audioDataSizes.sizes, now, TIME_WINDOW_MS);

  audioDataSizes.timestamps = sw.timestamps;
  audioDataSizes.sizes = sw.values;

  const audioSizeKB = audioBuffer.length / 1024;
  audioDataSizes.timestamps.push(now);
  audioDataSizes.sizes.push(audioSizeKB);

  state.audioDataSizes.set(ws, audioDataSizes);

  const totalAudioKB = audioDataSizes.sizes.reduce((a, b) => a + b, 0);
  if (totalAudioKB > MAX_AUDIO_KB_PER_WINDOW) {
    return {
      allowed: false,
      error: `Audio data rate limit exceeded: Max ${MAX_AUDIO_KB_PER_WINDOW} KB per ${TIME_WINDOW_MS / 1000} seconds.`,
    };
  }

  return { allowed: true };
}

/**
 * Check rate limits for a message
 */
export function checkRateLimits(ws: AuthenticatedWebSocket, message: string): { allowed: boolean; error?: string } {
  // Check message rate limit
  const messageLimitCheck = checkMessageRateLimit(ws);
  if (!messageLimitCheck.allowed) {
    return messageLimitCheck;
  }

  // Check audio data rate limit if applicable
  try {
    const parsedMessage = JSON.parse(message) as unknown;
    if (isAudioDataMessage(parsedMessage)) {
      const audioLimitCheck = checkAudioDataRateLimit(ws, parsedMessage.audioBase64);
      if (!audioLimitCheck.allowed) {
        return audioLimitCheck;
      }
    }
  } catch {
    // Ignore parse errors, let validation handle them
  }

  return { allowed: true };
}
