import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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

class SessionDto {
  clientId!: string;
  accessToken!: string;
}

@Controller('mod')
export class ModController {
  constructor(
    private mod: ModService,
    private ably: AblyService,
  ) {}

  @Post('session')
  storeSession(@Body() dto: SessionDto) {
    const clientId = (dto.clientId ?? '').trim();
    const accessToken = (dto.accessToken ?? '').trim();
    if (!clientId || !accessToken) throw new Error('clientId and accessToken required');
    this.mod.storeSession(clientId, accessToken);
    return { ok: true };
  }

  @Get('session/:playerName')
  @UseGuards(JwtAuthGuard)
  getSession(@Param('playerName') playerName: string) {
    const entry = this.mod.getSession(playerName);
    if (!entry) return { accessToken: null };
    return { accessToken: entry.accessToken, timestamp: entry.timestamp };
  }

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

  @Post('screenshot')
  @UseInterceptors(FileInterceptor('image'))
  async uploadScreenshot(
    @Query('clientId') clientId: string,
    @UploadedFile() file?: { buffer?: Buffer },
  ) {
    const playerName = (clientId ?? '').trim();
    if (!playerName) throw new Error('clientId is required');
    if (!file?.buffer) throw new Error('image file is required');
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.buffer.length > maxSize) throw new Error('Image too large');
    this.mod.storeScreenshot(playerName, file.buffer);
    await this.mod.publishScreenshotUpdate(playerName);
    return { ok: true };
  }

  @Get('screenshots/:playerName')
  getScreenshot(@Param('playerName') playerName: string, @Res() res: Response) {
    const entry = this.mod.getScreenshot(playerName);
    if (!entry) {
      res.status(404).end();
      return;
    }
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    });
    res.send(entry.buffer);
  }
}
