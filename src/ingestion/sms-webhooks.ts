import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { NormalizedEvent } from '../types';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const eventQueue = new Queue('ingestion-events', { connection: redis });

export async function smsWebhookRoutes(fastify: FastifyInstance) {
  // 1. Attentive Webhook Receiver
  fastify.post('/webhooks/attentive/:tenantId/:clientId', async (req: FastifyRequest<{
    Params: { tenantId: string; clientId: string }
  }>, reply: FastifyReply) => {
    const { tenantId, clientId } = req.params;
    const payload = req.body as any;

    const eventType = payload.eventType; // 'message.sent', 'message.clicked', 'purchase'
    let normalizedEvent: NormalizedEvent | null = null;

    if (eventType === 'message.sent' || eventType === 'message.clicked') {
      normalizedEvent = {
        tenantId,
        clientId,
        eventId: `attentive_${payload.id || Date.now()}`,
        eventTime: new Date(payload.timestamp || Date.now()).toISOString(),
        eventType: eventType === 'message.sent' ? 'sms_sent' : 'sms_clicked',
        customerId: payload.user?.id || 'guest',
        customerEmail: payload.user?.email || '',
        channel: 'sms',
        campaignId: payload.campaign?.id || '',
        grossRevenue: 0,
        netRevenue: 0,
        refundAmount: 0,
        isSubscription: false,
        properties: {
          provider: 'attentive',
          messageName: payload.campaign?.name || 'Attentive Broadcast'
        }
      };
    }

    if (normalizedEvent) {
      await eventQueue.add('process-event', normalizedEvent);
    }

    return reply.status(200).send({ status: 'queued', provider: 'attentive' });
  });

  // 2. Postscript Webhook Receiver
  fastify.post('/webhooks/postscript/:tenantId/:clientId', async (req: FastifyRequest<{
    Params: { tenantId: string; clientId: string }
  }>, reply: FastifyReply) => {
    const { tenantId, clientId } = req.params;
    const payload = req.body as any;

    const topic = payload.event; // 'message_sent', 'link_clicked', 'order_created'
    let normalizedEvent: NormalizedEvent | null = null;

    if (topic === 'message_sent' || topic === 'link_clicked') {
      normalizedEvent = {
        tenantId,
        clientId,
        eventId: `postscript_${payload.id || Date.now()}`,
        eventTime: new Date(payload.created_at || Date.now()).toISOString(),
        eventType: topic === 'message_sent' ? 'sms_sent' : 'sms_clicked',
        customerId: payload.subscriber?.id ? String(payload.subscriber.id) : 'guest',
        customerEmail: payload.subscriber?.email || '',
        channel: 'sms',
        campaignId: payload.campaign_id ? String(payload.campaign_id) : '',
        flowId: payload.automation_id ? String(payload.automation_id) : '',
        grossRevenue: 0,
        netRevenue: 0,
        refundAmount: 0,
        isSubscription: false,
        properties: { provider: 'postscript' }
      };
    }

    if (normalizedEvent) {
      await eventQueue.add('process-event', normalizedEvent);
    }

    return reply.status(200).send({ status: 'queued', provider: 'postscript' });
  });
}
