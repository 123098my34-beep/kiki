import axios from 'axios';
import crypto from 'crypto';
import { CryptoService } from './crypto.service';

const KLAVIYO_CLIENT_ID = process.env.KLAVIYO_CLIENT_ID || 'test_klaviyo_client_id';
const KLAVIYO_CLIENT_SECRET = process.env.KLAVIYO_CLIENT_SECRET || 'test_klaviyo_client_secret';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://app.pulseretention.io';

export class KlaviyoOAuthService {
  /**
   * Generates OAuth 2.0 PKCE Code Verifier & Challenge
   */
  static generatePkcePair(): { verifier: string; challenge: string } {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
  }

  /**
   * Generates Klaviyo OAuth 2.0 Authorization URL
   */
  static getAuthorizationUrl(clientId: string, codeChallenge: string): { url: string; state: string } {
    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${APP_BASE_URL}/api/v1/auth/klaviyo/callback`;
    const scopes = 'accounts:read metrics:read campaigns:read flows:read lists:read lists:write profiles:read profiles:write';

    const url = `https://a.klaviyo.com/oauth/authorize?response_type=code&client_id=${KLAVIYO_CLIENT_ID}&scope=${encodeURIComponent(
      scopes
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}_${clientId}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    return { url, state };
  }

  /**
   * Exchanges Authorization Code for Access & Refresh Tokens
   */
  static async exchangeCode(code: string, codeVerifier: string): Promise<{ accessToken: string; refreshToken: string; encryptedVault: any }> {
    const redirectUri = `${APP_BASE_URL}/api/v1/auth/klaviyo/callback`;
    const authHeader = Buffer.from(`${KLAVIYO_CLIENT_ID}:${KLAVIYO_CLIENT_SECRET}`).toString('base64');

    const res = await axios.post(
      'https://a.klaviyo.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token: accessToken, refresh_token: refreshToken } = res.data;
    const encryptedVault = CryptoService.encrypt({ accessToken, refreshToken });

    return { accessToken, refreshToken, encryptedVault };
  }
}
