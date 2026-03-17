import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/client';
import { whatsappService } from '../services/whatsapp.service';
import { messageService } from '../services/message.service';
import { logger } from '../utils/logger';
import { MessageStatus, MessageDirection } from '@prisma/client';

export class WebhookController {
  // WhatsApp Webhook Verification
  async verifyWhatsApp(req: Request, res: Response, next: NextFunction) {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const result = await whatsappService.verifyWebhook(
        mode as string,
        token as string,
        challenge as string
      );

      if (result) {
        res.status(200).send(result);
      } else {
        res.sendStatus(403);
      }
    } catch (error) {
      next(error);
    }
  }

  // WhatsApp Webhook Handler
  async handleWhatsApp(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;

      logger.info('WhatsApp webhook received', { payload });

      // Log webhook
      await prisma.webhookLog.create({
        data: {
          source: 'whatsapp',
          eventType: payload.entry?.[0]?.changes?.[0]?.field || 'unknown',
          payload,
        },
      });

      // Process webhook asynchronously
      this.processWhatsAppWebhook(payload).catch((error) => {
        logger.error('Failed to process WhatsApp webhook', { error: error.message });
      });

      // Respond immediately to WhatsApp
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }

  private async processWhatsAppWebhook(payload: any) {
    try {
      const entry = payload.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      if (!value) {
        logger.warn('Invalid WhatsApp webhook payload');
        return;
      }

      // Handle incoming messages
      if (value.messages && value.messages.length > 0) {
        for (const message of value.messages) {
          await this.handleIncomingWhatsAppMessage(message, value);
        }
      }

      // Handle message status updates
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          await this.handleWhatsAppStatus(status);
        }
      }
    } catch (error: any) {
      logger.error('Error processing WhatsApp webhook', { error: error.message });
    }
  }

  private async handleIncomingWhatsAppMessage(message: any, value: any) {
    try {
      const from = message.from;
      const messageType = message.type;
      let body = '';

      // Extract message body based on type
      if (messageType === 'text') {
        body = message.text.body;
      } else if (messageType === 'image') {
        body = `[Image] ${message.image.caption || ''}`;
      } else if (messageType === 'document') {
        body = `[Document] ${message.document.filename}`;
      }

      // Find or create contact
      let contact = await prisma.contact.findUnique({
        where: { whatsappId: from },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: { whatsappId: from },
        });
      }

      // Create message record
      await prisma.message.create({
        data: {
          contactId: contact.id,
          channel: 'whatsapp',
          direction: MessageDirection.inbound,
          status: MessageStatus.delivered,
          body,
          externalId: message.id,
          metadata: { messageType, rawMessage: message },
          deliveredAt: new Date(),
        },
      });

      // Mark as read
      await whatsappService.markMessageAsRead(message.id);

      logger.info('Incoming WhatsApp message processed', {
        from,
        messageId: message.id,
      });
    } catch (error: any) {
      logger.error('Failed to handle incoming WhatsApp message', {
        error: error.message,
      });
    }
  }

  private async handleWhatsAppStatus(status: any) {
    try {
      const messageId = status.id;
      const statusType = status.status;

      // Find message by external ID
      const message = await prisma.message.findFirst({
        where: { externalId: messageId },
      });

      if (!message) {
        logger.warn('Message not found for status update', { messageId });
        return;
      }

      // Update message status
      let newStatus: MessageStatus;
      let timestamp = new Date(parseInt(status.timestamp) * 1000);

      switch (statusType) {
        case 'sent':
          newStatus = MessageStatus.sent;
          break;
        case 'delivered':
          newStatus = MessageStatus.delivered;
          break;
        case 'read':
          newStatus = MessageStatus.read;
          break;
        case 'failed':
          newStatus = MessageStatus.failed;
          break;
        default:
          return;
      }

      await messageService.updateMessageStatus(message.id, newStatus, timestamp);

      logger.info('WhatsApp message status updated', {
        messageId: message.id,
        status: newStatus,
      });
    } catch (error: any) {
      logger.error('Failed to handle WhatsApp status', { error: error.message });
    }
  }

  // AWS SNS SMS Status Callback
  async handleSmsStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;

      logger.info('SMS status webhook received', { payload });

      // Log webhook
      await prisma.webhookLog.create({
        data: {
          source: 'sns',
          eventType: payload.Type || 'status',
          payload,
        },
      });

      // Process SNS notification
      if (payload.Type === 'Notification') {
        const message = JSON.parse(payload.Message);

        // Extract status information
        const { status, providerResponse } = message;

        // Find message by external ID
        // Note: AWS SNS doesn't always provide the original message ID
        // You may need to implement additional tracking

        logger.info('SMS status notification processed', { status });
      }

      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }

  // AWS SES Email Events
  async handleEmailEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;

      logger.info('Email event webhook received', { payload });

      // Log webhook
      await prisma.webhookLog.create({
        data: {
          source: 'ses',
          eventType: payload.Type || 'notification',
          payload,
        },
      });

      // Process SNS notification from SES
      if (payload.Type === 'Notification') {
        const message = JSON.parse(payload.Message);
        await this.processEmailEvent(message);
      }

      // Handle subscription confirmation
      if (payload.Type === 'SubscriptionConfirmation') {
        logger.info('SES SNS subscription confirmation', {
          subscribeUrl: payload.SubscribeURL,
        });
      }

      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }

  private async processEmailEvent(event: any) {
    try {
      const eventType = event.eventType || event.notificationType;
      const mail = event.mail;

      // Find message by external ID (SES Message ID)
      const message = await prisma.message.findFirst({
        where: { externalId: mail.messageId },
      });

      if (!message) {
        logger.warn('Message not found for email event', {
          messageId: mail.messageId,
        });
        return;
      }

      let newStatus: MessageStatus | null = null;

      switch (eventType) {
        case 'Delivery':
          newStatus = MessageStatus.delivered;
          break;
        case 'Bounce':
          newStatus = MessageStatus.bounced;
          break;
        case 'Complaint':
          newStatus = MessageStatus.failed;
          break;
        case 'Reject':
          newStatus = MessageStatus.failed;
          break;
        case 'Open':
          // Track opens but don't change status
          logger.info('Email opened', { messageId: message.id });
          break;
        case 'Click':
          // Track clicks but don't change status
          logger.info('Email link clicked', { messageId: message.id });
          break;
      }

      if (newStatus) {
        await messageService.updateMessageStatus(message.id, newStatus);
        logger.info('Email status updated', {
          messageId: message.id,
          status: newStatus,
        });
      }
    } catch (error: any) {
      logger.error('Failed to process email event', { error: error.message });
    }
  }
}

export const webhookController = new WebhookController();
