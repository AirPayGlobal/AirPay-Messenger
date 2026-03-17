# AirPay Messenger - File Structure

Complete overview of all files in the project and their purposes.

## Root Files

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation |
| `ARCHITECTURE.md` | System architecture and design documentation |
| `QUICK_START.md` | Quick start guide for new users |
| `PROJECT_SUMMARY.md` | Comprehensive project overview |
| `FILE_STRUCTURE.md` | This file - complete file structure reference |
| `package.json` | Node.js dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `.env.example` | Environment variables template |
| `.gitignore` | Git ignore rules |
| `Dockerfile` | Docker container definition |
| `docker-compose.yml` | Docker Compose orchestration |

## Source Code (`src/`)

### Configuration (`src/config/`)
| File | Purpose |
|------|---------|
| `index.ts` | Central configuration management, environment variables |

### Controllers (`src/controllers/`)
| File | Purpose |
|------|---------|
| `message.controller.ts` | Message API endpoints (send, status, history) |
| `contact.controller.ts` | Contact API endpoints (CRUD operations) |
| `webhook.controller.ts` | Webhook handlers (WhatsApp, SMS, Email) |

### Database (`src/database/`)
| File | Purpose |
|------|---------|
| `client.ts` | Prisma client setup and connection management |

### Middleware (`src/middleware/`)
| File | Purpose |
|------|---------|
| `auth.ts` | Authentication and authorization (API keys, JWT, permissions) |

### Routes (`src/routes/`)
| File | Purpose |
|------|---------|
| `index.ts` | Main route aggregator |
| `message.routes.ts` | Message endpoint routes |
| `contact.routes.ts` | Contact endpoint routes |
| `webhook.routes.ts` | Webhook endpoint routes |

### Services (`src/services/`)
| File | Purpose |
|------|---------|
| `message.service.ts` | Unified messaging service (coordinates all channels) |
| `email.service.ts` | AWS SES email integration |
| `sms.service.ts` | AWS SNS SMS integration |
| `whatsapp.service.ts` | WhatsApp Business API integration |
| `storage.service.ts` | AWS S3 file storage integration |
| `queue.service.ts` | Bull queue management (Redis-based) |
| `contact.service.ts` | Contact management business logic |

### Utilities (`src/utils/`)
| File | Purpose |
|------|---------|
| `logger.ts` | Winston logging setup with CloudWatch support |
| `errors.ts` | Custom error classes and error handler |

### Workers (`src/workers/`)
| File | Purpose |
|------|---------|
| `message.worker.ts` | Queue workers for processing messages |

### Application Files
| File | Purpose |
|------|---------|
| `app.ts` | Express application setup and middleware |
| `index.ts` | Application entry point and server startup |

## Database (`prisma/`)

| File | Purpose |
|------|---------|
| `schema.prisma` | Complete database schema (PostgreSQL with Prisma) |
| `seed.ts` | Database seeding script (sample data, API keys) |

## Documentation (`docs/`)

| File | Purpose |
|------|---------|
| `SETUP_GUIDE.md` | Comprehensive step-by-step setup instructions |

## Examples (`examples/`)

| File | Purpose |
|------|---------|
| `nodejs-client.js` | Node.js client library with usage examples |
| `python-client.py` | Python client library with usage examples |
| `api-tests.sh` | Shell script for testing all API endpoints |

## Scripts (`scripts/`)

| File | Purpose |
|------|---------|
| `setup.sh` | Automated setup script for quick installation |

## Database Schema Overview

### Tables Created
- **contacts** - Contact information (email, phone, WhatsApp ID)
- **messages** - All sent and received messages
- **message_recipients** - CC/BCC recipients for emails
- **templates** - Reusable message templates
- **attachments** - File attachments (S3 references)
- **webhook_logs** - Incoming webhook events
- **api_keys** - API authentication keys
- **message_queue_jobs** - Queue job tracking

### Enums
- **MessageChannel**: whatsapp, sms, email
- **MessageDirection**: inbound, outbound
- **MessageStatus**: queued, sent, delivered, read, failed, bounced
- **RecipientType**: to, cc, bcc
- **QueueJobStatus**: pending, processing, completed, failed

## Key Features by File

### Message Processing Flow
1. **Request** → `message.routes.ts` → `message.controller.ts`
2. **Business Logic** → `message.service.ts`
3. **Queue** → `queue.service.ts` → Redis (Bull)
4. **Worker** → `message.worker.ts` processes job
5. **Channel Service** → `email.service.ts`, `sms.service.ts`, or `whatsapp.service.ts`
6. **External API** → AWS SES/SNS or WhatsApp API
7. **Status Update** → Back to `message.service.ts` → Database

