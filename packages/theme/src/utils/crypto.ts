/**
 * 构建期内容加密（M3b-b7）：AES-256-GCM + PBKDF2（node:crypto）。
 * 与客户端 app.ts 的 Web Crypto 解密参数严格对齐：
 *   PBKDF2-SHA256 100000 轮派生 256 位密钥；输出 base64(salt[16] + iv[12] + authTag[16] + ciphertext)。
 * salt/iv 由 password + slug 经 HMAC-SHA256 确定性派生——同一篇文与同一密码
 * 每次构建产出相同密文，使 sessionStorage 缓存的密码跨刷新/跨构建稳定有效。
 * 密文经 data-* 属性输出，文本内容不含明文；注：这是「防君子」级保护，
 * 密钥材料来自用户输入，安全性依赖密码强度。
 */
import { createCipheriv, createHmac, pbkdf2Sync } from 'node:crypto';

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

/** 由 key + 上下文字符串确定性派生 length 字节（HMAC-SHA256 截断） */
function deriveBytes(key: string, context: string, length: number): Buffer {
  return createHmac('sha256', key).update(context).digest().subarray(0, length);
}

/** 加密 HTML 字符串，输出 base64(salt + iv + authTag + ciphertext) */
export function encryptContent(html: string, password: string, slug: string): string {
  const salt = deriveBytes(password, `salt:${slug}`, SALT_LENGTH);
  const iv = deriveBytes(password, `iv:${slug}`, IV_LENGTH);
  const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(html, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
}
