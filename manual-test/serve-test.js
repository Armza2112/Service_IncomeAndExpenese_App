// เสิร์ฟไฟล์ทดสอบตัวเดียวที่ http://localhost:3000 (ตรงกับ Authorized JavaScript
// origin ของ Google Client ID และ FRONTEND_URL ที่ backend ตั้ง CORS ไว้)
// รัน: node manual-test/serve-test.js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const htmlPath = fileURLToPath(new URL('./google-login-test.html', import.meta.url));

const server = createServer(async (_req, res) => {
  const html = await readFile(htmlPath);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});

server.listen(3000, () => {
  console.log('เปิดเบราว์เซอร์ที่ http://localhost:3000 เพื่อทดสอบ Google login');
});
