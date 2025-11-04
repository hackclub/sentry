import { App } from '@slack/bolt';
import { SlackService } from '../services/SlackService';
import { DatabaseService } from '../services/DatabaseService';
import { RedisService } from '../services/RedisService';
import { DeleteQueue } from '../queue/DeleteQueue';
import { registerEventHandlers } from './handlers/events';
import { SpamService } from '../services/SpamService';
import { logger } from '../utils/logger';

export class BotApp {
  private readonly app: App;
  constructor(
    private readonly slack: SlackService,
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly queue: DeleteQueue,
    tokens: { botToken: string;  appToken: string },
  ) {
    this.app = new App({ token: tokens.botToken, socketMode: true, appToken: tokens.appToken });
    const spam = new SpamService(this.redis, this.slack);
    registerEventHandlers(this.app, { db: this.db, queue: this.queue, spam });
  }

  async start(port: number): Promise<void> {
    await this.redis.connect();
    await this.queue.startWorker();
    await this.app.start(port);
    logger.info({ port }, 'Slack bot is running');
  }

  async stop(): Promise<void> {
    await this.app.stop();
    await this.queue.stopWorker();
    await this.redis.disconnect();
  }
}


