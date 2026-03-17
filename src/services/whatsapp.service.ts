import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ExternalServiceError, ValidationError } from '../utils/errors';

export interface WhatsAppOptions {
  to: string;
  body: string;
  type?: 'text' | 'template' | 'image' | 'document' | 'video';
  mediaUrl?: string;
  filename?: string;
  caption?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: any[];
}

export interface WhatsAppResult {
  messageId: string;
  success: boolean;
  error?: string;
}

export class WhatsAppService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.whatsapp.apiUrl,
      headers: {
        Authorization: `Bearer ${config.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(options: WhatsAppOptions): Promise<WhatsAppResult> {
    try {
      const phoneNumber = this.normalizePhoneNumber(options.to);
      this.validatePhoneNumber(phoneNumber);

      logger.info('Sending WhatsApp message', {
        to: phoneNumber,
        type: options.type || 'text',
      });

      const payload = this.buildMessagePayload(phoneNumber, options);

      const response = await this.client.post(
        `/${config.whatsapp.phoneNumberId}/messages`,
        payload
      );

      logger.info('WhatsApp message sent successfully', {
        messageId: response.data.messages[0].id,
        to: phoneNumber,
      });

      return {
        messageId: response.data.messages[0].id,
        success: true,
      };
    } catch (error: any) {
      logger.error('Failed to send WhatsApp message', {
        error: error.response?.data || error.message,
        to: options.to,
      });

      if (error instanceof ValidationError) {
        throw error;
      }

      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new ExternalServiceError(errorMessage, 'WhatsApp Business API');
    }
  }

  async sendTextMessage(to: string, body: string): Promise<WhatsAppResult> {
    return this.sendMessage({ to, body, type: 'text' });
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    templateLanguage: string = 'en',
    components?: any[]
  ): Promise<WhatsAppResult> {
    return this.sendMessage({
      to,
      body: '',
      type: 'template',
      templateName,
      templateLanguage,
      templateComponents: components,
    });
  }

  async sendImageMessage(
    to: string,
    mediaUrl: string,
    caption?: string
  ): Promise<WhatsAppResult> {
    return this.sendMessage({
      to,
      body: '',
      type: 'image',
      mediaUrl,
      caption,
    });
  }

  async sendDocumentMessage(
    to: string,
    mediaUrl: string,
    filename: string,
    caption?: string
  ): Promise<WhatsAppResult> {
    return this.sendMessage({
      to,
      body: '',
      type: 'document',
      mediaUrl,
      filename,
      caption,
    });
  }

  private buildMessagePayload(to: string, options: WhatsAppOptions): any {
    const basePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
    };

    switch (options.type) {
      case 'text':
      default:
        return {
          ...basePayload,
          type: 'text',
          text: {
            preview_url: false,
            body: options.body,
          },
        };

      case 'template':
        return {
          ...basePayload,
          type: 'template',
          template: {
            name: options.templateName,
            language: {
              code: options.templateLanguage || 'en',
            },
            components: options.templateComponents || [],
          },
        };

      case 'image':
        return {
          ...basePayload,
          type: 'image',
          image: {
            link: options.mediaUrl,
            caption: options.caption,
          },
        };

      case 'document':
        return {
          ...basePayload,
          type: 'document',
          document: {
            link: options.mediaUrl,
            filename: options.filename,
            caption: options.caption,
          },
        };

      case 'video':
        return {
          ...basePayload,
          type: 'video',
          video: {
            link: options.mediaUrl,
            caption: options.caption,
          },
        };
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let normalized = phoneNumber.replace(/\D/g, '');

    // Remove leading zeros
    normalized = normalized.replace(/^0+/, '');

    // WhatsApp expects numbers without '+' prefix
    if (phoneNumber.startsWith('+')) {
      return normalized;
    }

    return normalized;
  }

  private validatePhoneNumber(phoneNumber: string): void {
    // Check if phone number contains only digits
    if (!/^\d+$/.test(phoneNumber)) {
      throw new ValidationError('Phone number must contain only digits');
    }

    // Check if phone number has valid length
    if (phoneNumber.length < 8 || phoneNumber.length > 15) {
      throw new ValidationError('Phone number must be between 8 and 15 digits');
    }
  }

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<string | null> {
    if (mode === 'subscribe' && token === config.whatsapp.webhookVerifyToken) {
      logger.info('WhatsApp webhook verified successfully');
      return challenge;
    }

    logger.warn('WhatsApp webhook verification failed', { mode, token });
    return null;
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      await this.client.post(`/${config.whatsapp.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });

      logger.info('WhatsApp message marked as read', { messageId });
      return true;
    } catch (error: any) {
      logger.error('Failed to mark WhatsApp message as read', {
        error: error.response?.data || error.message,
        messageId,
      });
      return false;
    }
  }

  async getMediaUrl(mediaId: string): Promise<string> {
    try {
      const response = await this.client.get(`/${mediaId}`);
      return response.data.url;
    } catch (error: any) {
      logger.error('Failed to get WhatsApp media URL', {
        error: error.response?.data || error.message,
        mediaId,
      });
      throw new ExternalServiceError(error.message, 'WhatsApp Business API');
    }
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      const response = await this.client.get(mediaUrl, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error: any) {
      logger.error('Failed to download WhatsApp media', {
        error: error.message,
        mediaUrl,
      });
      throw new ExternalServiceError(error.message, 'WhatsApp Business API');
    }
  }
}

export const whatsappService = new WhatsAppService();
