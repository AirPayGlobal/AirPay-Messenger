import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/client';
import { NotFoundError } from '../utils/errors';

export class TemplateController {
  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const template = await prisma.template.create({ data: req.body });
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async getTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const template = await prisma.template.findUnique({ where: { id: req.params.templateId } });
      if (!template) throw new NotFoundError('Template not found');
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const templates = await prisma.template.findMany({
        where: { isActive: true },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });
      const total = await prisma.template.count({ where: { isActive: true } });
      res.json({ success: true, data: { templates, total, limit, offset } });
    } catch (error) {
      next(error);
    }
  }

  async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const template = await prisma.template.update({
        where: { id: req.params.templateId },
        data: req.body,
      });
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.template.update({
        where: { id: req.params.templateId },
        data: { isActive: false },
      });
      res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const templateController = new TemplateController();
