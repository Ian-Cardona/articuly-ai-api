export interface AttemptLimitConfig {
  maxAttemptsPerDay: number;
  maxAttemptsPerSession: number;
  resetTimeHour: number; // Hour of day when limits reset (0-23)
}
