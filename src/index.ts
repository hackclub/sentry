import dotenv from 'dotenv';
import { BotApp } from './bot/app';
import { SlackService } from './services/SlackService';
import { DatabaseService } from './services/DatabaseService';
import { RedisService } from './services/RedisService';
import { DeleteQueue } from './queue/DeleteQueue';
import { logger } from './utils/logger';

dotenv.config();

const requiredEnvVars = [
  'SLACK_BOT_TOKEN',
  'SLACK_USER_TOKEN',
  'SLACK_SIGNING_SECRET',
  'SLACK_APP_TOKEN',
  'DATABASE_URL',
  'REDIS_URL'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`smth is missing ${envVar}`);
    process.exit(1);
  }
}

const slack = new SlackService(process.env.SLACK_BOT_TOKEN!, process.env.SLACK_USER_TOKEN!);
const db = new DatabaseService();
const redis = new RedisService();
const deleteQueue = new DeleteQueue(slack);
const bot = new BotApp(slack, db, redis, deleteQueue, {
  botToken: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  appToken: process.env.SLACK_APP_TOKEN!,
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  try {
    await bot.stop();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await bot.stop();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the bot
bot.start(parseInt(process.env.PORT || '3000')).catch((error) => {
  logger.error({ error }, '❌ Failed to start bot');
  process.exit(1);
});
