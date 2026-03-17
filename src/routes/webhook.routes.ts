import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

// WhatsApp webhooks
router.get('/whatsapp', webhookController.verifyWhatsApp);
router.post('/whatsapp', webhookController.handleWhatsApp);

// SMS status callbacks
router.post('/sms/status', webhookController.handleSmsStatus);

// Email event notifications
router.post('/email/events', webhookController.handleEmailEvents);

export default router;
