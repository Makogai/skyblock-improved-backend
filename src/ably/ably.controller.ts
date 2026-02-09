import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AblyService } from './ably.service';

@Controller('ably')
@UseGuards(JwtAuthGuard)
export class AblyController {
  constructor(private ably: AblyService) {}

  @Get('status')
  getStatus() {
    return this.ably.getConnectionState();
  }

  @Get('token')
  async getToken() {
    const result = await this.ably.createToken({
      capability: {
        'skyblock:players': ['subscribe', 'presence', 'history'],
        'skyblock:screenshots': ['subscribe', 'history'],
      },
    });
    if (!result) throw new Error('Ably not configured');
    return result;
  }
}
