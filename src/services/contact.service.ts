import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import { NotFoundError, ConflictError } from '../utils/errors';

export interface CreateContactRequest {
  email?: string;
  phone?: string;
  whatsappId?: string;
  firstName?: string;
  lastName?: string;
  metadata?: any;
  preferences?: {
    preferredChannel?: string;
    optOutSms?: boolean;
    optOutEmail?: boolean;
    optOutWhatsapp?: boolean;
  };
}

export interface UpdateContactRequest {
  email?: string;
  phone?: string;
  whatsappId?: string;
  firstName?: string;
  lastName?: string;
  metadata?: any;
  preferences?: any;
}

export class ContactService {
  async createContact(data: CreateContactRequest) {
    try {
      // Check for existing contacts
      if (data.email) {
        const existing = await prisma.contact.findUnique({
          where: { email: data.email },
        });
        if (existing) {
          throw new ConflictError('Contact with this email already exists');
        }
      }

      if (data.phone) {
        const existing = await prisma.contact.findUnique({
          where: { phone: data.phone },
        });
        if (existing) {
          throw new ConflictError('Contact with this phone number already exists');
        }
      }

      if (data.whatsappId) {
        const existing = await prisma.contact.findUnique({
          where: { whatsappId: data.whatsappId },
        });
        if (existing) {
          throw new ConflictError('Contact with this WhatsApp ID already exists');
        }
      }

      const contact = await prisma.contact.create({
        data: {
          email: data.email,
          phone: data.phone,
          whatsappId: data.whatsappId,
          firstName: data.firstName,
          lastName: data.lastName,
          metadata: data.metadata,
          preferences: data.preferences,
        },
      });

      logger.info('Contact created', { contactId: contact.id });

      return contact;
    } catch (error: any) {
      logger.error('Failed to create contact', { error: error.message });
      throw error;
    }
  }

  async getContact(contactId: string) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    return contact;
  }

  async getContactByIdentifier(identifier: string) {
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }, { whatsappId: identifier }],
      },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    return contact;
  }

  async updateContact(contactId: string, data: UpdateContactRequest) {
    try {
      // Check if contact exists
      const existing = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!existing) {
        throw new NotFoundError('Contact not found');
      }

      // Check for conflicts with other contacts
      if (data.email && data.email !== existing.email) {
        const emailConflict = await prisma.contact.findUnique({
          where: { email: data.email },
        });
        if (emailConflict) {
          throw new ConflictError('Email already in use by another contact');
        }
      }

      if (data.phone && data.phone !== existing.phone) {
        const phoneConflict = await prisma.contact.findUnique({
          where: { phone: data.phone },
        });
        if (phoneConflict) {
          throw new ConflictError('Phone number already in use by another contact');
        }
      }

      const contact = await prisma.contact.update({
        where: { id: contactId },
        data,
      });

      logger.info('Contact updated', { contactId });

      return contact;
    } catch (error: any) {
      logger.error('Failed to update contact', {
        contactId,
        error: error.message,
      });
      throw error;
    }
  }

  async deleteContact(contactId: string) {
    try {
      await prisma.contact.delete({
        where: { id: contactId },
      });

      logger.info('Contact deleted', { contactId });

      return true;
    } catch (error: any) {
      logger.error('Failed to delete contact', {
        contactId,
        error: error.message,
      });
      throw new NotFoundError('Contact not found');
    }
  }

  async listContacts(limit: number = 50, offset: number = 0, search?: string) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const contacts = await prisma.contact.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.contact.count({ where });

    return { contacts, total, limit, offset };
  }

  async updatePreferences(contactId: string, preferences: any) {
    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: { preferences },
    });

    logger.info('Contact preferences updated', { contactId });

    return contact;
  }

  async optOut(identifier: string, channel: 'sms' | 'email' | 'whatsapp') {
    const contact = await this.getContactByIdentifier(identifier);

    const preferences = (contact.preferences as any) || {};
    preferences[`optOut${channel.charAt(0).toUpperCase() + channel.slice(1)}`] = true;

    await this.updatePreferences(contact.id, preferences);

    logger.info('Contact opted out', { contactId: contact.id, channel });

    return contact;
  }

  async optIn(identifier: string, channel: 'sms' | 'email' | 'whatsapp') {
    const contact = await this.getContactByIdentifier(identifier);

    const preferences = (contact.preferences as any) || {};
    preferences[`optOut${channel.charAt(0).toUpperCase() + channel.slice(1)}`] = false;

    await this.updatePreferences(contact.id, preferences);

    logger.info('Contact opted in', { contactId: contact.id, channel });

    return contact;
  }
}

export const contactService = new ContactService();
