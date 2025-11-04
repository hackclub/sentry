import { RedisService } from './RedisService';
import { SlackService } from './SlackService';
import { logger } from '../utils/logger';

/**
 * Tracks per-user message volume in short TTL windows and kicks spammers.
 * Uses atomic Redis INCR + EXPIRE to detect bursts over a small window.
 */
export class SpamService {
  constructor(
    private readonly redis: RedisService,
    private readonly slack: SlackService,
    private readonly threshold: number = 5,
    private readonly windowSeconds: number = 10,
  ) {}

  /** Atomically record a message occurrence and return the window count. */
  async recordMessage(userId: string): Promise<number> {
    const key = `spam:win:${userId}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, this.windowSeconds);
    return count;
  }

  /** Mark a user as spamming for a cooldown window; idempotent. */
  async markSpamming(userId: string, ttlSeconds: number = 300): Promise<void> {
    await this.redis.set(`spam:flag:${userId}`, '1', ttlSeconds);
  }

  async isSpamming(userId: string): Promise<boolean> {
    const v = await this.redis.get(`spam:flag:${userId}`);
    return v === '1';
  }

  /** If user exceeds threshold in the window, kick once and mark flagged. */
  // TODO: ensure the user is kicked and can join back after cooldown. if they try to join, kick them.
  async maybeKickForSpam(channelId: string, userId: string): Promise<void> {
    const count = await this.recordMessage(userId);
    if (count < this.threshold) return;
    if (await this.isSpamming(userId)) return; // idempotent

    await this.markSpamming(userId);
    try {
      const ok = await this.slack.kickUserFromChannel(channelId, userId);
      if (ok) {
        logger.warn({ userId, channelId, count }, 'User kicked for spam');
      } else {
        logger.error({ userId, channelId }, 'Failed to kick spamming user');
      }
    } catch (err) {
      logger.error({ err }, 'Error kicking spamming user');
    }
  }
}


