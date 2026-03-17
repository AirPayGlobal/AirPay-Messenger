import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // API Keys
  masterApiKey: process.env.MASTER_API_KEY || '',

  // AWS
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  // AWS SNS (SMS)
  sns: {
    smsType: process.env.AWS_SNS_SMS_TYPE || 'Transactional',
    senderId: process.env.AWS_SNS_SENDER_ID || 'AirPay',
    defaultCountryCode: process.env.AWS_SNS_DEFAULT_COUNTRY_CODE || '+1',
  },

  // AWS SES (Email)
  ses: {
    fromEmail: process.env.AWS_SES_FROM_EMAIL || 'noreply@yourdomain.com',
    fromName: process.env.AWS_SES_FROM_NAME || 'AirPay Messenger',
    replyToEmail: process.env.AWS_SES_REPLY_TO_EMAIL || 'support@yourdomain.com',
    configurationSet: process.env.AWS_SES_CONFIGURATION_SET || '',
  },

  // AWS S3
  s3: {
    bucket: process.env.AWS_S3_BUCKET || 'airpay-messenger-attachments',
    region: process.env.AWS_S3_REGION || 'us-east-1',
    presignedUrlExpires: parseInt(process.env.AWS_S3_PRESIGNED_URL_EXPIRES || '3600', 10),
  },

  // WhatsApp
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Message Queue
  bull: {
    attempts: parseInt(process.env.BULL_ATTEMPTS || '3', 10),
    backoffDelay: parseInt(process.env.BULL_BACKOFF_DELAY || '5000', 10),
    removeOnComplete: parseInt(process.env.BULL_REMOVE_ON_COMPLETE || '100', 10),
    removeOnFail: parseInt(process.env.BULL_REMOVE_ON_FAIL || '200', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // CloudWatch
  cloudwatch: {
    groupName: process.env.CLOUDWATCH_GROUP_NAME || 'airpay-messenger',
    streamName: process.env.CLOUDWATCH_STREAM_NAME || 'application-logs',
    enabled: process.env.ENABLE_CLOUDWATCH_LOGS === 'true',
  },

  // Feature Flags
  features: {
    smsFallback: process.env.ENABLE_SMS_FALLBACK === 'true',
    emailTracking: process.env.ENABLE_EMAIL_TRACKING === 'true',
    messageEncryption: process.env.ENABLE_MESSAGE_ENCRYPTION === 'true',
  },

  // Anthropic (AI provider)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    apiUrl: process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-mini',
    enabled: process.env.ENABLE_ANTHROPIC === 'true',
  },

  // Webhooks
  webhooks: {
    baseUrl: process.env.BASE_WEBHOOK_URL || 'http://localhost:3000/api/v1/webhooks',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // File Upload
  fileUpload: {
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf').split(','),
  },

  // Compliance
  compliance: {
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '365', 10),
    gdprMode: process.env.ENABLE_GDPR_MODE === 'true',
  },
};

// Validate required configuration
export function validateConfig() {
  const required = [
    { key: 'DATABASE_URL', value: config.databaseUrl },
    { key: 'JWT_SECRET', value: config.jwt.secret },
  ];

  const missing = required.filter(item => !item.value);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(item => item.key).join(', ')}`
    );
  }
}
