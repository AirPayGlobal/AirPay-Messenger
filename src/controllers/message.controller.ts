import { Request, Response, NextFunction } from 'express';
import { messageService } from '../services/message.service';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';
import { MessageChannel } from '@prisma/client';

export class MessageController {
  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await messageService.sendMessage(req.body);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;

      const message = await messageService.getMessage(messageId as string);

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessageStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;

      const message = await messageService.getMessage(messageId as string);

      res.json({
        success: true,
        data: {
          messageId: message.id,
          status: message.status,
          channel: message.channel,
          sentAt: message.sentAt,
          deliveredAt: message.deliveredAt,
          readAt: message.readAt,
          failedAt: message.failedAt,
          errorMessage: message.errorMessage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessageHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { contactId } = req.query;
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);

      if (!contactId || typeof contactId !== 'string') {
        throw new ValidationError('Contact ID is required');
      }

      const result = await messageService.getMessageHistory(contactId, limit, offset);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();
