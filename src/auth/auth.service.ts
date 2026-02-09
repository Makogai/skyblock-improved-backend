import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  type?: 'session';
}

export interface LoginResponse {
  access_token: string;
  user: { id: string; email: string; role: string };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Validate Minecraft access token via Minecraft Services API and issue JWT.
   * Used for pentest "login as player" with extracted session.
   */
  async loginWithMinecraftSession(accessToken: string): Promise<LoginResponse> {
    const profile = await this.validateMinecraftToken(accessToken);
    if (!profile) {
      throw new UnauthorizedException('Invalid or expired Minecraft session token');
    }
    const payload: JwtPayload = {
      sub: profile.id,
      email: `${profile.name}@session.minecraft`,
      type: 'session',
    };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      user: {
        id: profile.id,
        email: payload.email,
        role: 'user',
      },
    };
  }

  private async validateMinecraftToken(
    accessToken: string,
  ): Promise<{ id: string; name: string } | null> {
    try {
      const res = await fetch('https://api.minecraftservices.com/minecraft/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { id?: string; name?: string };
      if (!json?.id || !json?.name) return null;
      return { id: json.id, name: json.name };
    } catch {
      return null;
    }
  }
}
