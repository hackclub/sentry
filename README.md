# Slack Message Deletion Bot

A resilient Slack bot built with Slack Bolt, Drizzle ORM, and PostgreSQL that can delete messages and threads in whitelisted channels. The bot follows OOP principles and DRY methodology for maintainable code.

## Features

- **Automatic Message Deletion**: Automatically deletes messages from non-whitelisted users using Slack's `chat.delete` API
- **Queue System**: Processes deletions in a queue with rate limiting (300 deletions/minute)
- **Rate Limit Protection**: Automatically removes users who send messages too rapidly to prevent bot rate limiting
- **Whitelist Management**: Control which users and channels the bot operates on
- **Resilient Design**: Retry logic, error handling, and graceful degradation
- **Database Tracking**: Track all deleted messages and queue status in PostgreSQL
- **Slash Commands**: Easy-to-use commands for whitelist and queue management

## Architecture

The bot is built using Object-Oriented Programming principles with the following key components:

- **MessageDeletionBot**: Main bot class handling Slack events and commands
- **SlackService**: Handles all Slack API interactions with retry logic
- **MessageQueueService**: Manages message deletion queue with rate limiting and rate limit protection
- **DatabaseService**: Manages database operations using Drizzle ORM
- **Database Schema**: PostgreSQL tables for whitelists, queue, and rate limit protection

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Slack App with appropriate permissions

## Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
```

3. Configure your `.env` file with:
   - `SLACK_BOT_TOKEN`: Your Slack bot token (xoxb-...)
   - `SLACK_USER_TOKEN`: Your Slack user token (xoxp-...) - needed for deleting messages
   - `SLACK_SIGNING_SECRET`: Your Slack app signing secret
   - `SLACK_APP_TOKEN`: Your Slack app token (xapp-...)
   - `DATABASE_URL`: PostgreSQL connection string
   - `PORT`: Server port (default: 3000)

## Database Setup

1. Generate database migrations:
```bash
npm run db:generate
```

2. Run migrations:
```bash
npm run db:migrate
```

3. (Optional) Seed with example data:
```bash
npm run db:seed
```

## Running the Bot

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Slack App Configuration

Your Slack app needs the following OAuth scopes:

**Bot Token Scopes:**
- `channels:history` - To read channel history
- `groups:history` - To read private channel history
- `im:history` - To read direct message history
- `mpim:history` - To read group direct message history
- `users:read` - To get user information
- `channels:read` - To get channel information

**User Token Scopes (for message deletion):**
- `chat:write` - To delete messages
- `channels:write` - To delete messages in channels
- `groups:write` - To delete messages in private channels
- `im:write` - To delete messages in direct messages
- `mpim:write` - To delete messages in group direct messages

**Important:** You need both a bot token and a user token. The user token is required because bots cannot delete messages from other users - only users can delete messages.

Event subscriptions:
- `message.channels`
- `message.groups`
- `message.im`
- `message.mpim`
- `app_mention`

Slash commands:
- `/add-user`
- `/remove-user`
- `/add-channel`
- `/remove-channel`
- `/list-whitelist`
- `/whitelist-me`
- `/queue-status`

## Usage

### Whitelist Management

Add a user to the whitelist:
```
/add-user U1234567890
```

Add yourself to the whitelist:
```
/whitelist-me
```

Add a channel to the whitelist:
```
/add-channel C1234567890
```

List all whitelisted users and channels:
```
/list-whitelist
```


### Auto-deletion

The bot automatically deletes messages from non-whitelisted users in whitelisted channels. This provides a way to keep channels clean by only allowing specific users to post.

### Queue System

Messages are processed in a queue with rate limiting:
- **Rate Limit**: 300 deletions per minute (200ms delay between calls)
- **Queue Processing**: Messages are processed every 500ms for fast response
- **Retry Logic**: Failed deletions are retried up to 3 times
- **Status Tracking**: Monitor queue status with `/queue-status`

### Rate Limit Protection

The bot automatically protects itself from rate limiting:
- **Threshold**: 8 messages per 10 seconds triggers protection
- **Action**: Rapid users are automatically removed from whitelist
- **Purpose**: Prevents users from overwhelming the bot and hitting Slack's rate limits
- **Tracking**: User message counts are tracked and reset every 10 seconds

### Bot Information

Get help:
```
@bot help
```

Check bot status:
```
@bot status
```

## Database Schema

### Whitelisted Users
- `user_id` (Primary Key): Slack user ID
- `username`: Slack username
- `added_at`: Timestamp when added
- `is_active`: Whether the user is currently whitelisted

### Whitelisted Channels
- `channel_id` (Primary Key): Slack channel ID
- `channel_name`: Slack channel name
- `added_at`: Timestamp when added
- `is_active`: Whether the channel is currently whitelisted

### Deleted Messages
- `id` (Primary Key): Unique message identifier
- `message_ts`: Slack message timestamp
- `channel_id`: Channel where message was deleted
- `user_id`: User who triggered the deletion
- `deleted_at`: Timestamp of deletion
- `is_thread`: Whether it was a thread deletion
- `thread_ts`: Thread timestamp (if applicable)

### Message Queue
- `id` (Primary Key): Unique queue identifier
- `message_ts`: Slack message timestamp to delete
- `channel_id`: Channel where message is located
- `user_id`: User who sent the message
- `queued_at`: When message was queued for deletion
- `processed_at`: When deletion was attempted
- `status`: Queue status (pending, processing, completed, failed)
- `retry_count`: Number of retry attempts
- `error_message`: Error details if deletion failed

### User Rate Limit Tracking
- `user_id` (Primary Key): Slack user ID
- `message_count`: Number of messages sent in current window
- `last_message_at`: Timestamp of last message
- `is_spamming`: Whether user is currently flagged for rate limit protection
- `spam_detected_at`: When rate limit protection was first triggered

## Error Handling & Resilience

The bot includes several resilience features:

- **Retry Logic**: Failed API calls are retried with exponential backoff
- **Rate Limiting**: Built-in delays to respect Slack's rate limits
- **Error Logging**: Comprehensive error logging for debugging
- **Graceful Shutdown**: Proper cleanup on SIGINT/SIGTERM
- **Database Transactions**: Safe database operations
- **Validation**: Input validation for all commands

## Development

### Project Structure
```
src/
├── bot/
│   └── MessageDeletionBot.ts    # Main bot class
├── database/
│   ├── connection.ts            # Database connection
│   └── schema.ts               # Database schema
├── services/
│   ├── DatabaseService.ts      # Database operations
│   └── SlackService.ts         # Slack API operations
├── scripts/
│   ├── migrate.ts              # Migration runner
│   └── seed.ts                 # Database seeder
└── index.ts                    # Application entry point
```

### Adding New Features

1. Extend the appropriate service class
2. Add new command handlers in `MessageDeletionBot`
3. Update database schema if needed
4. Create migration for schema changes
5. Add tests for new functionality

## License

MIT License - see LICENSE file for details.
