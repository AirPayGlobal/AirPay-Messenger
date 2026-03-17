# AirPay Messenger - Unified Messaging Platform Architecture

## Overview
A centralized messaging service integrating WhatsApp, SMS (AWS SNS), and Email (AWS SES) for all in-house platforms.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Internal Applications                        │
│              (Your In-House Platforms)                          │
└────────────────┬────────────────────────────────────────────────┘
                 │ REST API Calls
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                  API Gateway (Express.js)                        │
│  ┌──────────────┬──────────────┬──────────────┬─────────────┐  │
│  │ Auth Layer   │ Rate Limiting│ Validation   │ Logging     │  │
│  └──────────────┴──────────────┴──────────────┴─────────────┘  │
└────────┬────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Message Service Layer                         │
│  ┌─────────────┬─────────────┬─────────────┬──────────────┐    │
│  │  WhatsApp   │    SMS      │   Email     │   Queue      │    │
│  │  Service    │   Service   │   Service   │   Manager    │    │
│  └─────────────┴─────────────┴─────────────┴──────────────┘    │
└────┬────────────────┬────────────────┬────────────────┬─────────┘
     │                │                │                │
     ↓                ↓                ↓                ↓
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│WhatsApp │    │AWS SNS   │    │ AWS SES  │    │ Bull     │
│Business │    │          │    │          │    │ Queue    │
│   API   │    └──────────┘    └──────────┘    └──────────┘
└─────────┘
     │
     ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Webhook Handler Service                         │
│  ┌─────────────┬─────────────┬─────────────────────────────┐   │
│  │  WhatsApp   │    SMS      │   Email (IMAP/Webhook)      │   │
│  │  Webhooks   │   Webhooks  │   Processing                │   │
│  └─────────────┴─────────────┴─────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                          │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │Messages  │Contacts  │Templates │Status    │Webhooks  │      │
│  │          │          │          │Tracking  │          │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                       AWS S3 Storage                             │
│            (Attachments, Media Files, Logs)                      │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Runtime**: Node.js 20.x LTS
- **Language**: TypeScript 5.x
- **Framework**: Express.js 4.x
- **API Documentation**: OpenAPI 3.0 / Swagger

### Database
- **Primary DB**: PostgreSQL 16.x
- **ORM**: Prisma / TypeORM
- **Migrations**: Prisma Migrate
- **Connection Pooling**: pg-pool

### Message Queue
- **Queue**: Bull (Redis-based) or AWS SQS
- **Redis**: 7.x (for Bull)
- **Features**: Job retry, scheduling, priority queues

### AWS Services
- **SMS**: AWS SNS (Simple Notification Service)
- **Email**: AWS SES (Simple Email Service)
- **Storage**: AWS S3
- **Queue** (optional): AWS SQS
- **Monitoring**: CloudWatch
- **IAM**: Role-based access control

### External APIs
- **WhatsApp**: WhatsApp Business API (Cloud API or On-Premises)
- **Alternative**: Twilio WhatsApp API

### Security
- **Authentication**: JWT tokens / API Keys
- **Encryption**: TLS 1.3 for transit
- **Secrets**: AWS Secrets Manager / Environment variables
- **Rate Limiting**: express-rate-limit

### DevOps
- **Containerization**: Docker 24.x
- **Orchestration**: Docker Compose (dev), AWS ECS (prod)
- **CI/CD**: GitHub Actions / GitLab CI
- **Monitoring**: Winston + CloudWatch Logs

## Database Schema

### Core Tables

