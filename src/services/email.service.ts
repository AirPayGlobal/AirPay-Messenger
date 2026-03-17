import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ExternalServiceError } from '../utils/errors';

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
    contentType?: string;
  }>;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface EmailResult {
  messageId: string;
  success: boolean;
  error?: string;
}

export class EmailService {
  private sesClient: SESClient;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.sesClient = new SESClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });

    // Create nodemailer transporter using AWS SES
    this.transporter = nodemailer.createTransport({
      SES: { ses: this.sesClient, aws: { SendRawEmailCommand } },
    });
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      logger.info('Sending email', {
        to: options.to,
        subject: options.subject,
        hasAttachments: !!options.attachments?.length,
      });

      // If there are attachments, use SendRawEmail with nodemailer
      if (options.attachments && options.attachments.length > 0) {
        return await this.sendRawEmail(options);
      }

      // Otherwise use simple SendEmail
      return await this.sendSimpleEmail(options);
    } catch (error: any) {
      logger.error('Failed to send email', {
        error: error.message,
        to: options.to,
        subject: options.subject,
      });
      throw new ExternalServiceError(error.message, 'AWS SES');
    }
  }

  private async sendSimpleEmail(options: EmailOptions): Promise<EmailResult> {
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
    const ccAddresses = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : [];
    const bccAddresses = options.bcc
      ? Array.isArray(options.bcc)
        ? options.bcc
        : [options.bcc]
      : [];

    const command = new SendEmailCommand({
      Source: `${config.ses.fromName} <${config.ses.fromEmail}>`,
      Destination: {
        ToAddresses: toAddresses,
        CcAddresses: ccAddresses.length > 0 ? ccAddresses : undefined,
        BccAddresses: bccAddresses.length > 0 ? bccAddresses : undefined,
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: options.body,
            Charset: 'UTF-8',
          },
          Html: options.html
            ? {
                Data: options.html,
                Charset: 'UTF-8',
              }
            : undefined,
        },
      },
      ReplyToAddresses: options.replyTo
        ? [options.replyTo]
        : [config.ses.replyToEmail],
      ConfigurationSetName: config.ses.configurationSet || undefined,
    });

    const response = await this.sesClient.send(command);

    logger.info('Email sent successfully', {
      messageId: response.MessageId,
      to: toAddresses,
    });

    return {
      messageId: response.MessageId!,
      success: true,
    };
  }

  private async sendRawEmail(options: EmailOptions): Promise<EmailResult> {
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    const mailOptions = {
      from: `${config.ses.fromName} <${config.ses.fromEmail}>`,
      to: toAddresses.join(', '),
      cc: options.cc
        ? Array.isArray(options.cc)
          ? options.cc.join(', ')
          : options.cc
        : undefined,
      bcc: options.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc.join(', ')
          : options.bcc
        : undefined,
      subject: options.subject,
      text: options.body,
      html: options.html,
      attachments: options.attachments,
      replyTo: options.replyTo || config.ses.replyToEmail,
      headers: options.headers,
    };

    const info = await this.transporter.sendMail(mailOptions);

    logger.info('Email with attachments sent successfully', {
      messageId: info.messageId,
      to: toAddresses,
      attachments: options.attachments?.length,
    });

    return {
      messageId: info.messageId,
      success: true,
    };
  }

  async sendTemplatedEmail(
    options: EmailOptions,
    templateVariables: Record<string, string>
  ): Promise<EmailResult> {
    // Replace template variables in subject, body, and html
    let { subject, body, html } = options;

    for (const [key, value] of Object.entries(templateVariables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
      if (html) {
        html = html.replace(regex, value);
      }
    }

    return this.sendEmail({
      ...options,
      subject,
      body,
      html,
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error: any) {
      logger.error('Email service connection failed', { error: error.message });
      return false;
    }
  }
}

export const emailService = new EmailService();
