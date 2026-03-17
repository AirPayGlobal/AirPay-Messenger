import { Router } from 'express';
import { templateController } from '../controllers/template.controller';
import { authenticateApiKey } from '../middleware/auth';

const router = Router();

router.post('/', authenticateApiKey, templateController.createTemplate);
router.get('/', authenticateApiKey, templateController.listTemplates);
router.get('/:templateId', authenticateApiKey, templateController.getTemplate);
router.put('/:templateId', authenticateApiKey, templateController.updateTemplate);
router.delete('/:templateId', authenticateApiKey, templateController.deleteTemplate);

export default router;
