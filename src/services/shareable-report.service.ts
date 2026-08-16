import crypto from 'crypto';

interface ShareableReportToken {
  reportId: string;
  clientId: string;
  tenantId: string;
  expiresAt: number; // Unix timestamp
  passwordHash?: string;
}

const memoryTokenStore = new Map<string, ShareableReportToken>();

export class ShareableReportService {
  /**
   * Creates a signed, expiring 1-click shareable web report link (e.g. pulse.to/r/:token)
   */
  static createShareToken(
    tenantId: string,
    clientId: string,
    reportId: string,
    expiresInDays = 30,
    password?: string
  ): { shareUrl: string; token: string; expiresAt: Date } {
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
    
    let passwordHash: string | undefined;
    if (password) {
      passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    }

    memoryTokenStore.set(token, {
      reportId,
      clientId,
      tenantId,
      expiresAt,
      passwordHash
    });

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:4000';
    return {
      token,
      shareUrl: `${appBaseUrl}/r/${token}`,
      expiresAt: new Date(expiresAt)
    };
  }

  /**
   * Verifies and resolves a share token, checking expiration and password
   */
  static resolveShareToken(token: string, passwordAttempt?: string): { valid: boolean; payload?: ShareableReportToken; error?: string } {
    const record = memoryTokenStore.get(token);
    if (!record) return { valid: false, error: 'Report link not found or expired' };

    if (Date.now() > record.expiresAt) {
      memoryTokenStore.delete(token);
      return { valid: false, error: 'Report link has expired' };
    }

    if (record.passwordHash) {
      if (!passwordAttempt) return { valid: false, error: 'Password required to view this report' };
      const attemptHash = crypto.createHash('sha256').update(passwordAttempt).digest('hex');
      if (attemptHash !== record.passwordHash) {
        return { valid: false, error: 'Invalid password' };
      }
    }

    return { valid: true, payload: record };
  }
}
