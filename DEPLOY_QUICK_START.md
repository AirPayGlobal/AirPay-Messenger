# 🚀 Deploy to Cloud - Quick Start

Choose your deployment platform and follow the steps:

---

## ⭐ Railway (Recommended - Easiest)

**Time:** 5-10 minutes
**Cost:** Free ($5/month credit)

### Quick Deploy:

```bash
# 1. Run automated deploy script
./scripts/deploy-railway.sh

# OR manually:
npm install -g @railway/cli
railway login
railway init
railway up
```

### After Deploy:

```bash
# Get your URL
railway domain

# View logs
railway logs

# Open dashboard
railway open
```

**Your app will be live at:** `your-app.up.railway.app`

---

## 🔷 Render

**Time:** 10-15 minutes
**Cost:** Free tier available

### Steps:

1. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create airpay-messenger --private --source=. --push
   ```

2. Go to https://render.com
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Settings:
   - Build: `npm install && npm run prisma:generate && npm run build`
   - Start: `npm start`
6. Add PostgreSQL: New + → PostgreSQL
7. Set environment variables (see docs/DEPLOYMENT.md)
8. Deploy!

**Your app will be live at:** `your-app.onrender.com`

---

## ☁️ AWS (Production Grade)

**Time:** 30-60 minutes
**Cost:** ~$30-50/month

### Prerequisites:
```bash
brew install awscli
aws configure
```

### Deploy:
See full guide in `docs/DEPLOYMENT.md`

---

## 🎨 Deploy Dashboard Only (Vercel)

If you want to deploy just the UI to Vercel and keep the API elsewhere:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Update API URL in public/index.html to point to your API
```

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] AWS credentials (Access Key ID + Secret)
- [ ] AWS SES domain verified (for email)
- [ ] AWS S3 bucket created (for attachments)
- [ ] WhatsApp API credentials (optional)
- [ ] Custom domain (optional)

---

## 🔑 Required Environment Variables

All platforms need these:

```env
NODE_ENV=production
DATABASE_URL=<auto-set-by-platform>
JWT_SECRET=<generate-random-32-chars>
MASTER_API_KEY=<generate-random-32-chars>

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
AWS_S3_BUCKET=airpay-messenger-attachments
```

**Generate secrets:**
```bash
openssl rand -hex 32
```

---

## 🧪 Test Deployment

After deploying:

```bash
# Health check
curl https://your-app.railway.app/api/v1/health

# Should return:
# {"success":true,"status":"healthy","timestamp":"..."}
```

---

## 📊 Platform Comparison

| Feature | Railway | Render | AWS |
|---------|---------|--------|-----|
| **Setup Time** | 5 min | 15 min | 60 min |
| **Free Tier** | $5 credit | Yes (limited) | 12 months |
| **Auto-Deploy** | ✅ | ✅ | Manual |
| **Database** | ✅ Included | ✅ Included | Setup required |
| **SSL** | ✅ Auto | ✅ Auto | Manual |
| **Scaling** | Easy | Easy | Full control |
| **Best For** | Dev/Test | Small Prod | Large Scale |

---

## 🆘 Quick Troubleshooting

### Build Fails
```bash
# Check logs
railway logs  # or render logs

# Common fix: ensure Node 20+
# Check package.json has: "engines": {"node": ">=20.0.0"}
```

### Database Connection Issues
```bash
# Railway: Database auto-connects
# Render: Copy "Internal Database URL" from dashboard
# AWS: Check security groups
```

### App Won't Start
```bash
# Ensure PORT environment variable is set
# Railway/Render set this automatically
# Check logs for specific error
```

---

## 📚 Full Documentation

- Detailed deployment guide: `docs/DEPLOYMENT.md`
- AWS setup: `docs/SETUP_GUIDE.md`
- Architecture: `ARCHITECTURE.md`

---

## 🎯 Recommended Path

1. **Start with Railway** for quick testing
2. **Move to Render** for small production
3. **Scale to AWS** when you need more control

---

## 🔗 Quick Links

- Railway: https://railway.app
- Render: https://render.com
- AWS Console: https://console.aws.amazon.com
- GitHub: https://github.com

---

**Need help?** Check `docs/DEPLOYMENT.md` for detailed instructions!
