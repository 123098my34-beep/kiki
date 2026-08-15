import axios from 'axios';
import crypto from 'crypto';
import { CryptoService } from './crypto.service';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || 'test_shopify_key';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || 'test_shopify_secret';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://app.pulseretention.io';

export class OAuthService {
  /**
   * Generates Shopify OAuth redirect URL with nonce security
   */
  static generateShopifyAuthUrl(shopDomain: string, clientId: string): { url: string; state: string } {
    const state = crypto.randomBytes(16).toString('hex');
    const scopes = 'read_orders,read_customers,read_products,read_analytics';
    const redirectUri = `${APP_BASE_URL}/api/v1/auth/shopify/callback`;

    const url = `https://${shopDomain}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}_${clientId}`;

    return { url, state };
  }

  /**
   * Exchanges authorization code for a permanent Shopify access token and auto-registers webhooks
   */
  static async handleShopifyCallback(shopDomain: string, code: string): Promise<{ accessToken: string; encryptedVault: any }> {
    const tokenRes = await axios.post(`https://${shopDomain}/admin/oauth/access_token`, {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code
    });

    const accessToken = tokenRes.data.access_token;
    const encryptedVault = CryptoService.encrypt({ accessToken, shopDomain });

    // Auto-register mandatory Shopify webhooks
    await this.registerShopifyWebhooks(shopDomain, accessToken);

    return { accessToken, encryptedVault };
  }

  /**
   * Registers GraphQL Webhook subscriptions for real-time order & refund event streaming
   */
  private static async registerShopifyWebhooks(shopDomain: string, accessToken: string): Promise<void> {
    const webhookTopics = ['ORDERS_CREATE', 'ORDERS_UPDATED', 'ORDERS_PAID', 'REFUNDS_CREATE'];
    const endpoint = `https://${shopDomain}/admin/api/2024-07/graphql.json`;

    for (const topic of webhookTopics) {
      const mutation = `
        mutation webhookSubscriptionCreate {
          webhookSubscriptionCreate(
            topic: ${topic}
            webhookSubscription: {
              callbackUrl: "${APP_BASE_URL}/webhooks/shopify/events"
              format: JSON
            }
          ) {
            userErrors {
              field
              message
            }
            webhookSubscription {
              id
            }
          }
        }
      `;

      try {
        await axios.post(
          endpoint,
          { query: mutation },
          { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } }
        );
      } catch (err: any) {
        console.warn(`Webhook registration notice for ${topic}:`, err.message);
      }
    }
  }

  /**
   * Connects and verifies Klaviyo Private API Key or OAuth Token
   */
  static async verifyAndStoreKlaviyoKey(apiKey: string, clientId: string): Promise<{ isValid: boolean; accountName?: string; encryptedVault?: any }> {
    try {
      const res = await axios.get('https://a.klaviyo.com/api/accounts', {
        headers: {
          'Authorization': `Klaviyo-API-Key ${apiKey}`,
          'revision': '2024-07-15'
        }
      });

      const accountData = res.data.data?.[0]?.attributes;
      const accountName = accountData?.contact_information?.organization_name || 'Klaviyo Account';
      const encryptedVault = CryptoService.encrypt({ apiKey, accountId: res.data.data?.[0]?.id });

      return {
        isValid: true,
        accountName,
        encryptedVault
      };
    } catch (error) {
      return { isValid: false };
    }
  }
}
