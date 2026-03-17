import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticateApiKey, requirePermission } from '../middleware/auth';

const router = Router();

router.post('/send', authenticateApiKey, requirePermission('messages:send'), messageController.sendMessage);
router.get('/:messageId', authenticateApiKey, requirePermission('messages:read'), messageController.getMessage);
router.get('/:messageId/status', authenticateApiKey, requirePermission('messages:read'), messageController.getMessageStatus);
router.get('/', authenticateApiKey, requirePermission('messages:read'), messageController.getMessageHistory);

export default router;
