# AirPay Messenger - Unified Messaging Platform

A centralized messaging service integrating WhatsApp, SMS (AWS SNS), and Email (AWS SES) for all in-house platforms.

## Features

- **Multi-Channel Support**: WhatsApp, SMS, and Email from a single API
- **Message Queueing**: Reliable message delivery with Bull/Redis
- **Status Tracking**: Real-time delivery, read, and failure status
- **Templates**: Reusable message templates with variable substitution
- **Contact Management**: Centralized contact database with preferences
- **Attachments**: File storage with AWS S3
- **Webhooks**: Receive incoming messages and status updates
- **Rate Limiting**: Built-in API rate limiting
- **Authentication**: API key-based authentication
- **Compliance**: GDPR, CAN-SPAM, TCPA compliance features

## Tech Stack

- **Backend**: Node.js 20.x, TypeScript 5.x
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 16.x with Prisma ORM
- **Queue**: Bull (Redis-based)
- **AWS Services**: SNS (SMS), SES (Email), S3 (Storage)
- **External APIs**: WhatsApp Business API
- **Deployment**: Docker, Docker Compose

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL 16.x
- Redis 7.x
- Docker (optional, for containerized deployment)
- AWS Account with SNS, SES, and S3 configured
- WhatsApp Business API account (optional)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd airpay-messenger

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Set Up Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

### 4. Start the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start
```

The API will be available at `http://localhost:3000`

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Start all services (PostgreSQL, Redis, API)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down

# Start with Prisma Studio
docker-compose --profile tools up -d
```

### Manual Docker Build

```bash
# Build the image
docker build -t airpay-messenger .

# Run the container
docker run -d \
  --name airpay-api \
  -p 3000:3000 \
  --env-file .env \
  airpay-messenger
```

## API Documentation

### Authentication

All API requests require authentication via API key:

```bash
# Using Authorization header (recommended)
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/v1/messages

# Using X-API-Key header
curl -H "X-API-Key: YOUR_API_KEY" \
  http://localhost:3000/api/v1/messages
```

### Endpoints

#### Send Message

```bash
POST /api/v1/messages/send
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "channel": "email",
  "to": "user@example.com",
  "subject": "Welcome!",
  "body": "Welcome to our platform",
  "html": "<h1>Welcome!</h1>"
}
```

#### Get Message Status

```bash
GET /api/v1/messages/{messageId}/status
Authorization: Bearer YOUR_API_KEY
```

#### Create Contact

```bash
POST /api/v1/contacts
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "email": "user@example.com",
  "phone": "+1234567890",
  "firstName": "John",
  "lastName": "Doe"
}
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete API documentation.

## Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/airpay_messenger

# JWT Secret
JWT_SECRET=your-secret-key

# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# AWS SNS (SMS)
AWS_SNS_SENDER_ID=AirPay

# AWS SES (Email)
AWS_SES_FROM_EMAIL=noreply@yourdomain.com

# AWS S3 (Storage)
AWS_S3_BUCKET=airpay-messenger-attachments
```

See [.env.example](./.env.example) for all configuration options.

## AWS Setup

### 1. AWS SNS for SMS

```bash
# Set up SMS attributes
aws sns set-sms-attributes \
  --attributes DefaultSMSType=Transactional

# Request origination number
# Go to AWS Console → Pinpoint → SMS and voice → Phone numbers
```

### 2. AWS SES for Email

```bash
# Verify email domain
aws ses verify-domain-identity --domain yourdomain.com

# Configure SPF, DKIM, DMARC records in DNS
# See: docs/EMAIL_SETUP.md

# Request production access (remove sandbox limits)
# Go to AWS Console → SES → Account dashboard → Production access
```

### 3. AWS S3 for Storage

```bash
# Create S3 bucket
aws s3 mb s3://airpay-messenger-attachments --region us-east-1

# Configure bucket policy
aws s3api put-bucket-cors \
  --bucket airpay-messenger-attachments \
  --cors-configuration file://s3-cors.json
```

### 4. IAM Permissions

Create an IAM user with these policies:
- `AmazonSNSFullAccess` (or custom SNS policy)
- `AmazonSESFullAccess` (or custom SES policy)
- `AmazonS3FullAccess` (or custom S3 policy)

See [docs/AWS_SETUP.md](./docs/AWS_SETUP.md) for detailed instructions.

## WhatsApp Setup

### Using WhatsApp Cloud API

1. Create a Meta Business Account
2. Create a WhatsApp Business App
3. Get Phone Number ID and Access Token
4. Configure webhook URL: `https://yourdomain.com/api/v1/webhooks/whatsapp`
5. Subscribe to message events

See [docs/WHATSAPP_SETUP.md](./docs/WHATSAPP_SETUP.md) for detailed instructions.

## Message Templates

Templates allow reusable messages with variable substitution:

```typescript
// Create template
POST /api/v1/templates
{
  "name": "welcome_email",
  "channel": "email",
  "subjectTemplate": "Welcome {{firstName}}!",
  "bodyTemplate": "Hi {{firstName}}, welcome to {{companyName}}!",
  "htmlTemplate": "<h1>Welcome {{firstName}}!</h1>",
  "variables": ["firstName", "companyName"]
}

// Send message using template
POST /api/v1/messages/send
{
  "channel": "email",
  "to": "user@example.com",
  "templateId": "template-uuid",
  "templateVariables": {
    "firstName": "John",
    "companyName": "AirPay"
  }
}
```

## Webhooks

### Configure Webhooks

Set webhook URLs in your AWS and WhatsApp configurations:

- **WhatsApp**: `https://yourdomain.com/api/v1/webhooks/whatsapp`
- **AWS SNS**: `https://yourdomain.com/api/v1/webhooks/sms/status`
- **AWS SES**: `https://yourdomain.com/api/v1/webhooks/email/events`

### Webhook Security

- WhatsApp: Verify token validation
- AWS SNS/SES: Verify SNS message signatures
- Use HTTPS for all webhook endpoints

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/v1/health
```

### Queue Monitoring

```bash
# View queue statistics
GET /api/v1/queue/stats
```

### Logs

Logs are written to:
- `logs/all.log` - All logs
- `logs/error.log` - Error logs only
- CloudWatch Logs (if enabled)

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
npm run prisma:studio

# Reset database (WARNING: destroys data)
npm run prisma:migrate reset
```

### Queue Issues

```bash
# Check Redis connection
redis-cli ping

# View queue contents
redis-cli keys bull:*
```

### AWS Issues

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test SES sending
aws ses send-email \
  --from noreply@yourdomain.com \
  --to test@example.com \
  --subject "Test" \
  --text "Test message"
```

## Development

### Project Structure

```
airpay-messenger/
├── src/
│   ├── config/           # Configuration
│   ├── controllers/      # API controllers
│   ├── database/         # Database client
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── workers/          # Queue workers
│   ├── app.ts            # Express app
│   └── index.ts          # Entry point
├── prisma/
│   └── schema.prisma     # Database schema
├── docs/                 # Documentation
├── examples/             # Integration examples
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Running Tests

```bash
npm test
```

### Code Formatting

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](./LICENSE)

## Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Documentation: [docs/](./docs/)
- Email: support@airpay.com

## Roadmap

- [ ] Retry strategies and fallback mechanisms
- [ ] Advanced analytics and reporting
- [ ] Multi-tenancy support
- [ ] Message scheduling UI
- [ ] Webhook signature verification
- [ ] GraphQL API
- [ ] Mobile SDKs
- [ ] Message templates UI
