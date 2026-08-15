import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { NormalizedEvent } from '../types';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const eventQueue = new Queue('ingestion-events', { connection: redis });

export async function omnisendWebhookRoutes(fastify: FastifyInstance) {
  fastify.post('/webhooks/omnisend/:tenantId/:clientId', async (req: FastifyRequest<{
    Params: { tenantId: string; clientId: string }
  }>, reply: FastifyReply) => {
    const { tenantId, clientId } = req.params;
    const payload = req.body as any;

    const eventType = payload.eventType; // 'email.sent', 'email.opened', 'email.clicked', 'order.placed'
    let normalizedEvent: NormalizedEvent | null = null;

    if (eventType === 'email.sent' || eventType === 'email.opened' || eventType === 'email.clicked') {
      normalizedEvent = {
        tenantId,
        clientId,
        eventId: `omnisend_${payload.eventId || Date.now()}`,
        eventTime: new Date(payload.createdAt || Date.now()).toISOString(),
        eventType: eventType === 'email.sent' ? 'received_email' : eventType === 'email.opened' ? 'opened_email' : 'clicked_email',
        customerId: payload.contactId || 'guest',
        customerEmail: payload.email || '',
        channel: 'email',
        campaignId: payload.campaignId || '',
        flowId: payload.automationId || '',
        grossRevenue: 0,
        netRevenue: 0,
        refundAmount: 0,
        isSubscription: false,
        properties: { provider: 'omnisend' }
      };
    }

    if (normalizedEvent) {
      await eventQueue.add('process-event', normalizedEvent);
    }

    return reply.status(200).send({ status: 'queued', provider: 'omnisend' });
  });
}
