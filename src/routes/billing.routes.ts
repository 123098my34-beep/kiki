import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BillingService } from '../services/billing.service';

export async function billingRoutes(fastify: FastifyInstance) {
  // 1. Create Checkout Session
  fastify.post('/billing/checkout', async (req: FastifyRequest<{
    Body: {
      organizationId: string;
      agencyName: string;
      agencyEmail: string;
      tier: 'starter' | 'growth' | 'scale';
      successUrl: string;
      cancelUrl: string;
    }
  }>, reply: FastifyReply) => {
    const { organizationId, agencyName, agencyEmail, tier, successUrl, cancelUrl } = req.body;
    
    try {
      const session = await BillingService.createCheckoutSession(
        organizationId,
        agencyName,
        agencyEmail,
        tier,
        successUrl,
        cancelUrl
      );
      return reply.send(session);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });

  // 2. Access Stripe Customer Portal
  fastify.post('/billing/portal', async (req: FastifyRequest<{
    Body: { stripeCustomerId: string; returnUrl: string }
  }>, reply: FastifyReply) => {
    const { stripeCustomerId, returnUrl } = req.body;
    
    try {
      const portal = await BillingService.createCustomerPortalSession(stripeCustomerId, returnUrl);
      return reply.send(portal);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });

  // 3. Stripe Webhook Endpoint
  fastify.post('/billing/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    const event = req.body as any;
    const result = await BillingService.handleWebhookEvent(event);
    return reply.status(200).send({ received: true, ...result });
  });
}
