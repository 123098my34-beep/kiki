import Redis from 'ioredis';
import { Queue } from 'bullmq';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const dlqQueue = new Queue('dlq-poisoned-events', { connection: redis });
const ingestionQueue = new Queue('ingestion-events', { connection: redis });

export class DlqManager {
  /**
   * Captures failed webhook payloads and stores them in DLQ with diagnostic error metadata
   */
  static async pushToDlq(originalEvent: any, errorReason: string): Promise<string> {
    const dlqRecord = {
      event: originalEvent,
      errorReason,
      failedAt: new Date().toISOString(),
      retryCount: originalEvent._retryCount || 0
    };

    const job = await dlqQueue.add('dead-letter', dlqRecord);
    console.error(`[DLQ] Stored poisoned message ${job.id}: ${errorReason}`);
    return String(job.id);
  }

  /**
   * Replays all messages in DLQ back into the primary ingestion queue
   */
  static async replayAllDlqMessages(): Promise<{ replayedCount: number }> {
    const jobs = await dlqQueue.getJobs(['waiting', 'delayed', 'failed']);
    let replayedCount = 0;

    for (const job of jobs) {
      const data = job.data;
      await ingestionQueue.add('process-event', {
        ...data.event,
        _replayedFromDlq: true
      });
      await job.remove();
      replayedCount++;
    }

    console.log(`[DLQ] Replayed ${replayedCount} messages to primary ingestion queue.`);
    return { replayedCount };
  }
}
