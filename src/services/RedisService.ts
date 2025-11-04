import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      logger.error({ err }, 'Redis Client Error');
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('✅ Connected to Redis');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('❌ Disconnected from Redis');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  // Spam tracking methods
  async incrementUserMessageCount(userId: string): Promise<number> {
    const key = `spam:${userId}`;
    const count = await this.client.incr(key);
    
    // Set expiration to 10 seconds (spam window)
    await this.client.expire(key, 10);
    
    return count;
  }

  async getUserMessageCount(userId: string): Promise<number> {
    const key = `spam:${userId}`;
    const count = await this.client.get(key);
    return count ? parseInt(count) : 0;
  }

  async markUserAsSpamming(userId: string): Promise<void> {
    const key = `spam:${userId}`;
    await this.client.set(key, 'spamming');
    await this.client.expire(key, 300); // 5 minutes
  }

  async isUserSpamming(userId: string): Promise<boolean> {
    const key = `spam:${userId}`;
    const value = await this.client.get(key);
    return value === 'spamming';
  }

  async resetUserSpamTracking(userId: string): Promise<void> {
    const key = `spam:${userId}`;
    await this.client.del(key);
  }

  // Health check
  async ping(): Promise<string> {
    return await this.client.ping();
  }

  // Get connection status
  isHealthy(): boolean {
    return this.isConnected;
  }

  // Generic helpers used by SpamService
  async incr(key: string): Promise<number> {
    const v = await this.client.incr(key);
    return v;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, { EX: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }
}
