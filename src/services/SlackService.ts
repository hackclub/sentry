import { WebClient } from '@slack/web-api';
import https from 'https';
import { logger } from '../utils/logger';

export class SlackService {
  private botClient: WebClient;
  private userClient: WebClient;

  constructor(botToken: string, userToken: string) {
    const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });
    this.botClient = new WebClient(botToken, { agent: keepAliveAgent, retryConfig: { retries: 0 } });
    this.userClient = new WebClient(userToken, { agent: keepAliveAgent, retryConfig: { retries: 0 } });
  }

  async deleteMessage(channelId: string, messageTs: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.userClient.chat.delete({
        channel: channelId,
        ts: messageTs,
      });

      if (result.ok) {
        logger.info({ messageTs, channelId }, 'Message deleted');
        return { success: true };
      } else {
        logger.error({ messageTs, channelId, error: result.error }, 'Delete failed');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      logger.error({ error, messageTs, channelId }, 'Error deleting message');
      
      // Check for errors that indicate the message is already deleted or inaccessible
      const errorCode = error?.data?.error;
      if (errorCode === 'message_not_found' || 
          errorCode === 'channel_not_found' || 
          errorCode === 'not_in_channel' ||
          errorCode === 'cant_delete_message') {
        return { success: false, error: errorCode };
      }
      
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  async getUserInfo(userId: string): Promise<{ id: string; name: string } | null> {
    try {
      const result = await this.botClient.users.info({ user: userId });
      return {
        id: result.user?.id || userId,
        name: result.user?.name || 'Unknown',
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user info');
      return null;
    }
  }

  async getChannelInfo(channelId: string): Promise<{ id: string; name: string } | null> {
    try {
      const result = await this.botClient.conversations.info({ channel: channelId });
      return {
        id: result.channel?.id || channelId,
        name: (result.channel as any)?.name || 'Unknown',
      };
    } catch (error) {
      logger.error({ error, channelId }, 'Failed to get channel info');
      return null;
    }
  }

  async kickUserFromChannel(channelId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.userClient.conversations.kick({
        channel: channelId,
        user: userId,
      });

      if (result.ok) {
        logger.info({ userId, channelId }, 'User removed from channel');
        return true;
      } else {
        logger.error({ userId, channelId, error: result.error }, 'Failed to remove user from channel');
        return false;
      }
    } catch (error) {
      logger.error({ error, userId, channelId }, 'Error removing user from channel');
      return false;
    }
  }
}
