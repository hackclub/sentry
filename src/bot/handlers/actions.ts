import { App, BlockAction, MessageShortcut } from '@slack/bolt';
import { DatabaseService } from '../../services/DatabaseService';
import { logger } from '../../utils/logger';

export function registerActionHandlers(
  app: App,
  deps: { db: DatabaseService }
) {
  app.shortcut('whitelist_thread', async ({ shortcut, ack, client }) => {
    await ack();

    const messageShortcut = shortcut as MessageShortcut;
    const { channel, message } = messageShortcut;
    
    const isUserWhitelisted = await deps.db.isUserWhitelisted(messageShortcut.user.id);
    
    if (!isUserWhitelisted) {
      await client.chat.postEphemeral({
        channel: channel.id,
        user: messageShortcut.user.id,
        text: `❌ You must be whitelisted to whitelist threads.`,
      });
      return;
    }

    const threadTs = message.thread_ts || message.ts;
    const channelId = channel.id;

    try {
      await deps.db.addAllowedThreadToSpeak(threadTs, channelId);
      
      await client.chat.postEphemeral({
        channel: channelId,
        user: messageShortcut.user.id,
        text: `✅ Thread whitelisted! Messages in this thread will no longer be deleted.`,
      });

      logger.info({ threadTs, channelId }, 'Thread whitelisted via message action');
    } catch (error) {
      logger.error({ error, threadTs, channelId }, 'Failed to whitelist thread');
      
      await client.chat.postEphemeral({
        channel: channelId,
        user: messageShortcut.user.id,
        text: `❌ Failed to whitelist thread. Please try again.`,
      });
    }
  });
}