#### contacts
```sql
id: UUID (PK)
email: VARCHAR(255) UNIQUE
phone: VARCHAR(20) UNIQUE
whatsapp_id: VARCHAR(50) UNIQUE
first_name: VARCHAR(100)
last_name: VARCHAR(100)
metadata: JSONB
preferences: JSONB (channel preferences, opt-outs)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### messages
```sql
id: UUID (PK)
contact_id: UUID (FK)
channel: ENUM('whatsapp', 'sms', 'email')
direction: ENUM('inbound', 'outbound')
status: ENUM('queued', 'sent', 'delivered', 'read', 'failed', 'bounced')
subject: VARCHAR(255) (email only)
body: TEXT
html_body: TEXT (email only)
template_id: UUID (FK, nullable)
metadata: JSONB
external_id: VARCHAR(255) (provider's message ID)
parent_message_id: UUID (FK, nullable) (for threading)
scheduled_at: TIMESTAMP (nullable)
sent_at: TIMESTAMP
delivered_at: TIMESTAMP
read_at: TIMESTAMP
failed_at: TIMESTAMP
error_message: TEXT
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### templates
```sql
id: UUID (PK)
name: VARCHAR(100) UNIQUE
channel: ENUM('whatsapp', 'sms', 'email')
subject_template: VARCHAR(255) (email only)
body_template: TEXT
html_template: TEXT (email only)
variables: JSONB (list of template variables)
is_active: BOOLEAN
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### attachments
```sql
id: UUID (PK)
message_id: UUID (FK)
file_name: VARCHAR(255)
file_type: VARCHAR(100)
file_size: INTEGER
s3_key: VARCHAR(500)
s3_url: VARCHAR(1000)
created_at: TIMESTAMP
```

#### message_recipients
```sql
id: UUID (PK)
message_id: UUID (FK)
contact_id: UUID (FK)
recipient_type: ENUM('to', 'cc', 'bcc')
created_at: TIMESTAMP
```

#### webhook_logs
```sql
id: UUID (PK)
source: VARCHAR(50)
event_type: VARCHAR(100)
payload: JSONB
processed: BOOLEAN
processed_at: TIMESTAMP
error_message: TEXT
created_at: TIMESTAMP
```

#### api_keys
```sql
id: UUID (PK)
key_hash: VARCHAR(255) UNIQUE
name: VARCHAR(100)
service_name: VARCHAR(100)
permissions: JSONB
is_active: BOOLEAN
last_used_at: TIMESTAMP
expires_at: TIMESTAMP
created_at: TIMESTAMP
```

#### message_queue_jobs
```sql
id: UUID (PK)
message_id: UUID (FK)
job_id: VARCHAR(255)
status: ENUM('pending', 'processing', 'completed', 'failed')
retry_count: INTEGER
max_retries: INTEGER
error_message: TEXT
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

## API Endpoints

### Messages

#### Send Message
```
POST /api/v1/messages/send
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "channel": "whatsapp|sms|email",
  "to": "recipient_identifier",
  "cc": ["email1@example.com"], // email only
  "bcc": ["email2@example.com"], // email only
  "subject": "Email subject", // email only
  "body": "Message content",
  "html": "<p>HTML content</p>", // email only
  "template_id": "uuid", // optional
  "template_variables": {}, // if using template
  "attachments": [
    {
      "file_name": "document.pdf",
      "file_data": "base64_encoded_data",
      "mime_type": "application/pdf"
    }
  ],
  "scheduled_at": "2024-12-31T23:59:59Z", // optional
  "metadata": {} // custom data
}

Response: 201
{
  "success": true,
  "message_id": "uuid",
  "status": "queued|sent",
  "estimated_delivery": "2024-01-01T00:00:00Z"
}
```

#### Get Message Status
```
GET /api/v1/messages/{message_id}/status
Authorization: Bearer {token}

Response: 200
{
  "message_id": "uuid",
  "status": "delivered",
  "channel": "whatsapp",
  "sent_at": "2024-01-01T00:00:00Z",
  "delivered_at": "2024-01-01T00:00:05Z",
  "read_at": "2024-01-01T00:00:10Z",
  "events": [
    {
      "status": "sent",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Message History
```
GET /api/v1/messages?contact_id={uuid}&channel={channel}&limit=50&offset=0
Authorization: Bearer {token}

Response: 200
{
  "messages": [...],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### Contacts

#### Create/Update Contact
```
POST /api/v1/contacts
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "email": "user@example.com",
  "phone": "+1234567890",
  "whatsapp_id": "1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "preferences": {
    "preferred_channel": "whatsapp",
    "opt_out_sms": false,
    "opt_out_email": false
  }
}

Response: 201
{
  "success": true,
  "contact_id": "uuid"
}
```

#### Get Contact
```
GET /api/v1/contacts/{contact_id}
Authorization: Bearer {token}

Response: 200
{
  "contact_id": "uuid",
  "email": "user@example.com",
  ...
}
```

### Templates

#### Create Template
```
POST /api/v1/templates
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "name": "welcome_email",
  "channel": "email",
  "subject_template": "Welcome {{first_name}}!",
  "body_template": "Hi {{first_name}}, welcome to our platform!",
  "html_template": "<h1>Welcome {{first_name}}!</h1>",
  "variables": ["first_name"]
}

Response: 201
{
  "success": true,
  "template_id": "uuid"
}
```

### Webhooks

#### WhatsApp Webhook
```
POST /api/v1/webhooks/whatsapp
Content-Type: application/json

Body: (WhatsApp Cloud API format)
```

#### SMS Status Callback
```
POST /api/v1/webhooks/sms/status
Content-Type: application/json

Body: (AWS SNS format)
```

#### Email Events
```
POST /api/v1/webhooks/email/events
Content-Type: application/json

Body: (AWS SES SNS notification format)
```

## Message Flow

### Outbound Message Flow
1. API receives message request
2. Validate request and authenticate
3. Create message record in database (status: queued)
4. Add message to queue (Bull/SQS)
5. Queue worker picks up job
6. Send via appropriate channel (WhatsApp/SNS/SES)
7. Update message status
8. Store external provider message ID
9. Return response to caller

### Inbound Message Flow
1. Provider sends webhook to our endpoint
2. Verify webhook signature
3. Parse webhook payload
4. Create message record (direction: inbound)
5. Store in database
6. Trigger internal webhook/notification (optional)
7. Return 200 OK to provider

## Security Considerations

### Authentication
- API Key authentication for internal services
- JWT tokens for user-facing endpoints
- AWS IAM roles for service-to-service communication

### Authorization
- Role-based access control (RBAC)
- Service-level permissions in API keys
- Rate limiting per API key

### Data Protection
- Encrypt sensitive data at rest (contact info, message content)
- TLS 1.3 for all API communication
- AWS KMS for encryption keys
- Secure webhook signature verification

### Compliance
- GDPR: Data deletion, export, consent management
- CAN-SPAM: Unsubscribe links, sender info
- TCPA: SMS opt-in tracking
- Data retention policies

## AWS Configuration

### IAM Policies

#### SNS Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:GetSMSAttributes",
        "sns:SetSMSAttributes"
      ],
      "Resource": "*"
    }
  ]
}
```

#### SES Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:SendTemplatedEmail",
        "ses:GetSendQuota"
      ],
      "Resource": "*"
    }
  ]
}
```

