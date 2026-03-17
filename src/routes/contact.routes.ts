import { Router } from 'express';
import { contactController } from '../controllers/contact.controller';
import { authenticateApiKey, requirePermission } from '../middleware/auth';

const router = Router();

router.post('/', authenticateApiKey, requirePermission('contacts:write'), contactController.createContact);
router.get('/:contactId', authenticateApiKey, requirePermission('contacts:read'), contactController.getContact);
router.put('/:contactId', authenticateApiKey, requirePermission('contacts:write'), contactController.updateContact);
router.delete('/:contactId', authenticateApiKey, requirePermission('contacts:delete'), contactController.deleteContact);
router.get('/', authenticateApiKey, requirePermission('contacts:read'), contactController.listContacts);
router.put('/:contactId/preferences', authenticateApiKey, requirePermission('contacts:write'), contactController.updatePreferences);
router.post('/opt-out', contactController.optOut);

export default router;
