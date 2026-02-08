import { Injectable } from '@nestjs/common';
import { AblyService } from '../ably/ably.service';

const ADMIN_CHANNEL = 'skyblock:admin-messages';
const PLAYER_COMMANDS_CHANNEL = 'skyblock:player-commands';

@Injectable()
export class ModService {
  constructor(private ably: AblyService) {}

  async publishAdminMessage(message: string): Promise<void> {
    await this.ably.publish(ADMIN_CHANNEL, 'admin-message', { message });
  }

  async publishPlayerCommand(playerName: string, command: string): Promise<void> {
    await this.ably.publish(PLAYER_COMMANDS_CHANNEL, 'player-command', {
      targetPlayer: playerName,
      command: command.startsWith('/') ? command : '/' + command,
    });
  }
}
