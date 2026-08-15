import { Worker, Job } from 'bullmq';
import axios, { AxiosError } from 'axios';
import { createClient } from '@clickhouse/client';
import Redis from 'ioredis';
import { CryptoService } from '../services/crypto.service';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'pulse_analytics'
});

interface SyncJobData {
  tenantId: string;
  clientId: string;
  encryptedVault: { encryptedData: string; iv: string; tag: string };
  initialCursor?: string;
}

export const klaviyoSyncWorker = new Worker<SyncJobData>(
  'klaviyo-sync-queue',
  async (job: Job<SyncJobData>) => {
    const { tenantId, clientId, encryptedVault, initialCursor } = job.data;
    const { apiKey } = CryptoService.decrypt(encryptedVault);

    console.log(`[Klaviyo Worker] Starting sync for Client ${clientId}...`);
    let nextCursor = initialCursor;
    let hasMore = true;
    let totalEventsSynced = 0;

    while (hasMore) {
      try {
        const url: string = nextCursor 
          ? nextCursor 
          : 'https://a.klaviyo.com/api/events?filter=greater-than(datetime,2025-01-01T00:00:00Z)&page[size]=100&sort=-datetime';

        const res = await axios.get(url, {
          headers: {
            'Authorization': `Klaviyo-API-Key ${apiKey}`,
            'revision': '2024-07-15',
            'Accept': 'application/json'
          }
        });

        const rawEvents = res.data.data || [];
        if (rawEvents.length === 0) {
          hasMore = false;
          break;
        }

        // Transform into Normalized OLAP schema
        const normalizedEvents = rawEvents.map((evt: any) => {
          const metricName = evt.attributes?.metric_id || 'unknown';
          const properties = evt.attributes?.event_properties || {};
          const isOrder = metricName.toLowerCase().includes('order') || evt.attributes?.value > 0;
          const gross = isOrder ? parseFloat(evt.attributes?.value || '0') : 0;

          return {
            tenant_id: tenantId,
            client_id: clientId,
            event_id: evt.id,
            event_time: evt.attributes?.datetime ? evt.attributes.datetime.replace('T', ' ').slice(0, 19) : new Date().toISOString().slice(0, 19),
            event_type: isOrder ? 'placed_order' : 'received_email',
            customer_id: evt.relationships?.profile?.data?.id || 'guest',
            customer_email: properties['$email'] || properties['email'] || '',
            channel: 'email',
            campaign_id: properties['$message'] || properties['Campaign Name'] || '',
            flow_id: properties['$flow'] || properties['Flow ID'] || '',
            gross_revenue: gross,
            net_revenue: gross,
            refund_amount: 0,
            is_subscription: properties['$is_subscription'] ? 1 : 0,
            properties: JSON.stringify(properties)
          };
        });

        // Batch Insert into ClickHouse
        await clickhouse.insert({
          table: 'events',
          values: normalizedEvents,
          format: 'JSONEachRow'
        });

        totalEventsSynced += normalizedEvents.length;
        nextCursor = res.data.links?.next || null;
        hasMore = Boolean(nextCursor);

        // Update Job progress
        await job.updateProgress({ totalEventsSynced, lastCursor: nextCursor });

        // Adaptive rate limiting
        await new Promise(r => setTimeout(r, 150));
      } catch (err: any) {
        if (err.isAxiosError && err.response?.status === 429) {
          const retryAfterSec = parseInt(err.response.headers['retry-after'] || '5', 10);
          console.warn(`[Klaviyo Worker] Rate limited. Backing off for ${retryAfterSec}s...`);
          await new Promise(r => setTimeout(r, retryAfterSec * 1000));
        } else {
          console.error(`[Klaviyo Worker] Error during sync: ${err.message}`);
          throw err;
        }
      }
    }

    console.log(`[Klaviyo Worker] Successfully synced ${totalEventsSynced} events for Client ${clientId}`);
    return { totalEventsSynced };
  },
  { connection: redis, concurrency: 4 }
);
