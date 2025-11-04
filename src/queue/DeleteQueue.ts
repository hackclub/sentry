import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { DeleteMessageJobData, QueueStatus } from '../models/types';
import { SlackService } from '../services/SlackService';
import { TokenBucket } from '../utils/TokenBucket';
import { logger } from '../utils/logger';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export class DeleteQueue {
  readonly queue: Queue;
  private readonly events: QueueEvents;
  private readonly dlq: Queue;
  private worker?: Worker<DeleteMessageJobData>;
  private readonly tokenBucket: TokenBucket;

  constructor(private readonly slack: SlackService) {
    this.queue = new Queue('delete-messages', {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: false,
      },
    });
    this.events = new QueueEvents('delete-messages', { connection });
    this.dlq = new Queue('delete-messages-dlq', { connection });
    // Local smoothing: allow 1 token every ~1250ms (48/min). This aligns with global limiter.
    this.tokenBucket = new TokenBucket(1, 1250);

    this.events.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      logger.error({ jobId, failedReason }, 'Delete job failed');
    });
    this.events.on('completed', ({ jobId }: { jobId: string }) => {
      logger.debug({ jobId }, 'Delete job completed');
    });
  }

  async startWorker(): Promise<void> {
    this.worker = new Worker<DeleteMessageJobData>(
      'delete-messages',
      async (job: Job<DeleteMessageJobData>) => this.process(job),
      {
        connection,
        concurrency: 5,
      },
    );

    this.worker.on('failed', async (job: Job<DeleteMessageJobData> | undefined, err: Error) => {
      logger.error({ jobId: job?.id, err }, 'Worker failed a job');
      if (!job) return;
      const max = job.opts.attempts ?? 1;
      if (job.attemptsMade >= max) {
        // Move to DLQ
        await this.dlq.add('dead', job.data, { jobId: job.id });
        logger.warn({ jobId: job.id }, 'Job moved to DLQ');
      }
    });
  }

  async stopWorker(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
    await this.dlq.close();
    await connection.quit();
  }

  /** Deduplicate by channelId:messageTs (jobId) to avoid double enqueue. */
  async enqueue(data: DeleteMessageJobData): Promise<void> {
    const jobId = `${data.channelId}:${data.messageTs}`;
    await this.queue.add('delete', data, { jobId });
  }

  private async process(job: Job<DeleteMessageJobData>): Promise<void> {
    const { channelId, messageTs } = job.data;
    await this.tokenBucket.take();
    try {
      const result = await this.slack.deleteMessage(channelId, messageTs);
      if (!result.success) {
        const err = result.error || 'unknown_error';
        // Treat already deleted as success
        if (['message_not_found', 'channel_not_found',].includes(err)) {
          logger.info({ channelId, messageTs, err }, 'Message already gone, treat as success');
          return;
        }
        // Honor retry-after if present on WebAPIError
        const retryAfter = (result as any)?.retry_after_ms || (result as any)?.retryAfterMs;
        if (typeof retryAfter === 'number' && retryAfter > 0) {
          this.tokenBucket.honorRetryAfter(retryAfter);
        }
        throw new Error(err);
      }
    } catch (e: any) {
      // Extract Slack retry_after header if available
      const retryAfterSec = e?.data?.headers?.['retry-after'] || e?.retryAfter || e?.retry_after;
      const retryAfterMs = retryAfterSec ? Number(retryAfterSec) * 1000 : 0;
      if (retryAfterMs > 0) {
        this.tokenBucket.honorRetryAfter(retryAfterMs);
      }
      throw e;
    }
  }

  async status(): Promise<QueueStatus> {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
      this.queue.isPaused(),
    ]);
    return { waiting, active, completed, failed, delayed, paused };
  }
}


