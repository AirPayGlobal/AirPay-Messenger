# AirPay Messenger - Quick Start Guide

Get your unified messaging platform running in 5 minutes!

## Prerequisites

- Node.js 20.x or Docker installed
- AWS Account (for SMS, Email, Storage)
- 15 minutes of setup time

## Option 1: Quick Start with Docker (Recommended)

### 1. Run Setup Script

```bash
./scripts/setup.sh
```

Select option 1 (Docker setup) and follow the prompts. The script will:
- Create your `.env` file with generated secrets
- Start PostgreSQL, Redis, and the API
- Run database migrations
- Display your API key

### 2. Configure AWS Credentials

Edit `.env` and add your AWS credentials:

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
AWS_S3_BUCKET=your-bucket-name
```

### 3. Restart the API

```bash
docker-compose restart api
```

### 4. Test It!

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Send test email
curl -X POST http://localhost:3000/api/v1/messages/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "to": "test@example.com",
    "subject": "Hello from AirPay!",
    "body": "Your messaging platform is working!"
  }'
```

## Option 2: Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Services

```bash
# Start PostgreSQL and Redis (if not already running)
docker run -d --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:16-alpine
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 4. Setup Database

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

## What's Next?

### 1. Configure AWS Services

Follow the detailed setup guide for:
- **AWS SNS** for SMS: [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md#aws-configuration)
- **AWS SES** for Email: Configure domain, SPF, DKIM, DMARC
- **AWS S3** for Attachments: Create bucket and set permissions

### 2. (Optional) Set Up WhatsApp

If you want WhatsApp support:
1. Create Meta Business Account
2. Get WhatsApp Business API access
3. Configure webhook
4. Add credentials to `.env`

### 3. Integrate Into Your App

Choose your language:

**Node.js:**
```javascript
const AirPayMessenger = require('./examples/nodejs-client');
const messenger = new AirPayMessenger('your-api-key');

await messenger.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thanks for signing up!'
});
```

**Python:**
```python
from examples.python_client import AirPayMessenger

messenger = AirPayMessenger('your-api-key')

messenger.send_email(
    to='user@example.com',
    subject='Welcome!',
    body='Thanks for signing up!'
)
```

**cURL:**
```bash
curl -X POST $API_URL/messages/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "to": "user@example.com",
    "subject": "Welcome",
    "body": "Thanks for signing up!"
  }'
```

## Common Use Cases

### 1. Send Transactional Email

```bash
curl -X POST http://localhost:3000/api/v1/messages/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "to": "customer@example.com",
    "subject": "Your Order #12345 Has Shipped",
    "body": "Your order has been shipped and will arrive in 2-3 days.",
    "html": "<h2>Order Shipped</h2><p>Your order will arrive in 2-3 days.</p>"
  }'
```

### 2. Send SMS Verification Code

```bash
curl -X POST http://localhost:3000/api/v1/messages/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "sms",
    "to": "+1234567890",
    "body": "Your verification code is: 123456. Valid for 10 minutes."
  }'
```

### 3. Send WhatsApp Notification

```bash
curl -X POST http://localhost:3000/api/v1/messages/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "to": "1234567890",
    "body": "Your appointment is confirmed for tomorrow at 2 PM."
  }'
```

### 4. Schedule a Message

```bash
curl -X POST http://localhost:3000/api/v1/messages/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "to": "user@example.com",
    "subject": "Reminder",
    "body": "This is your scheduled reminder.",
    "scheduledAt": "2024-12-31T23:59:59Z"
  }'
```

### 5. Use Message Templates

First, create a template:

```bash
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_email",
    "channel": "email",
    "subjectTemplate": "Welcome {{firstName}}!",
    "bodyTemplate": "Hi {{firstName}}, welcome to {{companyName}}!",
    "htmlTemplate": "<h1>Welcome {{firstName}}!</h1>",
    "variables": ["firstName", "companyName"]
  }'
