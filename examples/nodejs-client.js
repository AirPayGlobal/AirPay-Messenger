/**
 * AirPay Messenger - Node.js Client Example
 *
 * This example demonstrates how to integrate AirPay Messenger
 * into your Node.js application.
 */

const axios = require('axios');

class AirPayMessenger {
  constructor(apiKey, baseUrl = 'http://localhost:3000/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send an email message
   */
  async sendEmail(options) {
    try {
      const response = await this.client.post('/messages/send', {
        channel: 'email',
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        body: options.body,
        html: options.html,
        attachments: options.attachments,
        scheduledAt: options.scheduledAt,
        metadata: options.metadata,
      });

      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Send an SMS message
   */
  async sendSMS(to, body, options = {}) {
    try {
      const response = await this.client.post('/messages/send', {
        channel: 'sms',
        to,
        body,
        scheduledAt: options.scheduledAt,
        metadata: options.metadata,
      });

      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Send a WhatsApp message
   */
  async sendWhatsApp(to, body, options = {}) {
    try {
      const response = await this.client.post('/messages/send', {
        channel: 'whatsapp',
        to,
        body,
        scheduledAt: options.scheduledAt,
        metadata: options.metadata,
      });

      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Send message using template
   */
  async sendWithTemplate(channel, to, templateId, variables, options = {}) {
    try {
      const response = await this.client.post('/messages/send', {
        channel,
        to,
        templateId,
        templateVariables: variables,
        scheduledAt: options.scheduledAt,
        metadata: options.metadata,
      });

      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId) {
    try {
      const response = await this.client.get(`/messages/${messageId}/status`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get message history for a contact
   */
  async getMessageHistory(contactId, options = {}) {
    try {
      const params = {
        contactId,
        limit: options.limit || 50,
        offset: options.offset || 0,
      };

      const response = await this.client.get('/messages', { params });
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Create a contact
   */
  async createContact(contactData) {
    try {
      const response = await this.client.post('/contacts', contactData);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId) {
    try {
      const response = await this.client.get(`/contacts/${contactId}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Update contact
   */
  async updateContact(contactId, updates) {
    try {
      const response = await this.client.put(`/contacts/${contactId}`, updates);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * List contacts
   */
  async listContacts(options = {}) {
    try {
      const params = {
        limit: options.limit || 50,
        offset: options.offset || 0,
        search: options.search,
      };

      const response = await this.client.get('/contacts', { params });
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Handle opt-out request
   */
  async optOut(identifier, channel) {
    try {
      const response = await this.client.post('/contacts/opt-out', {
        identifier,
        channel,
      });
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  _handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.error?.message || 'API request failed';

      const err = new Error(message);
      err.statusCode = status;
      err.response = data;
      return err;
    }

    return error;
  }
}

// ============================================================================
// Usage Examples
// ============================================================================

async function examples() {
  const messenger = new AirPayMessenger('your-api-key-here');

  // Example 1: Send a simple email
  try {
    const result = await messenger.sendEmail({
      to: 'user@example.com',
      subject: 'Welcome to AirPay!',
      body: 'Thank you for signing up.',
      html: '<h1>Welcome to AirPay!</h1><p>Thank you for signing up.</p>',
    });

    console.log('Email sent:', result.data.messageId);
  } catch (error) {
    console.error('Failed to send email:', error.message);
  }

  // Example 2: Send an SMS
  try {
    const result = await messenger.sendSMS(
      '+1234567890',
      'Your verification code is: 123456'
    );

    console.log('SMS sent:', result.data.messageId);
  } catch (error) {
    console.error('Failed to send SMS:', error.message);
  }

  // Example 3: Send WhatsApp message
  try {
    const result = await messenger.sendWhatsApp(
      '+1234567890',
      'Hello from AirPay!'
    );

    console.log('WhatsApp sent:', result.data.messageId);
  } catch (error) {
    console.error('Failed to send WhatsApp:', error.message);
  }

  // Example 4: Send email with attachment
  try {
    const result = await messenger.sendEmail({
      to: 'user@example.com',
      subject: 'Your Invoice',
      body: 'Please find your invoice attached.',
      attachments: [
        {
          fileName: 'invoice.pdf',
          fileData: 'base64-encoded-file-data',
          mimeType: 'application/pdf',
        },
      ],
    });

    console.log('Email with attachment sent:', result.data.messageId);
  } catch (error) {
    console.error('Failed to send email with attachment:', error.message);
  }

  // Example 5: Schedule a message
  try {
    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + 2); // 2 hours from now

    const result = await messenger.sendEmail({
      to: 'user@example.com',
      subject: 'Scheduled Message',
      body: 'This message was scheduled.',
      scheduledAt: scheduledTime.toISOString(),
    });

    console.log('Scheduled message:', result.data.messageId);
  } catch (error) {
    console.error('Failed to schedule message:', error.message);
  }

  // Example 6: Use template
  try {
    const result = await messenger.sendWithTemplate(
      'email',
      'user@example.com',
      'template-uuid',
      {
        firstName: 'John',
        companyName: 'AirPay',
      }
    );

    console.log('Template message sent:', result.data.messageId);
  } catch (error) {
    console.error('Failed to send template message:', error.message);
  }

  // Example 7: Check message status
  try {
    const status = await messenger.getMessageStatus('message-uuid');
    console.log('Message status:', status.data);
  } catch (error) {
    console.error('Failed to get status:', error.message);
  }

  // Example 8: Create contact
  try {
    const contact = await messenger.createContact({
      email: 'john@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
      preferences: {
        preferredChannel: 'email',
        optOutSms: false,
      },
    });

    console.log('Contact created:', contact.data.contactId);
  } catch (error) {
    console.error('Failed to create contact:', error.message);
  }

  // Example 9: Get message history
  try {
    const history = await messenger.getMessageHistory('contact-uuid', {
      limit: 10,
      offset: 0,
    });

    console.log('Message history:', history.data);
  } catch (error) {
    console.error('Failed to get history:', error.message);
  }

  // Example 10: Send notification to multiple channels
  async function sendMultiChannelNotification(userId, message) {
    const contact = await messenger.getContact(userId);
    const results = [];

    // Try WhatsApp first
    if (contact.whatsappId && !contact.preferences?.optOutWhatsapp) {
      try {
        const result = await messenger.sendWhatsApp(contact.whatsappId, message);
        results.push({ channel: 'whatsapp', success: true, messageId: result.data.messageId });
      } catch (error) {
        results.push({ channel: 'whatsapp', success: false, error: error.message });
      }
    }

    // Fallback to SMS
    if (contact.phone && !contact.preferences?.optOutSms) {
      try {
        const result = await messenger.sendSMS(contact.phone, message);
        results.push({ channel: 'sms', success: true, messageId: result.data.messageId });
      } catch (error) {
        results.push({ channel: 'sms', success: false, error: error.message });
      }
    }

    // Final fallback to Email
    if (contact.email && !contact.preferences?.optOutEmail) {
      try {
        const result = await messenger.sendEmail({
          to: contact.email,
          subject: 'Notification',
          body: message,
        });
        results.push({ channel: 'email', success: true, messageId: result.data.messageId });
      } catch (error) {
        results.push({ channel: 'email', success: false, error: error.message });
      }
    }

    return results;
  }
}

// Export the client
module.exports = AirPayMessenger;

// Run examples if executed directly
if (require.main === module) {
  examples().catch(console.error);
}
