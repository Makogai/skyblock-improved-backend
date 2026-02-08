import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AblyService } from '../ably/ably.service';
import { ModService } from './mod.service';

class ModTokenDto {
  clientId!: string;
}

class AdminMessageDto {
  message!: string;
}

class PlayerCommandDto {
  playerName!: string;
  command!: string;
}

@Controller('mod')
export class ModController {
  constructor(
    private mod: ModService,
    private ably: AblyService,
  ) {}

  @Get('token')
  async getModTokenQuery(@Query('clientId') clientId?: string) {
    return this.getModTokenInternal((clientId ?? '').trim() || 'mod-anonymous');
  }

  @Post('token')
  async getModToken(@Body() dto: ModTokenDto) {
    return this.getModTokenInternal((dto.clientId ?? '').trim() || 'mod-anonymous');
  }

  private async getModTokenInternal(clientId: string) {
    const result = await this.ably.createToken({
      clientId,
      capability: {
        'skyblock:players': ['publish', 'presence', 'subscribe'],
        'skyblock:admin-messages': ['subscribe', 'history'],
        'skyblock:player-commands': ['subscribe'],
      },
    });
    if (!result) throw new Error('Ably not configured');
    return result;
  }

  @Post('player-command')
  @UseGuards(JwtAuthGuard)
  async sendPlayerCommand(@Body() dto: PlayerCommandDto) {
    const playerName = (dto.playerName ?? '').trim();
    const command = (dto.command ?? '').trim();
    if (!playerName || !command) throw new Error('Player name and command are required');
    try {
      await this.mod.publishPlayerCommand(playerName, command);
      return { ok: true };
    } catch (e) {
      throw new Error('Failed to publish: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  @Post('admin-message')
  @UseGuards(JwtAuthGuard)
  async sendAdminMessage(@Body() dto: AdminMessageDto) {
    const message = (dto.message ?? '').trim();
    if (!message) throw new Error('Message is required');
    try {
      await this.mod.publishAdminMessage(message);
      return { ok: true };
    } catch (e) {
      throw new Error('Failed to publish to Ably: ' + (e instanceof Error ? e.message : String(e)));
    }
  }
}
