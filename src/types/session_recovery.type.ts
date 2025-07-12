import type { ExerciseConfig } from './session.type.ts';

export interface RecoveryResult {
  success: boolean;
  sessionRestored: boolean;
  exerciseConfig?: ExerciseConfig;
  sessionId: string;
  error?: string;
}