### Authentication Flow
1. **Request** → `auth.ts` middleware
2. **Extract API Key** → From Authorization header or X-API-Key
3. **Validate** → Hash comparison with database
4. **Attach** → User/service info to request
5. **Check Permissions** → Against required permissions
6. **Continue** → To controller or reject (401/403)

### Webhook Processing Flow
1. **External Service** → Sends webhook to `/webhooks/*`
2. **webhook.controller.ts** → Receives and validates
3. **webhook_logs table** → Stores raw payload
4. **Async Processing** → Process webhook data
5. **Database Update** → Update message status
6. **Response** → Return 200 OK immediately

## Development Workflow

### Local Development
```bash
npm install              # Install dependencies
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed database (optional)
npm run dev             # Start dev server with hot reload
```

### Production Build
```bash
npm install --production  # Install production deps only
npm run build            # Compile TypeScript to JavaScript
npm start               # Start production server
```

### Docker Development
```bash
docker-compose up -d     # Start all services
docker-compose logs -f api  # View logs
docker-compose down      # Stop all services
```

## File Size Overview

### Large Files (>500 lines)
- `ARCHITECTURE.md` - Comprehensive architecture documentation
- `docs/SETUP_GUIDE.md` - Detailed setup instructions
- `examples/nodejs-client.js` - Full client implementation with examples
- `examples/python-client.py` - Full Python client with examples
- `prisma/schema.prisma` - Complete database schema

### Core Implementation Files (100-500 lines)
- All service files (`src/services/*.ts`)
- Controller files (`src/controllers/*.ts`)
- `src/app.ts` - Express setup
- `src/config/index.ts` - Configuration

### Small Files (<100 lines)
- Route files (`src/routes/*.ts`)
- Utility files (`src/utils/*.ts`)
- Worker files (`src/workers/*.ts`)

## Configuration Files

### TypeScript
- `tsconfig.json` - Compiler options, strict mode enabled

### Docker
- `Dockerfile` - Multi-stage build, non-root user, health checks
- `docker-compose.yml` - PostgreSQL, Redis, API, optional Prisma Studio

### Package Management
- `package.json` - Dependencies, scripts, engines

### Environment
- `.env.example` - Template with all configuration options
- `.env` - Your local configuration (not in git)

## Generated Files (Not in Git)

The following are generated and should not be committed:

```
node_modules/          # NPM packages
dist/                  # Compiled JavaScript
.env                   # Local environment config
logs/                  # Application logs
prisma/migrations/     # Migration files (tracked in git, but can be regenerated)
```

## Testing Files

To be implemented:
- `src/**/*.test.ts` - Unit tests
- `src/**/*.spec.ts` - Integration tests
- `jest.config.js` - Jest configuration

## Deployment Files

### Production
- `Dockerfile` - Production container
- `docker-compose.yml` - Local development/testing
- `.dockerignore` - Files to exclude from build

### CI/CD (To be implemented)
- `.github/workflows/` - GitHub Actions
- `kubernetes/` - Kubernetes manifests
- `helm/` - Helm charts

## Total File Count

- **Source Code**: ~30 TypeScript files
- **Documentation**: 5 markdown files
- **Configuration**: 5 files
- **Examples**: 3 files
- **Scripts**: 2 files
- **Total**: ~45 files (excluding node_modules)

## File Naming Conventions

- **Controllers**: `*.controller.ts` - API endpoint handlers
- **Services**: `*.service.ts` - Business logic
- **Routes**: `*.routes.ts` - Express route definitions
- **Middleware**: `*.ts` - Express middleware functions
- **Utils**: `*.ts` - Utility functions
- **Workers**: `*.worker.ts` - Queue workers
- **Examples**: `*-client.js/py` - Client implementations
- **Scripts**: `*.sh` - Shell scripts
- **Docs**: `*.md` - Markdown documentation

## Import Patterns

### Service Imports
```typescript
import { emailService } from './services/email.service';
import { smsService } from './services/sms.service';
```

### Database Imports
```typescript
import { prisma } from './database/client';
import { MessageChannel, MessageStatus } from '@prisma/client';
```

### Utility Imports
```typescript
import { logger } from './utils/logger';
import { ValidationError, NotFoundError } from './utils/errors';
```

### Configuration Imports
```typescript
import { config } from './config';
```

## Next Steps

To understand the codebase:

1. Start with `README.md` - Overview and quick start
2. Read `ARCHITECTURE.md` - System design
3. Review `src/index.ts` - Application entry point
4. Explore `src/services/` - Core business logic
5. Check `prisma/schema.prisma` - Database structure
6. Test with `examples/` - See it in action

For setup:
1. Follow `QUICK_START.md` for fast setup
2. Use `docs/SETUP_GUIDE.md` for production
3. Run `./scripts/setup.sh` for automated setup
4. Test with `./examples/api-tests.sh`
