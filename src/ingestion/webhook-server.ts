import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { NormalizedEvent } from '../types';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const eventQueue = new Queue('ingestion-events', { connection: redis });

const fastify = Fastify({ logger: true });

// HMAC Signature verification for Shopify Webhooks
function verifyShopifyHmac(rawBody: string, hmacHeader: string, secret: string): boolean {
  const hash = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

// Shopify Webhook Ingestion Endpoint
fastify.post('/webhooks/shopify/:tenantId/:clientId', async (req: FastifyRequest<{
  Params: { tenantId: string; clientId: string };
}>, reply: FastifyReply) => {
  const { tenantId, clientId } = req.params;
  const topic = req.headers['x-shopify-topic'] as string;
  const webhookId = req.headers['x-shopify-webhook-id'] as string;

  if (!webhookId) {
    return reply.status(400).send({ error: 'Missing Webhook ID header' });
  }

  // Idempotency check via Redis (24h TTL)
  const idempotencyKey = `webhook:idemp:${webhookId}`;
  const isDuplicate = await redis.set(idempotencyKey, '1', 'EX', 86400, 'NX');
  if (!isDuplicate) {
    return reply.status(200).send({ status: 'ignored_duplicate' });
  }

  const payload = req.body as any;
  let normalizedEvent: NormalizedEvent | null = null;

  if (topic === 'orders/create' || topic === 'orders/paid') {
    const isSub = payload.line_items?.some((item: any) => item.selling_plan_allocation !== undefined) || false;
    const gross = parseFloat(payload.total_price || '0');
    const refunds = parseFloat(payload.total_refunded || '0');
    const net = gross - refunds;

    normalizedEvent = {
      tenantId,
      clientId,
      eventId: `shopify_order_${payload.id}`,
      eventTime: new Date(payload.created_at || Date.now()).toISOString(),
      eventType: 'placed_order',
      customerId: payload.customer?.id ? String(payload.customer.id) : 'guest',
      customerEmail: payload.customer?.email || payload.email || '',
      channel: isSub ? 'subscription' : 'direct',
      grossRevenue: gross,
      netRevenue: net,
      refundAmount: refunds,
      isSubscription: isSub,
      properties: {
        orderNumber: payload.order_number,
        sourceName: payload.source_name,
        referringSite: payload.referring_site
      }
    };
  }

  if (normalizedEvent) {
    await eventQueue.add('process-event', normalizedEvent, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 }
    });
  }

  return reply.status(200).send({ status: 'queued' });
});

export { fastify };
