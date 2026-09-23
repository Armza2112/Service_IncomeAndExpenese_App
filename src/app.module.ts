import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    // NestJS Observe ปิดไว้ก่อน เพราะ appKey/appSecret ยังเป็น placeholder
    // (ทำให้ telemetry ยิง 401 รัว ๆ ตอน start) — ถ้าจะใช้ ให้ไปสมัครที่
    // https://observe.nestjs.com แล้วใส่ค่าจริงก่อนเปิดใช้อีกครั้ง
    // ObserveModule.forRoot({
    //   appKey: 'YOUR_APP_KEY',
    //   appSecret: 'YOUR_APP_SECRET',
    //   serviceId: 'service_income_expenese',
    // }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
