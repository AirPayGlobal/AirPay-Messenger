import { Request, Response, NextFunction } from 'express';
import { contactService } from '../services/contact.service';

export class ContactController {
  async createContact(req: Request, res: Response, next: NextFunction) {
    try {
      const contact = await contactService.createContact(req.body);

      res.status(201).json({
        success: true,
        data: { contactId: contact.id },
      });
    } catch (error) {
      next(error);
    }
  }

  async getContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { contactId } = req.params;

      const contact = await contactService.getContact(contactId);

      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { contactId } = req.params;

      const contact = await contactService.updateContact(contactId, req.body);

      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { contactId } = req.params;

      await contactService.deleteContact(contactId);

      res.json({
        success: true,
        message: 'Contact deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async listContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const search = req.query.search as string | undefined;

      const result = await contactService.listContacts(limit, offset, search);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const { contactId } = req.params;

      const contact = await contactService.updatePreferences(contactId, req.body);

      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  async optOut(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, channel } = req.body;

      const contact = await contactService.optOut(identifier, channel);

      res.json({
        success: true,
        message: `Opted out of ${channel} successfully`,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const contactController = new ContactController();
