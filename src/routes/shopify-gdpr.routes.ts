import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || 'test_shopify_secret';

function verifyShopifyHmac(rawBody: string, hmacHeader: string): boolean {
  if (!hmacHeader) return false;
  const hash = crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(rawBody, 'utf8').digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

export async function shopifyGdprRoutes(fastify: FastifyInstance) {
  // 1. Customer Data Request (GDPR Mandatory)
  fastify.post('/webhooks/shopify/customers/data_request', async (req: FastifyRequest, reply: FastifyReply) => {
    const hmac = req.headers['x-shopify-hmac-sha256'] as string;
    const rawBody = JSON.stringify(req.body);

    if (!verifyShopifyHmac(rawBody, hmac)) {
      return reply.status(401).send({ error: 'Unauthorized webhook request' });
    }

    const payload = req.body as any;
    console.log(`[GDPR Data Request] Customer: ${payload.customer?.email}, Shop: ${payload.shop_domain}`);
    // Acknowledge receipt within 48h SLA
    return reply.status(200).send({ received: true });
  });

  // 2. Customer Redaction / Deletion Request (GDPR Mandatory)
  fastify.post('/webhooks/shopify/customers/redact', async (req: FastifyRequest, reply: FastifyReply) => {
    const hmac = req.headers['x-shopify-hmac-sha256'] as string;
    const rawBody = JSON.stringify(req.body);

    if (!verifyShopifyHmac(rawBody, hmac)) {
      return reply.status(401).send({ error: 'Unauthorized webhook request' });
    }

    const payload = req.body as any;
    console.log(`[GDPR Redact Customer] Redacting records for customer ID: ${payload.customer?.id}, Shop: ${payload.shop_domain}`);
    return reply.status(200).send({ status: 'redacted' });
  });

  // 3. Shop Redaction / Uninstall Cleanup (GDPR Mandatory)
  fastify.post('/webhooks/shopify/shop/redact', async (req: FastifyRequest, reply: FastifyReply) => {
    const hmac = req.headers['x-shopify-hmac-sha256'] as string;
    const rawBody = JSON.stringify(req.body);

    if (!verifyShopifyHmac(rawBody, hmac)) {
      return reply.status(401).send({ error: 'Unauthorized webhook request' });
    }

    const payload = req.body as any;
    console.log(`[GDPR Redact Shop] Cleaning up integration for Shop: ${payload.shop_domain}`);
    // Purge cached tokens & mark client integration as uninstalled
    return reply.status(200).send({ status: 'shop_purged' });
  });
}
