import type { JwtSignOptions } from '@nestjs/jwt';

// @nestjs/jwt (ผ่าน jsonwebtoken) พิมพ์ expiresIn เป็น union แบบ template literal
// ("15m", "30d" ฯลฯ) ไม่ใช่ string ธรรมดา ค่าจาก ConfigService (env var) เป็น string
// เสมอ ฟังก์ชันนี้แค่ยืนยัน type ให้ตรงกับที่ @nestjs/jwt ต้องการ รูปแบบค่าจริง
// (เช่น "15m") ยังต้องถูกต้องตามที่ jsonwebtoken รองรับอยู่ดี
export type ExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

export function asExpiresIn(value: string): ExpiresIn {
  return value as ExpiresIn;
}
