import { prisma } from '../database/client';
import { MessageChannel, MessageStatus, MessageDirection } from '@prisma/client';
import { emailService } from './email.service';
import { smsService } from './sms.service';
import { whatsappService } from './whatsapp.service';
import { storageService } from './storage.service';
import { queueService, MessageJob } from './queue.service';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export interface SendMessageRequest {
  channel: MessageChannel;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body: string;
  html?: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
  attachments?: Array<{
    fileName: string;
    fileData?: string; // base64
    filePath?: string;
    mimeType: string;
  }>;
  scheduledAt?: Date;
  metadata?: any;
}

export interface SendMessageResponse {
  success: boolean;
  messageId: string;
  status: MessageStatus;
  estimatedDelivery?: Date;
}

export class MessageService {
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      // Validate request
      this.validateRequest(request);

      // Find or create contact
      const contact = await this.findOrCreateContact(request.channel, request.to);

      // Process template if provided
      let { body, html, subject } = request;
      if (request.templateId) {
        const template = await prisma.template.findUnique({
          where: { id: request.templateId },
        });

        if (!template || !template.isActive) {
          throw new NotFoundError('Template not found or inactive');
        }

        if (template.channel !== request.channel) {
          throw new ValidationError('Template channel mismatch');
        }

        body = this.replaceTemplateVariables(
          template.bodyTemplate,
          request.templateVariables || {}
        );

        if (template.htmlTemplate) {
          html = this.replaceTemplateVariables(
            template.htmlTemplate,
            request.templateVariables || {}
          );
        }

        if (template.subjectTemplate) {
          subject = this.replaceTemplateVariables(
            template.subjectTemplate,
            request.templateVariables || {}
          );
        }
      }

      // Handle attachments
      const attachmentData: Array<{ fileName: string; s3Key: string; fileType: string }> = [];

      if (request.attachments && request.attachments.length > 0) {
        for (const attachment of request.attachments) {
          const result = await storageService.uploadBase64File(
            attachment.fileData || '',
            attachment.fileName,
            attachment.mimeType,
            'attachments'
          );

          attachmentData.push({
            fileName: attachment.fileName,
            s3Key: result.key,
            fileType: attachment.mimeType,
          });
        }
      }

      // Create message record
      const message = await prisma.message.create({
        data: {
          contactId: contact.id,
          channel: request.channel,
          direction: MessageDirection.outbound,
          status: request.scheduledAt ? MessageStatus.queued : MessageStatus.queued,
          subject,
          body,
          htmlBody: html,
          templateId: request.templateId,
          scheduledAt: request.scheduledAt,
          metadata: request.metadata,
        },
      });

      // Create attachments if any
      if (attachmentData.length > 0) {
        await prisma.attachment.createMany({
          data: attachmentData.map((att) => ({
            messageId: message.id,
            fileName: att.fileName,
            fileType: att.fileType,
            fileSize: 0, // Will be updated later
            s3Key: att.s3Key,
            s3Url: storageService.getPublicUrl(att.s3Key),
          })),
        });
      }

      // Add message to queue
      const jobData: MessageJob = {
        messageId: message.id,
        channel: request.channel,
        to: request.to,
        subject,
        body,
        html,
        templateId: request.templateId,
        templateVariables: request.templateVariables,
        attachments: attachmentData,
        metadata: request.metadata,
      };

      let jobId: string;
      if (request.scheduledAt) {
        jobId = await queueService.addScheduledMessage(jobData, request.scheduledAt);
      } else {
        jobId = await queueService.addMessage(jobData);
      }

      // Create queue job record
      await prisma.messageQueueJob.create({
        data: {
          messageId: message.id,
          jobId,
          status: 'pending',
        },
      });

      logger.info('Message created and queued', {
        messageId: message.id,
        channel: request.channel,
        to: request.to,
      });

