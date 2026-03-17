import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../database/client';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface AuthRequest extends Request {
  apiKey?: {
    id: string;
    name: string;
    serviceName: string;
    permissions: any;
  };
}

export async function authenticateApiKey(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      throw new AuthenticationError('API key is required');
    }

    // Check if it's the master API key
    if (apiKey === config.masterApiKey) {
      req.apiKey = {
        id: 'master',
        name: 'Master API Key',
        serviceName: 'system',
        permissions: { '*': true },
      };
      return next();
    }

    // Hash the provided API key
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Find API key in database
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!apiKeyRecord) {
      throw new AuthenticationError('Invalid or expired API key');
    }

    // Verify the key
    const isValid = await bcrypt.compare(apiKey, apiKeyRecord.keyHash);

    if (!isValid) {
      throw new AuthenticationError('Invalid API key');
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Attach API key info to request
    req.apiKey = {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      serviceName: apiKeyRecord.serviceName,
      permissions: apiKeyRecord.permissions as any,
    };

    logger.info('API key authenticated', {
      keyId: apiKeyRecord.id,
      serviceName: apiKeyRecord.serviceName,
    });

    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return next(new AuthenticationError('Authentication required'));
    }

    const permissions = req.apiKey.permissions || {};

    // Master key has all permissions
    if (permissions['*']) {
      return next();
    }

    // Check specific permission
    if (!permissions[permission]) {
      logger.warn('Insufficient permissions', {
        keyId: req.apiKey.id,
        required: permission,
        available: Object.keys(permissions),
      });
      return next(new AuthorizationError(`Permission required: ${permission}`));
    }

    next();
  };
}

function extractApiKey(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader && typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }

  // Check query parameter (not recommended for production)
  const apiKeyQuery = req.query.api_key;
  if (apiKeyQuery && typeof apiKeyQuery === 'string') {
    return apiKeyQuery;
  }

  return null;
}

// Helper function to generate API key
export async function generateApiKey(
  name: string,
  serviceName: string,
  permissions: any = {},
  expiresAt?: Date
): Promise<string> {
  const apiKey = require('crypto').randomBytes(32).toString('hex');
  const keyHash = await bcrypt.hash(apiKey, 10);

  await prisma.apiKey.create({
    data: {
      keyHash,
      name,
      serviceName,
      permissions,
      expiresAt,
    },
  });

  logger.info('API key generated', { name, serviceName });

  return apiKey;
}

// Helper function to revoke API key
export async function revokeApiKey(keyId: string): Promise<void> {
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });

  logger.info('API key revoked', { keyId });
}
