import Bull, { Queue, Job } from 'bull';
import { config } from '../config';
import { logger } from '../utils/logger';
import { MessageChannel } from '@prisma/client';

export interface MessageJob {
  messageId: string;
  channel: MessageChannel;
  to: string;
  subject?: string;
  body: string;
  html?: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
  attachments?: Array<{
    fileName: string;
    s3Key: string;
    fileType: string;
  }>;
  metadata?: any;
}

export class QueueService {
  private messageQueue: Queue<MessageJob>;
  private whatsappQueue: Queue<MessageJob>;
  private smsQueue: Queue<MessageJob>;
  private emailQueue: Queue<MessageJob>;

  constructor() {
    const redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
    };

    // Create separate queues for each channel for better control
    this.messageQueue = new Bull('messages', { redis: redisConfig });
    this.whatsappQueue = new Bull('whatsapp', { redis: redisConfig });
    this.smsQueue = new Bull('sms', { redis: redisConfig });
    this.emailQueue = new Bull('email', { redis: redisConfig });

    this.setupQueueEvents();
  }

  private setupQueueEvents() {
    const queues = [
      { queue: this.messageQueue, name: 'messages' },
      { queue: this.whatsappQueue, name: 'whatsapp' },
      { queue: this.smsQueue, name: 'sms' },
      { queue: this.emailQueue, name: 'email' },
    ];

    queues.forEach(({ queue, name }) => {
      queue.on('completed', (job: Job) => {
        logger.info(`${name} job completed`, {
          jobId: job.id,
          messageId: job.data.messageId,
        });
      });

      queue.on('failed', (job: Job, err: Error) => {
        logger.error(`${name} job failed`, {
          jobId: job.id,
          messageId: job.data.messageId,
          error: err.message,
          attempts: job.attemptsMade,
        });
      });

      queue.on('stalled', (job: Job) => {
        logger.warn(`${name} job stalled`, {
          jobId: job.id,
          messageId: job.data.messageId,
        });
      });

      queue.on('error', (error: Error) => {
        logger.error(`${name} queue error`, { error: error.message });
      });
    });
  }

  async addMessage(data: MessageJob, priority: number = 0): Promise<string> {
    const jobOptions = {
      attempts: config.bull.attempts,
      backoff: {
        type: 'exponential',
        delay: config.bull.backoffDelay,
      },
      removeOnComplete: config.bull.removeOnComplete,
      removeOnFail: config.bull.removeOnFail,
      priority,
    };

    let queue: Queue<MessageJob>;

    // Route to appropriate queue based on channel
    switch (data.channel) {
      case 'whatsapp':
        queue = this.whatsappQueue;
        break;
      case 'sms':
        queue = this.smsQueue;
        break;
      case 'email':
        queue = this.emailQueue;
        break;
      default:
        queue = this.messageQueue;
    }

    const job = await queue.add(data, jobOptions);

    logger.info('Message added to queue', {
      jobId: job.id,
      messageId: data.messageId,
      channel: data.channel,
      queue: queue.name,
    });

    return job.id?.toString() || '';
  }

  async addScheduledMessage(data: MessageJob, scheduledAt: Date): Promise<string> {
    const delay = scheduledAt.getTime() - Date.now();

    if (delay <= 0) {
      return this.addMessage(data);
    }

    const jobOptions = {
      delay,
      attempts: config.bull.attempts,
      backoff: {
        type: 'exponential',
        delay: config.bull.backoffDelay,
      },
      removeOnComplete: config.bull.removeOnComplete,
      removeOnFail: config.bull.removeOnFail,
    };

    let queue: Queue<MessageJob>;

    switch (data.channel) {
      case 'whatsapp':
        queue = this.whatsappQueue;
        break;
      case 'sms':
        queue = this.smsQueue;
        break;
      case 'email':
        queue = this.emailQueue;
        break;
      default:
        queue = this.messageQueue;
    }

    const job = await queue.add(data, jobOptions);

    logger.info('Scheduled message added to queue', {
      jobId: job.id,
      messageId: data.messageId,
      channel: data.channel,
      scheduledAt: scheduledAt.toISOString(),
    });

    return job.id?.toString() || '';
  }

  async getJobStatus(jobId: string, channel: MessageChannel): Promise<any> {
    let queue: Queue<MessageJob>;

    switch (channel) {
      case 'whatsapp':
        queue = this.whatsappQueue;
        break;
      case 'sms':
        queue = this.smsQueue;
        break;
      case 'email':
        queue = this.emailQueue;
        break;
      default:
        queue = this.messageQueue;
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress(),
      attempts: job.attemptsMade,
      data: job.data,
      failedReason: job.failedReason,
    };
  }

  async removeJob(jobId: string, channel: MessageChannel): Promise<boolean> {
    let queue: Queue<MessageJob>;

    switch (channel) {
      case 'whatsapp':
        queue = this.whatsappQueue;
        break;
      case 'sms':
        queue = this.smsQueue;
        break;
      case 'email':
        queue = this.emailQueue;
        break;
      default:
        queue = this.messageQueue;
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      return false;
    }

    await job.remove();
    logger.info('Job removed from queue', { jobId, channel });
    return true;
  }

  async getQueueStats(channel?: MessageChannel) {
    const queues = channel
      ? [this.getQueueByChannel(channel)]
      : [this.whatsappQueue, this.smsQueue, this.emailQueue];

    const stats = await Promise.all(
      queues.map(async (queue) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        return {
          name: queue.name,
          waiting,
          active,
          completed,
          failed,
          delayed,
        };
      })
    );

    return channel ? stats[0] : stats;
  }

  private getQueueByChannel(channel: MessageChannel): Queue<MessageJob> {
    switch (channel) {
      case 'whatsapp':
        return this.whatsappQueue;
      case 'sms':
        return this.smsQueue;
      case 'email':
        return this.emailQueue;
      default:
        return this.messageQueue;
    }
  }

  getMessageQueue(): Queue<MessageJob> {
    return this.messageQueue;
  }

  getWhatsAppQueue(): Queue<MessageJob> {
    return this.whatsappQueue;
  }

  getSmsQueue(): Queue<MessageJob> {
    return this.smsQueue;
  }

  getEmailQueue(): Queue<MessageJob> {
    return this.emailQueue;
  }

  async pauseQueue(channel: MessageChannel): Promise<void> {
    const queue = this.getQueueByChannel(channel);
    await queue.pause();
    logger.info(`Queue paused`, { channel });
  }

  async resumeQueue(channel: MessageChannel): Promise<void> {
    const queue = this.getQueueByChannel(channel);
    await queue.resume();
    logger.info(`Queue resumed`, { channel });
  }

  async cleanQueue(channel: MessageChannel, grace: number = 0): Promise<void> {
    const queue = this.getQueueByChannel(channel);
    await queue.clean(grace);
    logger.info(`Queue cleaned`, { channel, grace });
  }

  async closeAll(): Promise<void> {
    await Promise.all([
      this.messageQueue.close(),
      this.whatsappQueue.close(),
      this.smsQueue.close(),
      this.emailQueue.close(),
    ]);
    logger.info('All queues closed');
  }
}

export const queueService = new QueueService();