```

Then use it:

```bash
curl -X POST http://localhost:3000/api/v1/messages/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "to": "user@example.com",
    "templateId": "template-uuid-here",
    "templateVariables": {
      "firstName": "John",
      "companyName": "AirPay"
    }
  }'
```

## API Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/messages/send` | POST | Send message |
| `/messages/:id/status` | GET | Get message status |
| `/messages` | GET | Get message history |
| `/contacts` | POST | Create contact |
| `/contacts/:id` | GET | Get contact |
| `/contacts/:id` | PUT | Update contact |
| `/contacts` | GET | List contacts |
| `/webhooks/whatsapp` | GET/POST | WhatsApp webhook |
| `/webhooks/sms/status` | POST | SMS status webhook |
| `/webhooks/email/events` | POST | Email events webhook |

## Monitoring & Debugging

### View Logs

```bash
# Docker
docker-compose logs -f api

# Local
# Logs are in logs/all.log and logs/error.log
```

### Check Queue Status

```bash
# View queued messages
docker-compose exec redis redis-cli keys 'bull:*'

# Check queue lengths
docker-compose exec redis redis-cli
> LLEN bull:email:wait
> LLEN bull:sms:wait
> LLEN bull:whatsapp:wait
```

### Database Access

```bash
# Open Prisma Studio
npm run prisma:studio

# Or connect directly
docker-compose exec postgres psql -U airpay airpay_messenger
```

## Troubleshooting

### API Not Responding

```bash
# Check if containers are running
docker-compose ps

# Check API logs
docker-compose logs api

# Restart API
docker-compose restart api
```

### Messages Not Sending

1. Check AWS credentials in `.env`
2. Check queue workers are running: `docker-compose logs api | grep "worker"`
3. Check Redis is running: `docker-compose ps redis`
4. View failed jobs: `docker-compose exec redis redis-cli llen bull:email:failed`

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U airpay -d airpay_messenger -c "SELECT 1"

# Check DATABASE_URL in .env
```

## Production Deployment

For production deployment:

1. **AWS ECS/Fargate** (Recommended for AWS)
   - Build and push Docker image to ECR
   - Create ECS task definition
   - Configure Application Load Balancer
   - Set up auto-scaling

2. **Traditional VPS**
   - Use PM2 for process management
   - Set up Nginx reverse proxy
   - Configure SSL with Let's Encrypt
   - Set up log rotation

3. **Kubernetes**
   - Use provided Kubernetes manifests
   - Configure ingress controller
   - Set up horizontal pod autoscaling

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for detailed deployment instructions.

## Security Checklist

Before going to production:

- [ ] Change all default secrets and API keys
- [ ] Enable AWS SES production access
- [ ] Configure AWS spending limits for SNS
- [ ] Set up proper IAM roles with minimal permissions
- [ ] Enable HTTPS for all endpoints
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable message encryption (if needed)
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerts
- [ ] Review and test webhook security
- [ ] Configure SPF, DKIM, DMARC for email domain

## Cost Estimation

Approximate monthly costs for 100,000 messages:

- **AWS SNS (SMS)**: ~$645 (US, varies by country)
- **AWS SES (Email)**: ~$10
- **AWS S3 (Storage)**: ~$5 (for attachments)
- **AWS EC2/ECS**: ~$50-200 (depending on instance type)
- **Total**: ~$710-860/month

Free tier usage:
- AWS SES: 62,000 emails/month (when sent from EC2)
- AWS S3: 5GB storage free

## Support & Resources

- **Documentation**: [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md)
- **Setup Guide**: [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
- **API Examples**: [examples/](examples/)
- **GitHub Issues**: <repository-url>/issues

## Next Steps

1. ✅ Get the platform running
2. ✅ Send your first test message
3. ⬜ Configure AWS services for production
4. ⬜ Set up monitoring and alerts
5. ⬜ Integrate into your application
6. ⬜ Deploy to production
7. ⬜ Add custom templates
8. ⬜ Configure webhooks for status tracking

Happy messaging! 🚀
