import { pgTable, text, timestamp, boolean, primaryKey } from 'drizzle-orm/pg-core';

export const whitelistedUsers = pgTable('whitelisted_users', {
  userId: text('user_id').notNull(),
  username: text('username').notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(), // soft delete (learned by mession w/ devlogs </3)
}, (table) => ({
  pk: primaryKey({ columns: [table.userId] }),
}));

export const whitelistedChannels = pgTable('whitelisted_channels', {
  channelId: text('channel_id').notNull(),
  channelName: text('channel_name').notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.channelId] }),
}));

export const messageQueue = pgTable('message_queue', {
  id: text('id').primaryKey(),
  messageTs: text('message_ts').notNull(),
  channelId: text('channel_id').notNull(),
  userId: text('user_id').notNull(),
  queuedAt: timestamp('queued_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  status: text('status').notNull(), // 'pending', 'processing', 'completed', 'failed'
  retryCount: text('retry_count').default('0').notNull(),
  errorMessage: text('error_message'),
  isThread: boolean('is_thread').default(false).notNull(),
  threadTs: text('thread_ts'),
});

