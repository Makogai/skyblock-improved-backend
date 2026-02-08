import { Injectable, OnModuleInit } from '@nestjs/common';
import Ably from 'ably';

@Injectable()
export class AblyService implements OnModuleInit {
  private client: Ably.Realtime | null = null;
  private restClient: Ably.Rest | null = null;

  onModuleInit() {
    const key = process.env.ABLY_API_KEY?.trim();
    if (key) {
      this.client = new Ably.Realtime(key);
      this.restClient = new Ably.Rest(key);
    }
  }

  async createToken(options?: {
    clientId?: string;
    capability?: Record<string, string[]>;
  }): Promise<{ token: string } | null> {
    if (!this.restClient) return null;
    const caps = options?.capability ?? { 'skyblock:*': ['subscribe', 'history'] };
    const details = await this.restClient.auth.requestToken({
      clientId: options?.clientId,
      capability: JSON.stringify(caps),
      ttl: 60 * 60 * 1000,
    });
    return { token: details.token };
  }

  async publish(channelName: string, event: string, data: unknown): Promise<void> {
    if (!this.restClient) throw new Error('Ably not configured');
    const ch = this.restClient.channels.get(channelName);
    await ch.publish(event, data);
  }

  getConnectionState(): {
    configured: boolean;
    connected: boolean;
    state: string;
    error?: string;
  } {
    if (!this.client) {
      return { configured: false, connected: false, state: 'not_configured' };
    }
    const conn = this.client.connection;
    const state = conn.state as string;
    const errorReason = conn.errorReason as Ably.ErrorInfo | undefined;
    const error =
      errorReason?.message || (errorReason?.code ? `Code ${errorReason.code}` : undefined);

    return {
      configured: true,
      connected: state === 'connected',
      state,
      ...(error && { error }),
    };
  }
}
