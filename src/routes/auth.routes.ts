import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OAuthService } from '../services/oauth.service';

export async function authRoutes(fastify: FastifyInstance) {
  // 1. Initiate Shopify Install Flow
  fastify.get('/auth/shopify/connect', async (req: FastifyRequest<{
    Querystring: { shop: string; clientId: string }
  }>, reply: FastifyReply) => {
    const { shop, clientId } = req.query;
    if (!shop || !clientId) {
      return reply.status(400).send({ error: 'Missing shop domain or clientId' });
    }

    const { url } = OAuthService.generateShopifyAuthUrl(shop, clientId);
    return reply.redirect(url);
  });

  // 2. Shopify OAuth Callback Handler
  fastify.get('/auth/shopify/callback', async (req: FastifyRequest<{
    Querystring: { shop: string; code: string; state: string }
  }>, reply: FastifyReply) => {
    const { shop, code, state } = req.query;
    if (!shop || !code) {
      return reply.status(400).send({ error: 'Invalid OAuth callback parameters' });
    }

    try {
      const { encryptedVault } = await OAuthService.handleShopifyCallback(shop, code);
      return reply.send({
        status: 'success',
        message: `Store ${shop} connected and webhooks registered.`,
        integration: encryptedVault
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to complete Shopify OAuth handshake' });
    }
  });

  // 3. Klaviyo API Key / OAuth Connect
  fastify.post('/auth/klaviyo/connect', async (req: FastifyRequest<{
    Body: { apiKey: string; clientId: string }
  }>, reply: FastifyReply) => {
    const { apiKey, clientId } = req.body;
    if (!apiKey || !clientId) {
      return reply.status(400).send({ error: 'Missing Klaviyo API Key or Client ID' });
    }

    const verification = await OAuthService.verifyAndStoreKlaviyoKey(apiKey, clientId);
    if (!verification.isValid) {
      return reply.status(401).send({ error: 'Invalid Klaviyo API Key or insufficient permissions' });
    }

    return reply.send({
      status: 'success',
      accountName: verification.accountName,
      message: 'Klaviyo connection verified and credentials encrypted'
    });
  });
}
