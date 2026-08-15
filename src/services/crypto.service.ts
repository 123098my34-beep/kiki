import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes

export class CryptoService {
  /**
   * Encrypts sensitive credentials (API tokens, OAuth refresh tokens) using AES-256-GCM
   */
  static encrypt(data: Record<string, any>): { encryptedData: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'utf-8'), iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      tag
    };
  }

  /**
   * Decrypts encrypted credentials
   */
  static decrypt(payload: { encryptedData: string; iv: string; tag: string }): Record<string, any> {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(SECRET_KEY, 'utf-8'),
      Buffer.from(payload.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
    let decrypted = decipher.update(payload.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}
