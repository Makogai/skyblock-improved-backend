import { Body, Controller, Post } from '@nestjs/common';
import { ModService } from '../mod/mod.service';
import { AuthService } from './auth.service';

class LoginDto {
  email!: string;
  password!: string;
}

class LoginSessionDto {
  accessToken?: string;
  clientId?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private mod: ModService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /**
   * Login with extracted Minecraft session token (pentest use).
   * Provide either accessToken directly, or clientId to use stored session from mod.
   */
  @Post('login-session')
  async loginSession(@Body() dto: LoginSessionDto) {
    let accessToken = (dto.accessToken ?? '').trim();
    if (!accessToken && dto.clientId) {
      const entry = this.mod.getSession((dto.clientId ?? '').trim());
      accessToken = entry?.accessToken ?? '';
    }
    if (!accessToken) {
      throw new Error('Provide accessToken or clientId (player name with stored session)');
    }
    return this.auth.loginWithMinecraftSession(accessToken);
  }
}
