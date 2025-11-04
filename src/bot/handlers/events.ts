import { SlackEventMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { DatabaseService } from '../../services/DatabaseService';
import { DeleteQueue } from '../../queue/DeleteQueue';
import { SpamService } from '../../services/SpamService';

export function registerEventHandlers(
  app: any,
  deps: { db: DatabaseService; queue: DeleteQueue; spam: SpamService }
) {
  app.event('message', async (args: SlackEventMiddlewareArgs<'message'> & AllMiddlewareArgs) => {
    const { event } = args;
    // if (event.subtype && event.subtype) return;
    if (!event.user) return;

    // Skip bot messages and non-whitelisted channels early
    // if (event.bot_id) return;
    const isChannelWhitelisted = await deps.db.isChannelWhitelisted(event.channel);
    if (!isChannelWhitelisted) return;

    const isUserWhitelisted = await deps.db.isUserWhitelisted(event.user);
    if (isUserWhitelisted) return;

    // Spam detection window + kick
    await deps.spam.maybeKickForSpam(event.channel, event.user);

    // Enqueue deletion (dedup handled by queue jobId)
    await deps.queue.enqueue({ channelId: event.channel, messageTs: event.ts, userId: event.user });
  });
}


