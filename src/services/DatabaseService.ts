import { eq, and } from 'drizzle-orm';
import { db } from '../database/connection';
import { whitelistedUsers, whitelistedChannels, allowedThreadsToSpeak } from '../database/schema';

export class DatabaseService {
  // Whitelisted Users Management
  async addWhitelistedUser(userId: string, username: string): Promise<void> {
    await db.insert(whitelistedUsers).values({
      userId,
      username,
      isActive: true,
    }).onConflictDoUpdate({
      target: whitelistedUsers.userId,
      set: {
        username,
        isActive: true,
      },
    });
  }

  async removeWhitelistedUser(userId: string): Promise<void> {
    await db.update(whitelistedUsers)
      .set({ isActive: false })
      .where(eq(whitelistedUsers.userId, userId));
  }

  async isUserWhitelisted(userId: string): Promise<boolean> {
    const result = await db.select()
      .from(whitelistedUsers)
      .where(and(
        eq(whitelistedUsers.userId, userId),
        eq(whitelistedUsers.isActive, true)
      ))
      .limit(1);
    
    return result.length > 0;
  }

  async getWhitelistedUsers(): Promise<Array<{ userId: string; username: string }>> {
    const users = await db.select({
      userId: whitelistedUsers.userId,
      username: whitelistedUsers.username,
    })
    .from(whitelistedUsers)
    .where(eq(whitelistedUsers.isActive, true));
    
    return users;
  }

  // Whitelisted Channels Management
  async addWhitelistedChannel(channelId: string, channelName: string): Promise<void> {
    await db.insert(whitelistedChannels).values({
      channelId,
      channelName,
      isActive: true,
    }).onConflictDoUpdate({
      target: whitelistedChannels.channelId,
      set: {
        channelName,
        isActive: true,
      },
    });
  }

  async removeWhitelistedChannel(channelId: string): Promise<void> {
    await db.update(whitelistedChannels)
      .set({ isActive: false })
      .where(eq(whitelistedChannels.channelId, channelId));
  }

  async isChannelWhitelisted(channelId: string): Promise<boolean> {
    const result = await db.select()
      .from(whitelistedChannels)
      .where(and(
        eq(whitelistedChannels.channelId, channelId),
        eq(whitelistedChannels.isActive, true)
      ))
      .limit(1);
    
    return result.length > 0;
  }

  async getWhitelistedChannels(): Promise<Array<{ channelId: string; channelName: string }>> {
    const channels = await db.select({
      channelId: whitelistedChannels.channelId,
      channelName: whitelistedChannels.channelName,
    })
    .from(whitelistedChannels)
    .where(eq(whitelistedChannels.isActive, true));
    
    return channels;
  }

  // Allowed Threads To Speak Management
  async addAllowedThreadToSpeak(threadTs: string, channelId: string): Promise<void> {
    await db.insert(allowedThreadsToSpeak).values({
      threadTs,
      channelId,
    }).onConflictDoNothing();
  }

  async isThreadAllowedToSpeak(threadTs: string, channelId: string): Promise<boolean> {
    const result = await db.select()
      .from(allowedThreadsToSpeak)
      .where(and(
        eq(allowedThreadsToSpeak.threadTs, threadTs),
        eq(allowedThreadsToSpeak.channelId, channelId)
      ))
      .limit(1);
    
    return result.length > 0;
  }

}
