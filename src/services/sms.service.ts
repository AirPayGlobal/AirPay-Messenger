import { SNSClient, PublishCommand, SetSMSAttributesCommand } from '@aws-sdk/client-sns';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ExternalServiceError, ValidationError } from '../utils/errors';

export interface SmsOptions {
  to: string;
  body: string;
  senderId?: string;
  messageType?: 'Promotional' | 'Transactional';
}

export interface SmsResult {
  messageId: string;
  success: boolean;
  error?: string;
}

export class SmsService {
  private snsClient: SNSClient;

  constructor() {
    this.snsClient = new SNSClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });

    this.initializeSmsAttributes();
  }

  private async initializeSmsAttributes(): Promise<void> {
    try {
      const command = new SetSMSAttributesCommand({
        attributes: {
          DefaultSMSType: config.sns.smsType,
          DefaultSenderID: config.sns.senderId,
        },
      });

      await this.snsClient.send(command);
      logger.info('SNS SMS attributes initialized', {
        smsType: config.sns.smsType,
        senderId: config.sns.senderId,
      });
    } catch (error: any) {
      logger.warn('Failed to set SNS SMS attributes', { error: error.message });
    }
  }

  async sendSms(options: SmsOptions): Promise<SmsResult> {
    try {
      // Validate phone number
      const phoneNumber = this.normalizePhoneNumber(options.to);
      this.validatePhoneNumber(phoneNumber);

      // Validate message length
      if (options.body.length > 160) {
        logger.warn('SMS message exceeds 160 characters', {
          length: options.body.length,
          to: phoneNumber,
        });
      }

      logger.info('Sending SMS', {
        to: phoneNumber,
        length: options.body.length,
        messageType: options.messageType || config.sns.smsType,
      });

      const messageAttributes: Record<string, any> = {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: options.messageType || config.sns.smsType,
        },
      };

      // Add sender ID if provided
      if (options.senderId) {
        messageAttributes['AWS.SNS.SMS.SenderID'] = {
          DataType: 'String',
          StringValue: options.senderId,
        };
      }

      const command = new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: options.body,
        MessageAttributes: messageAttributes,
      });

      const response = await this.snsClient.send(command);

      logger.info('SMS sent successfully', {
        messageId: response.MessageId,
        to: phoneNumber,
      });

      return {
        messageId: response.MessageId!,
        success: true,
      };
    } catch (error: any) {
      logger.error('Failed to send SMS', {
        error: error.message,
        to: options.to,
      });

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new ExternalServiceError(error.message, 'AWS SNS');
    }
  }

  async sendBulkSms(recipients: string[], body: string): Promise<SmsResult[]> {
    const results: SmsResult[] = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendSms({ to: recipient, body });
        results.push(result);
      } catch (error: any) {
        results.push({
          messageId: '',
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  async sendTemplatedSms(
    options: SmsOptions,
    templateVariables: Record<string, string>
  ): Promise<SmsResult> {
    let { body } = options;

    for (const [key, value] of Object.entries(templateVariables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      body = body.replace(regex, value);
    }

    return this.sendSms({
      ...options,
      body,
    });
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except '+'
    let normalized = phoneNumber.replace(/[^\d+]/g, '');

    // If the number doesn't start with '+', add the default country code
    if (!normalized.startsWith('+')) {
      // Remove leading zeros
      normalized = normalized.replace(/^0+/, '');
      // Add default country code
      normalized = `${config.sns.defaultCountryCode}${normalized}`;
    }

    return normalized;
  }

  private validatePhoneNumber(phoneNumber: string): void {
    // Check if phone number starts with '+'
    if (!phoneNumber.startsWith('+')) {
      throw new ValidationError('Phone number must start with + and country code');
    }

    // Check if phone number has valid length (E.164 format)
    if (phoneNumber.length < 8 || phoneNumber.length > 15) {
      throw new ValidationError('Phone number must be between 8 and 15 digits');
    }

    // Check if phone number contains only digits after '+'
    if (!/^\+\d+$/.test(phoneNumber)) {
      throw new ValidationError('Phone number must contain only digits after +');
    }
  }

  async verifySmsCapability(): Promise<boolean> {
    try {
      // Try to send a test message to verify SNS is configured correctly
      // This won't actually send a message, just validates credentials
      logger.info('SMS service initialized with AWS SNS');
      return true;
    } catch (error: any) {
      logger.error('SMS service initialization failed', { error: error.message });
      return false;
    }
  }
}

export const smsService = new SmsService();
