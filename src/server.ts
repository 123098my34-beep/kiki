import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authRoutes } from './routes/auth.routes';
import { billingRoutes } from './routes/billing.routes';
import { shopifyGdprRoutes } from './routes/shopify-gdpr.routes';
import { rechargeWebhookRoutes } from './ingestion/recharge-webhook';
import { smsWebhookRoutes } from './ingestion/sms-webhooks';
import { omnisendWebhookRoutes } from './ingestion/omnisend-webhook';
import { tenantDomainMiddleware } from './middleware/tenant-domain.middleware';
import { AnalyticsService } from './services/analytics.service';
import { ReconciliationService } from './services/reconciliation.service';
import { BenchmarkingService } from './services/benchmarking.service';
import { AdSpendService } from './services/ad-spend.service';
import { DiscountCannibalizationService } from './services/discount-cannibalization.service';
import { DeliverabilityRadarService } from './services/deliverability-radar.service';
import { FlowAbOptimizerService } from './services/flow-ab-optimizer.service';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  }
});

async function startServer() {
  await server.register(cors, { origin: true });

  // Custom Domain Multi-Tenant Middleware
  server.addHook('preHandler', tenantDomainMiddleware);

  // Register Core API Routes
  await server.register(authRoutes, { prefix: '/api/v1' });
  await server.register(billingRoutes, { prefix: '/api/v1' });
  await server.register(shopifyGdprRoutes, { prefix: '/api/v1' });

  // Register Ingestion Webhooks
  await server.register(rechargeWebhookRoutes, { prefix: '/api/v1' });
  await server.register(smsWebhookRoutes, { prefix: '/api/v1' });
  await server.register(omnisendWebhookRoutes, { prefix: '/api/v1' });

  // Health check
  server.get('/health', async () => ({ status: 'healthy', version: '1.3.0', timestamp: new Date().toISOString() }));

  // Analytics Endpoints
  server.get('/api/v1/clients/:clientId/pacing', async (req: any, reply) => {
    const { clientId } = req.params;
    const { tenantId, name, target } = req.query;
    const pacing = await AnalyticsService.calculateClientPacing(
      tenantId || '00000000-0000-0000-0000-000000000001',
      clientId,
      name || 'Client Store',
      parseFloat(target || '100000')
    );
    return reply.send(pacing);
  });

  server.get('/api/v1/clients/:clientId/reconciliation', async (req: any, reply) => {
    const { clientId } = req.params;
    const { tenantId, periodStart, periodEnd } = req.query;
    const report = await ReconciliationService.getReconciliation(
      tenantId || '00000000-0000-0000-0000-000000000001',
      clientId,
      periodStart || '2026-08-01',
      periodEnd || '2026-08-31'
    );
    return reply.send(report);
  });

  // Feature 1: Discount Cannibalization & Margin Erosion
  server.get('/api/v1/clients/:clientId/discount-cannibalization', async (req: any, reply) => {
    const { clientId } = req.params;
    const { tenantId, periodStart, periodEnd } = req.query;
    const report = await DiscountCannibalizationService.analyzeDiscountCannibalization(
      tenantId || '00000000-0000-0000-0000-000000000001',
      clientId,
      periodStart || '2026-08-01',
      periodEnd || '2026-08-31'
    );
    return reply.send(report);
  });

  // Feature 2: Deliverability & Inbox Placement Radar
  server.get('/api/v1/clients/:clientId/deliverability-radar', async (req: any, reply) => {
    const { clientId } = req.params;
    const { tenantId } = req.query;
    const report = await DeliverabilityRadarService.checkDeliverabilityRadar(
      tenantId || '00000000-0000-0000-0000-000000000001',
      clientId
    );
    return reply.send(report);
  });

  // Feature 3: Flow A/B Test Optimizer & Waste Calculator
  server.get('/api/v1/clients/:clientId/ab-optimizer', async (req: any, reply) => {
    const { clientId } = req.params;
    const { tenantId } = req.query;
    const tests = await FlowAbOptimizerService.evaluateFlowSplitTests(
      tenantId || '00000000-0000-0000-0000-000000000001',
      clientId
    );
    return reply.send(tests);
  });

  const port = parseInt(process.env.PORT || '4000', 10);
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Pulse Retention Engine v1.3.0 running with all secret-weapon features on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

startServer();
