import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@clickhouse/client';
import { SlackBriefingService } from '../services/slack-briefing.service';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const cronQueue = new Queue('cron-scheduled-tasks', { connection: redis });

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'pulse_analytics'
});

export class CronSchedulerService {
  /**
   * Initializes persistent repeatable jobs for Slack morning digests and ClickHouse maintenance
   */
  static async initializeSchedules() {
    console.log('⏰ Initializing BullMQ Timezone-Aware Cron Schedules...');

    // 1. Morning Slack Briefings (Every day at 8:00 AM)
    await cronQueue.add(
      'daily-slack-briefing',
      { type: 'MORNING_SLACK_BRIEFING' },
      { repeat: { pattern: '0 8 * * *' } }
    );

    // 2. ClickHouse Materialized View Nightly Optimization (Every day at 2:00 AM UTC)
    await cronQueue.add(
      'clickhouse-nightly-optimize',
      { type: 'OPTIMIZE_TABLES' },
      { repeat: { pattern: '0 2 * * *' } }
    );

    console.log('✅ Repeatable cron jobs scheduled.');
  }
}

// Background Worker Processor for Cron Tasks
export const cronWorker = new Worker(
  'cron-scheduled-tasks',
  async (job) => {
    if (job.data.type === 'OPTIMIZE_TABLES') {
      console.log('[Cron Worker] Running ClickHouse table partition optimization...');
      await clickhouse.query({
        query: 'OPTIMIZE TABLE daily_channel_performance_mv FINAL'
      });
      console.log('[Cron Worker] Table optimization completed.');
    }
    return { status: 'completed' };
  },
  { connection: redis }
);
