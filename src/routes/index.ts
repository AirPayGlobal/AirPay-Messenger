import { Router } from 'express';
import messageRoutes from './message.routes';
import contactRoutes from './contact.routes';
import webhookRoutes from './webhook.routes';
import templateRoutes from './template.routes';

const router = Router();

router.use('/messages', messageRoutes);
router.use('/contacts', contactRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/templates', templateRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
