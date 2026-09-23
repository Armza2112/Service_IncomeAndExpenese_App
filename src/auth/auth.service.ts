import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, type User } from '../prisma/client.js';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { GoogleTokenVerifierService } from './providers/google-token-verifier.service.js';
import { asExpiresIn } from './utils/expires-in.js';

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: PublicUser;
}

const REFRESH_TOKEN_BYTES = 64;
const MS_PER_UNIT: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly googleVerifier: GoogleTokenVerifierService,
  ) {}

  async loginWithGoogle(idToken: string): Promise<AuthResult> {
    const payload = await this.googleVerifier.verify(idToken);
    const user = await this.usersService.findOrCreate({
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
      provider: AuthProvider.GOOGLE,
      providerId: payload.sub,
    });
    return this.issueTokens(user);
  }


  async refresh(rawToken: string): Promise<AuthResult> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token ไม่ถูกต้องหรือหมดอายุ');
    }

    // rotate: เพิกถอน refresh token เดิมแล้วออกอันใหม่ให้ทุกครั้งที่ refresh สำเร็จ
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(record.user);
  }

  async revoke(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: asExpiresIn(this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m')),
      },
    );

    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const expiresAt = this.parseRefreshExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
      user: toPublicUser(user),
    };
  }

  private parseRefreshExpiry(): Date {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d').trim();
    const match = /^(\d+)([smhd])$/.exec(raw);
    const now = Date.now();
    if (!match) {
      return new Date(now + 30 * MS_PER_UNIT.d);
    }
    const value = Number(match[1]);
    const unitMs = MS_PER_UNIT[match[2]];
    return new Date(now + value * unitMs);
  }
}