      return {
        success: true,
        messageId: message.id,
        status: message.status,
        estimatedDelivery: request.scheduledAt,
      };
    } catch (error: any) {
      logger.error('Failed to send message', {
        error: error.message,
        channel: request.channel,
        to: request.to,
      });
      throw error;
    }
  }

  async processMessage(job: MessageJob): Promise<void> {
    try {
      logger.info('Processing message', {
        messageId: job.messageId,
        channel: job.channel,
      });

      // Update message status to sending
      await prisma.message.update({
        where: { id: job.messageId },
        data: { status: MessageStatus.sent, sentAt: new Date() },
      });

      let externalId: string;

      // Send via appropriate channel
      switch (job.channel) {
        case MessageChannel.email:
          const emailResult = await emailService.sendEmail({
            to: job.to,
            subject: job.subject || '',
            body: job.body,
            html: job.html,
          });
          externalId = emailResult.messageId;
          break;

        case MessageChannel.sms:
          const smsResult = await smsService.sendSms({
            to: job.to,
            body: job.body,
          });
          externalId = smsResult.messageId;
          break;

        case MessageChannel.whatsapp:
          const whatsappResult = await whatsappService.sendTextMessage(job.to, job.body);
          externalId = whatsappResult.messageId;
          break;

        default:
          throw new ValidationError('Invalid channel');
      }

      // Update message with external ID
      await prisma.message.update({
        where: { id: job.messageId },
        data: {
          externalId,
          status: MessageStatus.sent,
        },
      });

      // Update queue job status
      await prisma.messageQueueJob.updateMany({
        where: { messageId: job.messageId },
        data: { status: 'completed' },
      });

      logger.info('Message sent successfully', {
        messageId: job.messageId,
        externalId,
      });
    } catch (error: any) {
      logger.error('Failed to process message', {
        messageId: job.messageId,
        error: error.message,
      });

      // Update message status to failed
      await prisma.message.update({
        where: { id: job.messageId },
        data: {
          status: MessageStatus.failed,
          failedAt: new Date(),
          errorMessage: error.message,
        },
      });

      // Update queue job status
      await prisma.messageQueueJob.updateMany({
        where: { messageId: job.messageId },
        data: { status: 'failed', errorMessage: error.message },
      });

      throw error;
    }
  }

  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    timestamp?: Date
  ): Promise<void> {
    const updateData: any = { status };

    switch (status) {
      case MessageStatus.delivered:
        updateData.deliveredAt = timestamp || new Date();
        break;
      case MessageStatus.read:
        updateData.readAt = timestamp || new Date();
        break;
      case MessageStatus.failed:
        updateData.failedAt = timestamp || new Date();
        break;
      case MessageStatus.bounced:
        updateData.failedAt = timestamp || new Date();
        break;
    }

    await prisma.message.update({
      where: { id: messageId },
      data: updateData,
    });

    logger.info('Message status updated', { messageId, status });
  }

  async getMessage(messageId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        contact: true,
        attachments: true,
        template: true,
      },
    });

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    return message;
  }

  async getMessageHistory(contactId: string, limit: number = 50, offset: number = 0) {
    const messages = await prisma.message.findMany({
      where: { contactId },
      include: {
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.message.count({
      where: { contactId },
    });

    return { messages, total, limit, offset };
  }

  private async findOrCreateContact(channel: MessageChannel, identifier: string) {
    let contact;

    switch (channel) {
      case MessageChannel.email:
        contact = await prisma.contact.findUnique({ where: { email: identifier } });
        if (!contact) {
          contact = await prisma.contact.create({
            data: { email: identifier },
          });
        }
        break;

      case MessageChannel.sms:
        contact = await prisma.contact.findUnique({ where: { phone: identifier } });
        if (!contact) {
          contact = await prisma.contact.create({
            data: { phone: identifier },
          });
        }
        break;

      case MessageChannel.whatsapp:
        contact = await prisma.contact.findUnique({ where: { whatsappId: identifier } });
        if (!contact) {
          contact = await prisma.contact.create({
            data: { whatsappId: identifier },
          });
        }
        break;
    }

    return contact;
  }

  private validateRequest(request: SendMessageRequest): void {
    if (!request.channel) {
      throw new ValidationError('Channel is required');
    }

    if (!request.to) {
      throw new ValidationError('Recipient is required');
    }

    if (!request.body && !request.templateId) {
      throw new ValidationError('Body or template is required');
    }

    if (request.channel === MessageChannel.email && !request.subject && !request.templateId) {
      throw new ValidationError('Subject is required for email');
    }
  }

  private replaceTemplateVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }
}

export const messageService = new MessageService();
