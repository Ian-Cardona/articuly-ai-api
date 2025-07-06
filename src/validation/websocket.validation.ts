import { z } from 'zod';

// Base WebSocket message schema
export const WebSocketMessageSchema = z.object({
  type: z.string(),
  payload: z.unknown().optional(),
});

// Auth message schema
export const AuthMessageSchema = z.object({
  type: z.literal('AUTH'),
  idToken: z.string().min(1, 'ID token is required'),
});

// Start audio stream payload schema
export const StartAudioStreamPayloadSchema = z.object({
  exerciseType: z.literal('tongueTwister'),
  expectedText: z.string().min(1, 'Expected text is required'),
});

// Audio chunk payload schema
export const AudioChunkPayloadSchema = z.object({
  data: z.string().min(1, 'Audio data is required'), // Base64 encoded audio data
  sequence: z.number().int().min(0, 'Sequence number must be a non-negative integer'),
});

// Stop audio stream payload schema (empty for now)
export const StopAudioStreamPayloadSchema = z.object({});

// Union type for all message types
export const WebSocketMessageUnionSchema = z.discriminatedUnion('type', [
  AuthMessageSchema,
  z.object({
    type: z.literal('START_AUDIO_STREAM'),
    payload: StartAudioStreamPayloadSchema,
  }),
  z.object({
    type: z.literal('AUDIO_CHUNK'),
    payload: AudioChunkPayloadSchema,
  }),
  z.object({
    type: z.literal('STOP_AUDIO_STREAM'),
    payload: StopAudioStreamPayloadSchema.optional(),
  }),
]);

// Type exports for use in other files
export type ValidatedWebSocketMessage = z.infer<typeof WebSocketMessageUnionSchema>;
export type ValidatedAuthMessage = z.infer<typeof AuthMessageSchema>;
export type ValidatedStartAudioStreamPayload = z.infer<typeof StartAudioStreamPayloadSchema>;
export type ValidatedAudioChunkPayload = z.infer<typeof AudioChunkPayloadSchema>;
export type ValidatedStopAudioStreamPayload = z.infer<typeof StopAudioStreamPayloadSchema>;

// Validation helper functions with proper typing
export const validateWebSocketMessage = (data: unknown): ValidatedWebSocketMessage => {
  return WebSocketMessageUnionSchema.parse(data);
};

export const validateAuthMessage = (data: unknown): ValidatedAuthMessage => {
  return AuthMessageSchema.parse(data);
};

export const validateStartAudioStreamPayload = (data: unknown): ValidatedStartAudioStreamPayload => {
  return StartAudioStreamPayloadSchema.parse(data);
};

export const validateAudioChunkPayload = (data: unknown): ValidatedAudioChunkPayload => {
  return AudioChunkPayloadSchema.parse(data);
};

export const validateStopAudioStreamPayload = (data: unknown): ValidatedStopAudioStreamPayload => {
  return StopAudioStreamPayloadSchema.parse(data);
};

// Safe JSON parsing with validation
export const parseAndValidateWebSocketMessage = (message: string): ValidatedWebSocketMessage => {
  try {
    const parsedData = JSON.parse(message) as unknown;
    return validateWebSocketMessage(parsedData);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
};
