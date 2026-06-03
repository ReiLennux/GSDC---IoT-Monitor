import { alertUseCases } from '../container';
import type { SocketHandlers } from '../infrastructure/websocket/socket';

export function createSocketHandlers(): SocketHandlers {
  return {
    acknowledgeAlert: async (alertId: string) => alertUseCases.acknowledge({ alertId }),
  };
}
