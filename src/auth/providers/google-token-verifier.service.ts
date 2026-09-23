import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

export interface GoogleUserPayload {
  email: string;
  name?: string;
  picture?: string;
  sub: string;
}

@Injectable()
export class GoogleTokenVerifierService {
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('GOOGLE_CLIENT_ID', '');
    this.client = new OAuth2Client(this.clientId);
  }

  async verify(idToken: string): Promise<GoogleUserPayload> {
    if (!this.clientId) {
      throw new UnauthorizedException('ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID');
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Google ID token ไม่ถูกต้องหรือหมดอายุ');
    }

    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Google ID token ไม่มีข้อมูลอีเมล');
    }
    if (!payload.email_verified) {
      throw new UnauthorizedException('อีเมล Google นี้ยังไม่ได้ยืนยัน');
    }

    return {
      email: payload.email.toLowerCase(),
      name: payload.name,
      picture: payload.picture,
      sub: payload.sub,
    };
  }
}
