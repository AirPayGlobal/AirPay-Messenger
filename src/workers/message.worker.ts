import { Job } from 'bull';
import { queueService, MessageJob } from '../services/queue.service';
import { messageService } from '../services/message.service';
import { logger } from '../utils/logger';

export class MessageWorker {
  start() {
    // Process WhatsApp queue
    queueService.getWhatsAppQueue().process(async (job: Job<MessageJob>) => {
      logger.info('Processing WhatsApp message job', {
        jobId: job.id,
        messageId: job.data.messageId,
      });

      await messageService.processMessage(job.data);
    });

    // Process SMS queue
    queueService.getSmsQueue().process(async (job: Job<MessageJob>) => {
      logger.info('Processing SMS message job', {
        jobId: job.id,
        messageId: job.data.messageId,
      });

      await messageService.processMessage(job.data);
    });

    // Process Email queue
    queueService.getEmailQueue().process(async (job: Job<MessageJob>) => {
      logger.info('Processing Email message job', {
        jobId: job.id,
        messageId: job.data.messageId,
      });

      await messageService.processMessage(job.data);
    });

    logger.info('Message workers started');
  }

  async stop() {
    await queueService.closeAll();
    logger.info('Message workers stopped');
  }
}

export const messageWorker = new MessageWorker();
