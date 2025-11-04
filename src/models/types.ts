export interface DeleteMessageJobData {
  channelId: string;
  messageTs: string;
  userId: string;
}

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}


