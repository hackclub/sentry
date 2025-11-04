import dotenv from 'dotenv';
import { DatabaseService } from '../services/DatabaseService';

// Load environment variables
dotenv.config();

async function seedDatabase() {
  const dbService = new DatabaseService();
  
  try {
    console.log('🌱 Seeding database...');
    
    // Add some example users (replace with actual user IDs)
    const exampleUsers = [
      { userId: 'U1234567890', username: 'admin' },
      { userId: 'U0987654321', username: 'moderator' },
    ];
    
    for (const user of exampleUsers) {
      await dbService.addWhitelistedUser(user.userId, user.username);
      console.log(`✅ Added user: ${user.username} (${user.userId})`);
    }
    
    // Add some example channels (replace with actual channel IDs)
    const exampleChannels = [
      { channelId: 'C1234567890', channelName: 'general' },
      { channelId: 'C0987654321', channelName: 'bot-testing' },
    ];
    
    for (const channel of exampleChannels) {
      await dbService.addWhitelistedChannel(channel.channelId, channel.channelName);
      console.log(`✅ Added channel: ${channel.channelName} (${channel.channelId})`);
    }
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
