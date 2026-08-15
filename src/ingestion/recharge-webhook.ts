import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { NormalizedEvent } from '../types';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const eventQueue = new Queue('ingestion-events', { connection: redis });
const RECHARGE_CLIENT_SECRET = process.env.RECHARGE_CLIENT_SECRET || 'test_recharge_secret';

function verifyRechargeHmac(rawBody: string, hmacHeader: string): boolean {
  if (!hmacHeader) return false;
  const hash = crypto.createHmac('sha256', RECHARGE_CLIENT_SECRET).update(rawBody, 'utf8').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

export async function rechargeWebhookRoutes(fastify: FastifyInstance) {
  fastify.post('/webhooks/recharge/:tenantId/:clientId', async (req: FastifyRequest<{
    Params: { tenantId: string; clientId: string }
  }>, reply: FastifyReply) => {
    const { tenantId, clientId } = req.params;
    const topic = req.headers['x-recharge-topic'] as string;
    const hmac = req.headers['x-recharge-hmac-sha256'] as string;
    const rawBody = JSON.stringify(req.body);

    if (process.env.NODE_ENV === 'production' && !verifyRechargeHmac(rawBody, hmac)) {
      return reply.status(401).send({ error: 'Unauthorized Recharge webhook' });
    }

    const payload = req.body as any;
    let normalizedEvent: NormalizedEvent | null = null;

    if (topic === 'charge/paid' || topic === 'order/created') {
      const gross = parseFloat(payload.total_price || payload.amount || '0');
      
      normalizedEvent = {
        tenantId,
        clientId,
        eventId: `recharge_charge_${payload.id}`,
        eventTime: new Date(payload.created_at || Date.now()).toISOString(),
        eventType: 'subscription_renewed',
        customerId: payload.customer?.id ? String(payload.customer.id) : 'guest',
        customerEmail: payload.customer?.email || payload.email || '',
        channel: 'subscription',
        grossRevenue: gross,
        netRevenue: gross,
        refundAmount: 0,
        isSubscription: true,
        properties: {
          subscriptionId: payload.subscription_id,
          rechargeOrderType: payload.type || 'recurring'
        }
      };
    }

    if (normalizedEvent) {
      await eventQueue.add('process-event', normalizedEvent, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 }
      });
    }

    return reply.status(200).send({ status: 'queued', source: 'recharge' });
  });
}
