#!/bin/bash

# AirPay Messenger - Railway Deployment Script
# This script automates deployment to Railway

set -e

echo "🚀 AirPay Messenger - Railway Deployment"
echo "========================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Check if git repo is initialized
if [ ! -d .git ]; then
    echo "📝 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit"
fi

# Login to Railway
echo ""
echo "🔐 Please login to Railway..."
railway login

# Create new project or link existing
echo ""
echo "📋 Choose an option:"
echo "1. Create new Railway project"
echo "2. Link to existing Railway project"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "🆕 Creating new Railway project..."
    railway init
else
    echo ""
    echo "🔗 Linking to existing project..."
    railway link
fi

# Add PostgreSQL
echo ""
read -p "📊 Add PostgreSQL database? (y/n): " add_postgres
if [ "$add_postgres" = "y" ]; then
    echo "Adding PostgreSQL..."
    railway add --plugin postgresql
fi

# Add Redis
echo ""
read -p "📦 Add Redis? (y/n): " add_redis
if [ "$add_redis" = "y" ]; then
    echo "Adding Redis..."
    railway add --plugin redis
fi

# Set environment variables
echo ""
echo "⚙️  Setting environment variables..."
echo ""
echo "Please provide the following values:"
echo ""

read -p "JWT_SECRET (press enter to generate): " jwt_secret
if [ -z "$jwt_secret" ]; then
    jwt_secret=$(openssl rand -hex 32)
    echo "Generated: $jwt_secret"
fi

read -p "MASTER_API_KEY (press enter to generate): " api_key
if [ -z "$api_key" ]; then
    api_key=$(openssl rand -hex 32)
    echo "Generated: $api_key"
fi

echo ""
echo "AWS Configuration (required for sending messages):"
read -p "AWS_REGION (default: us-east-1): " aws_region
aws_region=${aws_region:-us-east-1}

read -p "AWS_ACCESS_KEY_ID: " aws_key_id
read -p "AWS_SECRET_ACCESS_KEY: " aws_secret

read -p "AWS_SES_FROM_EMAIL: " from_email
read -p "AWS_S3_BUCKET: " s3_bucket

# Set variables in Railway
railway variables set NODE_ENV=production
railway variables set JWT_SECRET="$jwt_secret"
railway variables set MASTER_API_KEY="$api_key"
railway variables set AWS_REGION="$aws_region"
railway variables set AWS_ACCESS_KEY_ID="$aws_key_id"
railway variables set AWS_SECRET_ACCESS_KEY="$aws_secret"
railway variables set AWS_SES_FROM_EMAIL="$from_email"
railway variables set AWS_SES_FROM_NAME="AirPay Messenger"
railway variables set AWS_S3_BUCKET="$s3_bucket"

echo ""
echo "✅ Environment variables set!"
echo ""
echo "📝 SAVE THESE CREDENTIALS:"
echo "=========================="
echo "MASTER_API_KEY: $api_key"
echo "JWT_SECRET: $jwt_secret"
echo "=========================="
echo ""

# Optional: WhatsApp
read -p "Configure WhatsApp? (y/n): " add_whatsapp
if [ "$add_whatsapp" = "y" ]; then
    read -p "WHATSAPP_ACCESS_TOKEN: " wa_token
    read -p "WHATSAPP_PHONE_NUMBER_ID: " wa_phone
    railway variables set WHATSAPP_ACCESS_TOKEN="$wa_token"
    railway variables set WHATSAPP_PHONE_NUMBER_ID="$wa_phone"
fi

# Deploy
echo ""
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Railway is building and deploying your app"
echo "2. Get your URL: railway domain"
echo "3. View logs: railway logs"
echo "4. Open dashboard: railway open"
echo ""
echo "🔗 Useful commands:"
echo "  railway logs        - View application logs"
echo "  railway domain      - Get your deployment URL"
echo "  railway open        - Open Railway dashboard"
echo "  railway run <cmd>   - Run commands in Railway environment"
echo ""
echo "📚 Documentation: https://docs.railway.app"
echo ""
