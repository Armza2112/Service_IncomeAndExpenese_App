import { Injectable } from '@nestjs/common';
import { AuthProvider, type User } from '../prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface FindOrCreateUserInput {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  provider: AuthProvider;
  providerId: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(input: FindOrCreateUserInput): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider: input.provider,
          providerId: input.providerId,
        },
      },
    });

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          name: input.name ?? existing.name,
          avatarUrl: input.avatarUrl ?? existing.avatarUrl,
        },
      });
    }

    // อีเมลเดียวกันอาจเคยสมัครไว้ก่อน (เผื่อกรณีย้าย provider) — ผูกเข้าบัญชีเดิมแทนที่จะสร้างซ้ำ
    const byEmail = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          provider: input.provider,
          providerId: input.providerId,
          name: input.name ?? byEmail.name,
          avatarUrl: input.avatarUrl ?? byEmail.avatarUrl,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl,
        provider: input.provider,
        providerId: input.providerId,
      },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
