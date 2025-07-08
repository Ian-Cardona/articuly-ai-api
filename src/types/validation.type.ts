import type { WebSocketMessage } from './websocket.type.ts';

export type ParsedWebSocketMessage = WebSocketMessage;

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly message?: WebSocketMessage;
}
