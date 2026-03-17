# Deployment Guide

This guide covers deploying AirPay Messenger to various cloud platforms.

---

## 🚀 Quick Deploy Options

### **Option 1: Railway** ⭐ Recommended - Easiest

**Why Railway:**
- Free tier with $5/month credit
- Automatic PostgreSQL and Redis provisioning
- Zero-config deployments
- GitHub integration
- Automatic SSL certificates
- Built-in environment variables

**Deploy Steps:**

1. **Push to GitHub:**
   ```bash
   cd "/Users/ernestbeukes/Documents/Claude Code/AirPay Messenger"
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create airpay-messenger --private --source=. --remote=origin --push
   ```

2. **Deploy to Railway:**
   - Go to https://railway.app
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose `airpay-messenger`
   - Railway will auto-detect and deploy!

3. **Add PostgreSQL & Redis:**
   - Click "+ New" → "Database" → "PostgreSQL"
   - Click "+ New" → "Database" → "Redis"
   - Railway auto-connects them via `DATABASE_URL` and `REDIS_URL`

4. **Set Environment Variables:**
   Go to your service → Variables → Add:
   ```
   NODE_ENV=production
   JWT_SECRET=<generate-random-32-char-string>
   MASTER_API_KEY=<generate-random-32-char-string>

   # AWS Credentials
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=<your-key>
   AWS_SECRET_ACCESS_KEY=<your-secret>

   # AWS SES
   AWS_SES_FROM_EMAIL=noreply@yourdomain.com
   AWS_SES_FROM_NAME=AirPay Messenger

   # AWS S3
   AWS_S3_BUCKET=airpay-messenger-attachments

   # WhatsApp (optional)
   WHATSAPP_ACCESS_TOKEN=<your-token>
   WHATSAPP_PHONE_NUMBER_ID=<your-id>
   ```

5. **Run Migrations:**
   Railway runs them automatically via `Procfile`, but you can manually trigger:
   ```bash
   railway run npx prisma migrate deploy
   ```

6. **Get Your URL:**
   - Go to Settings → Domains
   - Railway provides: `your-app-name.up.railway.app`
   - Or add custom domain

**Cost:** Free tier ($5 credit/month) - enough for development/testing

---

### **Option 2: Render**

**Why Render:**
- Free tier available
- Easy database provisioning
- GitHub auto-deploy
- Good for production

**Deploy Steps:**

1. **Push to GitHub** (same as Railway step 1)

2. **Create Render Account:**
   - Go to https://render.com
   - Sign in with GitHub

3. **Create PostgreSQL Database:**
   - Dashboard → New → PostgreSQL
   - Name: `airpay-messenger-db`
   - Free tier is fine
   - Copy the "Internal Database URL"

4. **Create Redis Instance:**
   - Dashboard → New → Redis
   - Name: `airpay-messenger-redis`
   - Copy the "Internal Redis URL"

5. **Create Web Service:**
   - Dashboard → New → Web Service
   - Connect your GitHub repo
   - Settings:
     - **Name:** `airpay-messenger`
     - **Environment:** Node
     - **Build Command:** `npm install && npm run prisma:generate && npm run build`
     - **Start Command:** `npm start`
     - **Plan:** Free

6. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=<paste-internal-database-url>
   REDIS_URL=<paste-internal-redis-url>
   JWT_SECRET=<generate-random>
   MASTER_API_KEY=<generate-random>
   AWS_ACCESS_KEY_ID=<your-key>
   AWS_SECRET_ACCESS_KEY=<your-secret>
   AWS_REGION=us-east-1
   AWS_SES_FROM_EMAIL=noreply@yourdomain.com
   AWS_S3_BUCKET=airpay-messenger-attachments
   ```

7. **Deploy:**
   - Click "Create Web Service"
   - Render automatically builds and deploys
   - You get a URL: `your-app-name.onrender.com`

**Cost:** Free tier available (with limitations: spins down after 15min inactivity)

---

### **Option 3: AWS (ECS/Fargate)** - Production Grade

**Why AWS:**
- Full control and scalability
- Integrated with your AWS services (SNS, SES, S3)
- Auto-scaling
- VPC networking

**Prerequisites:**
- AWS CLI installed: `brew install awscli`
- AWS account configured: `aws configure`

**Deploy Steps:**

1. **Create ECR Repository:**
   ```bash
   aws ecr create-repository --repository-name airpay-messenger --region us-east-1
   ```

2. **Build and Push Docker Image:**
   ```bash
   cd "/Users/ernestbeukes/Documents/Claude Code/AirPay Messenger"

   # Get ECR login
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

   # Build image
   docker build -t airpay-messenger .

   # Tag image
   docker tag airpay-messenger:latest <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/airpay-messenger:latest

   # Push to ECR
   docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/airpay-messenger:latest
   ```

3. **Create RDS PostgreSQL:**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier airpay-messenger-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username postgres \
     --master-user-password <your-password> \
     --allocated-storage 20 \
     --publicly-accessible
   ```

4. **Create ElastiCache Redis:**
   ```bash
   aws elasticache create-cache-cluster \
     --cache-cluster-id airpay-messenger-redis \
     --cache-node-type cache.t3.micro \
     --engine redis \
     --num-cache-nodes 1
   ```

5. **Create ECS Cluster:**
   ```bash
   aws ecs create-cluster --cluster-name airpay-messenger
   ```

