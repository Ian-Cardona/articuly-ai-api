import type { AuthStateWebSocket as BaseAuthStateWebSocket } from '../../src/types/middleware.type.ts';
import type { UserAccount } from '../../src/types/user.type.ts';

export interface AuthStateWebSocket extends BaseAuthStateWebSocket {
  userProfile?: UserAccount;
} 