# AirPay Messenger Setup Guide

Complete step-by-step guide to set up and deploy AirPay Messenger.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [AWS Configuration](#aws-configuration)
4. [WhatsApp Configuration](#whatsapp-configuration)
5. [Production Deployment](#production-deployment)
6. [Post-Deployment](#post-deployment)

## Prerequisites

### Required Accounts

- AWS Account with billing enabled
- (Optional) Meta Business Account for WhatsApp
- Domain name for email sending
- SSL certificate for webhooks

### Required Software

- Node.js 20.x or higher
- PostgreSQL 16.x
- Redis 7.x
- Docker & Docker Compose (for containerized deployment)
- Git

## Local Development Setup

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd airpay-messenger
npm install
```

### Step 2: Database Setup

```bash
# Start PostgreSQL (if using Docker)
docker run -d \
  --name postgres \
  -e POSTGRES_USER=airpay \
  -e POSTGRES_PASSWORD=airpay_password \
  -e POSTGRES_DB=airpay_messenger \
  -p 5432:5432 \
  postgres:16-alpine

# Or use existing PostgreSQL instance
```

### Step 3: Redis Setup

```bash
# Start Redis (if using Docker)
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Step 4: Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://airpay:airpay_password@localhost:5432/airpay_messenger?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret (generate a secure random string)
JWT_SECRET=$(openssl rand -hex 32)

# Master API Key (generate a secure random string)
MASTER_API_KEY=$(openssl rand -hex 32)

# AWS Credentials (get from AWS IAM)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# AWS SNS
AWS_SNS_SENDER_ID=YourCompany

# AWS SES
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
AWS_SES_FROM_NAME=Your Company

# AWS S3
AWS_S3_BUCKET=your-bucket-name

# WhatsApp (leave empty if not using)
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

### Step 5: Database Migration

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run seed
```

### Step 6: Start Development Server

```bash
npm run dev
```

The API should now be running at `http://localhost:3000`

### Step 7: Test the API

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Create a test API key
node -e "
const bcrypt = require('bcryptjs');
const key = require('crypto').randomBytes(32).toString('hex');
console.log('API Key:', key);
bcrypt.hash(key, 10).then(hash => console.log('Hash:', hash));
"
```

## AWS Configuration

### Step 1: Create IAM User

1. Go to AWS Console → IAM → Users
2. Click "Create user"
3. User name: `airpay-messenger`
4. Select "Programmatic access"
5. Save Access Key ID and Secret Access Key

### Step 2: Attach IAM Policies

Create and attach custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:SetSMSAttributes",
        "sns:GetSMSAttributes"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:GetSendQuota"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### Step 3: Configure SNS for SMS

```bash
# Set SMS attributes
aws sns set-sms-attributes \
  --attributes DefaultSMSType=Transactional

# Set spending limit (optional)
aws sns set-sms-attributes \
  --attributes MonthlySpendLimit=100
```

For production SMS:
1. Go to AWS Console → Pinpoint → SMS and voice
2. Request a phone number or Sender ID
3. Configure spending limits
4. Request production access if needed

### Step 4: Configure SES for Email

#### 4.1 Verify Domain

```bash
# Verify your domain
aws ses verify-domain-identity --domain yourdomain.com
```

This returns TXT and CNAME records. Add them to your DNS:

**DNS Records to Add:**

```
# Verification TXT record
_amazonses.yourdomain.com TXT "verification-code"

# DKIM CNAME records (3 records)
dkim1._domainkey.yourdomain.com CNAME dkim1.value.amazonses.com
dkim2._domainkey.yourdomain.com CNAME dkim2.value.amazonses.com
dkim3._domainkey.yourdomain.com CNAME dkim3.value.amazonses.com
```

#### 4.2 Configure SPF, DKIM, DMARC

Add these DNS records:

```
# SPF Record
yourdomain.com TXT "v=spf1 include:amazonses.com ~all"

# DMARC Record
_dmarc.yourdomain.com TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
```

#### 4.3 Create Configuration Set

```bash
# Create configuration set
aws ses create-configuration-set \
  --configuration-set-name airpay-ses-config

# Enable event publishing
aws ses put-configuration-set-event-destination \
  --configuration-set-name airpay-ses-config \
  --event-destination '{
    "Name": "sns-events",
    "Enabled": true,
    "MatchingEventTypes": ["send","bounce","complaint","delivery","open","click"],
    "SNSDestination": {
      "TopicARN": "arn:aws:sns:us-east-1:YOUR_ACCOUNT:ses-events"
    }
  }'
```

#### 4.4 Request Production Access

1. Go to AWS Console → SES → Account dashboard
2. Click "Request production access"
3. Fill out the form with:
   - Use case description
   - Expected daily volume
   - Bounce/complaint handling process
4. Wait for approval (usually 24-48 hours)

### Step 5: Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://airpay-messenger-attachments --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket airpay-messenger-attachments \
  --versioning-configuration Status=Enabled

# Configure lifecycle policy (optional - delete old files after 90 days)
aws s3api put-bucket-lifecycle-configuration \
  --bucket airpay-messenger-attachments \
  --lifecycle-configuration file://lifecycle.json
```

Create `lifecycle.json`:

```json
{
  "Rules": [
    {
      "Id": "DeleteOldAttachments",
      "Status": "Enabled",
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

## WhatsApp Configuration

### Step 1: Create Meta Business Account

1. Go to developers.facebook.com
2. Create a Business Account
3. Create a new App
4. Add WhatsApp product

### Step 2: Get API Credentials

1. Go to WhatsApp → Getting Started
2. Copy:
   - Phone Number ID
   - WhatsApp Business Account ID
   - Temporary Access Token

### Step 3: Generate Permanent Access Token

1. Go to Business Settings → System Users
2. Create a system user
3. Assign WhatsApp permissions
4. Generate permanent token

### Step 4: Configure Webhook

1. Go to WhatsApp → Configuration
2. Set Webhook URL: `https://yourdomain.com/api/v1/webhooks/whatsapp`
3. Set Verify Token: (generate random string)
4. Subscribe to events:
   - messages
   - message_status

Add to `.env`:

```env
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=your_permanent_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_random_verify_token
```

### Step 5: Test WhatsApp

```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "YOUR_PHONE_NUMBER",
    "type": "text",
    "text": { "body": "Test message" }
  }'
```

## Production Deployment

### Option 1: Docker Compose (Recommended)

```bash
# On your server
git clone <repository-url>
cd airpay-messenger

# Configure environment
cp .env.example .env
nano .env

# Start services
docker-compose up -d

# Run migrations
docker-compose exec api npm run prisma:migrate

# Check logs
docker-compose logs -f api
```

### Option 2: AWS ECS/Fargate

1. Build and push Docker image:

```bash
# Build image
docker build -t airpay-messenger .

# Tag for ECR
docker tag airpay-messenger:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/airpay-messenger:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/airpay-messenger:latest
```

2. Create ECS Task Definition
3. Create ECS Service
4. Configure Application Load Balancer
5. Configure Auto Scaling

### Option 3: Traditional Server

```bash
# On your server
git clone <repository-url>
cd airpay-messenger

# Install dependencies
npm ci --only=production

# Build
npm run build

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name airpay-api

# Save PM2 configuration
pm2 save
pm2 startup
```

## Post-Deployment

### 1. Generate API Keys

```bash
# Connect to your server/container
docker-compose exec api node

# In Node REPL:
const { generateApiKey } = require('./dist/middleware/auth');
generateApiKey('Internal App', 'my-app', { '*': true }).then(console.log);
```

Save the generated API key securely.

### 2. Configure DNS

Point your domain to your server:

```
api.yourdomain.com A YOUR_SERVER_IP
```

### 3. Set Up SSL

```bash
# Using Certbot
sudo certbot --nginx -d api.yourdomain.com
```

### 4. Configure Nginx (if not using ALB)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. Test Production API

```bash
# Health check
curl https://api.yourdomain.com/api/v1/health

# Send test message
curl -X POST https://api.yourdomain.com/api/v1/messages/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "to": "test@example.com",
    "subject": "Test",
    "body": "Test message"
  }'
```

### 6. Set Up Monitoring

- Enable CloudWatch Logs
- Set up alerts for error rates
- Monitor queue depths
- Track API response times
- Monitor AWS costs

### 7. Backup Strategy

```bash
# Database backup
pg_dump airpay_messenger > backup.sql

# Or use automated backups
# AWS RDS: Enable automated backups
# PostgreSQL: Configure continuous archiving
```

## Troubleshooting

### Can't connect to database

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Test connection
npm run prisma:studio
```

### Messages not sending

```bash
# Check queue
docker-compose exec redis redis-cli keys bull:*

# Check logs
docker-compose logs api

# Verify AWS credentials
aws sts get-caller-identity
```

### WhatsApp webhook not working

```bash
# Check webhook URL is publicly accessible
curl https://api.yourdomain.com/api/v1/webhooks/whatsapp

# Verify webhook token matches
echo $WHATSAPP_WEBHOOK_VERIFY_TOKEN

# Check WhatsApp webhook logs in Meta dashboard
```

## Next Steps

- Review [ARCHITECTURE.md](../ARCHITECTURE.md) for API details
- Check [examples/](../examples/) for integration code
- Set up monitoring and alerts
- Configure backup strategy
- Review security best practices
