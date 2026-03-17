import { createApp } from './app';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import { messageWorker } from './workers/message.worker';
import { prisma } from './database/client';

async function startServer() {
  console.log('Starting startServer function...');
  try {
    // Validate configuration
    console.log('Validating config...');
    validateConfig();
    logger.info('Configuration validated');
    console.log('Config validated.');

    // Test database connection
    console.log('Connecting to Prisma...');
    await prisma.$connect();
    logger.info('Database connected');
    console.log('Prisma connected.');

    // Create Express app
    console.log('Creating app...');
    const app = createApp();

    // Start queue workers
    console.log('Starting workers...');
    messageWorker.start();

    // Start server
    console.log('Starting HTTP server...');
    const server = app.listen(config.port, () => {
      logger.info(`Server started on port ${config.port}`, {
        environment: config.nodeEnv,
        port: config.port,
        apiVersion: config.apiVersion,
      });
      console.log(`Server is listening on port ${config.port}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await messageWorker.stop();
          await prisma.$disconnect();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error: any) {
          logger.error('Error during shutdown', { error: error.message });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Rejection', {
        reason: reason?.message || reason,
      });
      process.exit(1);
    });
  } catch (error: any) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

startServer();