#### S3 Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket/*"
    }
  ]
}
```

## Monitoring & Logging

### Metrics to Track
- Messages sent/failed per channel
- Delivery rates by channel
- API response times
- Queue depth and processing time
- Error rates
- AWS costs per channel

### Logging
- Structured logging (JSON format)
- Log levels: ERROR, WARN, INFO, DEBUG
- CloudWatch Logs integration
- Sensitive data redaction

## Scalability

### Horizontal Scaling
- Stateless API servers
- Multiple queue workers
- Database read replicas

### Queue Management
- Priority queues for urgent messages
- Separate queues per channel
- Dead letter queues for failed messages
- Retry with exponential backoff

### Caching
- Redis for frequently accessed data
- Contact information caching
- Template caching
- Rate limit counters

## Error Handling

### Retry Strategy
- Transient errors: Retry 3 times with exponential backoff
- Rate limit errors: Retry after specified time
- Permanent errors: Mark as failed, no retry

### Fallback Mechanisms
- SMS → Email fallback (configurable)
- Primary → Secondary provider fallback
- Store-and-forward for offline periods

## Cost Optimization

### AWS SNS SMS Pricing
- ~$0.00645 per SMS (US)
- Monitor via CloudWatch
- Set spending limits

### AWS SES Pricing
- $0.10 per 1,000 emails
- Free tier: 62,000 emails/month (when sent from EC2)

### S3 Storage
- Standard: $0.023 per GB/month
- Lifecycle policies for old attachments

## Deployment

### Docker Setup
- Multi-stage builds
- Non-root user
- Health checks
- Resource limits

### AWS ECS
- Fargate for serverless containers
- Application Load Balancer
- Auto-scaling policies
- Blue-green deployments

## Development Roadmap

### Phase 1: Core Infrastructure
- Project setup and database
- Basic API endpoints
- Single channel (Email)

### Phase 2: Multi-Channel
- SMS integration (AWS SNS)
- WhatsApp integration
- Queue system

### Phase 3: Advanced Features
- Template management
- Message threading
- Webhook handlers

### Phase 4: Production Ready
- Monitoring and logging
- Documentation
- Docker deployment
- AWS setup guides