6. **Create Task Definition:**
   Save as `ecs-task-definition.json`:
   ```json
   {
     "family": "airpay-messenger",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "containerDefinitions": [
       {
         "name": "airpay-messenger",
         "image": "<YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/airpay-messenger:latest",
         "portMappings": [{"containerPort": 3000}],
         "environment": [
           {"name": "NODE_ENV", "value": "production"},
           {"name": "PORT", "value": "3000"},
           {"name": "DATABASE_URL", "value": "<your-rds-connection-string>"},
           {"name": "REDIS_HOST", "value": "<your-redis-endpoint>"},
           {"name": "JWT_SECRET", "value": "<your-secret>"}
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/airpay-messenger",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

   Register it:
   ```bash
   aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
   ```

7. **Create ECS Service:**
   ```bash
   aws ecs create-service \
     --cluster airpay-messenger \
     --service-name airpay-messenger-service \
     --task-definition airpay-messenger \
     --desired-count 1 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[<your-subnet-id>],securityGroups=[<your-sg-id>],assignPublicIp=ENABLED}"
   ```

8. **Set up Application Load Balancer** (optional but recommended for HTTPS)

**Cost:** ~$30-50/month minimum (Fargate + RDS + Redis)

---

### **Option 4: Vercel/Netlify** - For Dashboard Only

**Note:** Vercel/Netlify are great for static sites but don't support long-running Node.js servers. You can:
- Deploy the **dashboard UI** to Vercel/Netlify
- Deploy the **API backend** to Railway/Render/AWS

**Dashboard Deploy to Vercel:**

1. **Create `vercel.json`:**
   ```json
   {
     "buildCommand": "echo 'No build needed'",
     "outputDirectory": "public",
     "routes": [
       { "src": "/.*", "dest": "/index.html" }
     ]
   }
   ```

2. **Deploy:**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

3. **Update Dashboard API URL:**
   Edit `public/index.html`, change:
   ```javascript
   baseUrl: 'https://your-api.railway.app/api/v1'
   ```

---

## 🔧 Post-Deployment Setup

### 1. Run Database Migrations

**Railway/Render:**
```bash
# Railway
railway run npx prisma migrate deploy

# Render
# Add to Build Command:
npm run prisma:generate && npx prisma migrate deploy && npm run build
```

**AWS:**
```bash
# SSH into container or use ECS Exec
aws ecs execute-command --cluster airpay-messenger --task <task-id> --command "npx prisma migrate deploy" --interactive
```

### 2. Seed Initial Data

```bash
railway run npm run prisma:seed   # Railway
# or
render run npm run prisma:seed    # Render
```

### 3. Configure Custom Domain

**Railway:**
- Settings → Domains → Add Custom Domain
- Add DNS CNAME: `your-domain.com` → `your-app.up.railway.app`

**Render:**
- Settings → Custom Domains → Add Domain
- Add DNS CNAME as instructed

**AWS:**
- Use Route 53 or CloudFront

### 4. Set Up SSL Certificate

All platforms (Railway, Render, AWS) provide automatic SSL certificates.

### 5. Configure Environment-Specific Settings

Update webhook URLs in:
- **WhatsApp:** `https://your-domain.com/api/v1/webhooks/whatsapp`
- **AWS SNS:** Subscribe to topic with your endpoint
- **AWS SES:** Configure SNS topic for email events

---

## 📊 Monitoring & Logs

### Railway
- Dashboard → Deployments → View Logs
- Metrics tab shows CPU/memory usage

### Render
- Dashboard → Logs tab
- Metrics tab for performance

### AWS
```bash
# View CloudWatch logs
aws logs tail /ecs/airpay-messenger --follow

# View service events
aws ecs describe-services --cluster airpay-messenger --services airpay-messenger-service
```

---

## 🔐 Security Checklist

Before going live:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Change `MASTER_API_KEY` to a strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Enable AWS SES production access
- [ ] Configure AWS spending limits for SNS
- [ ] Set up IAM roles with minimal permissions
- [ ] Enable HTTPS (automatic on most platforms)
- [ ] Configure CORS properly for your domain
- [ ] Set up database backups
- [ ] Configure log retention policies
- [ ] Set up monitoring/alerting
- [ ] Review and test webhook security
- [ ] Configure SPF, DKIM, DMARC for email domain

---

## 🚨 Troubleshooting

### App Won't Start

**Check logs:**
```bash
railway logs     # Railway
render logs      # Render
aws logs tail    # AWS
```

**Common issues:**
- Missing environment variables
- Database not accessible
- Port binding issues (ensure `PORT` env var is set)

### Database Connection Failed

- Verify `DATABASE_URL` format
- Check database is running
- Verify network/firewall rules
- For AWS: Check security groups

### Prisma Migrations Failed

```bash
# Force reset (CAUTION: deletes data)
railway run npx prisma migrate reset --force

# Or manually run
railway run npx prisma migrate deploy
```

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid (Small) | Paid (Production) |
|----------|-----------|--------------|-------------------|
| **Railway** | $5 credit/mo | ~$10-20/mo | ~$50-100/mo |
| **Render** | Free (limited) | ~$7/mo | ~$25-50/mo |
| **AWS** | Free tier 12mo | ~$30/mo | ~$100-500/mo |
| **Vercel** (UI only) | Free | Free | $20/mo |

---

## 🎯 Recommended Approach

**For Development/Testing:**
→ **Railway** (easiest, free $5 credit)

**For Production (Small):**
→ **Render** (cost-effective, reliable)

**For Production (Scale):**
→ **AWS ECS** (full control, integrated services)

**For Static Dashboard:**
→ **Vercel** + API on Railway/Render

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

---

## Quick Deploy Commands

### Railway (Fastest)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Render (CLI)
```bash
# Push to GitHub first
git push origin main

# Then deploy via Render dashboard
# https://render.com
```

### AWS (Advanced)
```bash
# Full AWS deployment script
./scripts/deploy-aws.sh
```

---

**Need help?** Check the troubleshooting section or open an issue!
