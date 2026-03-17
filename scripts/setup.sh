#!/bin/bash

# AirPay Messenger Setup Script
# This script helps with initial setup and configuration

set -e

echo "================================================"
echo "AirPay Messenger - Setup Script"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 20.x or higher"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node --version) found"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm $(npm --version) found"

# Check if PostgreSQL is available
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓${NC} PostgreSQL found"
else
    echo -e "${YELLOW}!${NC} PostgreSQL not found (optional if using Docker)"
fi

# Check if Redis is available
if command -v redis-cli &> /dev/null; then
    echo -e "${GREEN}✓${NC} Redis found"
else
    echo -e "${YELLOW}!${NC} Redis not found (optional if using Docker)"
fi

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker $(docker --version | cut -d ' ' -f3) found"
    DOCKER_AVAILABLE=true
else
    echo -e "${YELLOW}!${NC} Docker not found"
    DOCKER_AVAILABLE=false
fi

echo ""
echo "================================================"
echo "Setup Options"
echo "================================================"
echo ""
echo "1. Full setup with Docker (recommended)"
echo "2. Local development setup"
echo "3. Generate API key only"
echo "4. Exit"
echo ""

read -p "Select option (1-4): " option

case $option in
    1)
        echo ""
        echo "Setting up with Docker..."
        echo ""

        if [ "$DOCKER_AVAILABLE" = false ]; then
            echo -e "${RED}Error: Docker is required for this option${NC}"
            exit 1
        fi

        # Create .env file
        if [ ! -f .env ]; then
            echo "Creating .env file..."
            cp .env.example .env

            # Generate secrets
            JWT_SECRET=$(openssl rand -hex 32)
            API_KEY=$(openssl rand -hex 32)

            # Update .env file
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/g" .env
                sed -i '' "s/your-master-api-key-change-this/$API_KEY/g" .env
            else
                sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/g" .env
                sed -i "s/your-master-api-key-change-this/$API_KEY/g" .env
            fi

            echo -e "${GREEN}✓${NC} .env file created"
            echo ""
            echo -e "${YELLOW}Important: Your Master API Key is:${NC}"
            echo -e "${GREEN}$API_KEY${NC}"
            echo ""
            echo "Save this key securely! You'll need it to access the API."
            echo ""
            read -p "Press Enter to continue..."
        else
            echo -e "${YELLOW}!${NC} .env file already exists, skipping creation"
        fi

        # Start Docker services
        echo ""
        echo "Starting Docker services..."
        docker-compose up -d

        echo ""
        echo "Waiting for services to be ready..."
        sleep 10

        # Run migrations
        echo ""
        echo "Running database migrations..."
        docker-compose exec -T api npm run prisma:migrate || true

        echo ""
        echo -e "${GREEN}✓${NC} Setup complete!"
        echo ""
        echo "Services are running:"
        echo "  - API: http://localhost:3000"
        echo "  - PostgreSQL: localhost:5432"
        echo "  - Redis: localhost:6379"
        echo ""
        echo "View logs: docker-compose logs -f api"
        echo "Stop services: docker-compose down"
        ;;

    2)
        echo ""
        echo "Setting up for local development..."
        echo ""

        # Create .env file
        if [ ! -f .env ]; then
            echo "Creating .env file..."
            cp .env.example .env

            # Generate secrets
            JWT_SECRET=$(openssl rand -hex 32)
            API_KEY=$(openssl rand -hex 32)

            # Update .env file
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/g" .env
                sed -i '' "s/your-master-api-key-change-this/$API_KEY/g" .env
            else
                sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/g" .env
                sed -i "s/your-master-api-key-change-this/$API_KEY/g" .env
            fi

            echo -e "${GREEN}✓${NC} .env file created"
            echo ""
            echo -e "${YELLOW}Important: Your Master API Key is:${NC}"
            echo -e "${GREEN}$API_KEY${NC}"
            echo ""
            echo "Save this key securely!"
            echo ""
        else
            echo -e "${YELLOW}!${NC} .env file already exists"
        fi

        # Install dependencies
        echo "Installing dependencies..."
        npm install

        echo -e "${GREEN}✓${NC} Dependencies installed"

        # Generate Prisma client
        echo "Generating Prisma client..."
        npm run prisma:generate

        echo -e "${GREEN}✓${NC} Prisma client generated"

        # Check database connection
        echo ""
        echo -e "${YELLOW}Note:${NC} Make sure PostgreSQL and Redis are running"
        echo ""
        read -p "Press Enter when ready to run migrations..."

        # Run migrations
        echo "Running database migrations..."
        npm run prisma:migrate || echo -e "${RED}Failed to run migrations. Check your database connection.${NC}"

        echo ""
        echo -e "${GREEN}✓${NC} Setup complete!"
        echo ""
        echo "To start the development server:"
        echo "  npm run dev"
        echo ""
        echo "The API will be available at: http://localhost:3000"
        ;;

    3)
        echo ""
        echo "Generating new API key..."
        API_KEY=$(openssl rand -hex 32)
        echo ""
        echo -e "${GREEN}Your new API key:${NC}"
        echo -e "${YELLOW}$API_KEY${NC}"
        echo ""
        echo "Save this key securely!"
        echo ""
        echo "To use this key, you'll need to add it to the database:"
        echo "See docs/SETUP_GUIDE.md for instructions"
        ;;

    4)
        echo "Exiting..."
        exit 0
        ;;

    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo "Next Steps"
echo "================================================"
echo ""
echo "1. Configure AWS credentials in .env file"
echo "2. Set up WhatsApp Business API (optional)"
echo "3. Configure email domain in AWS SES"
echo "4. Test the API with: curl http://localhost:3000/api/v1/health"
echo ""
echo "For detailed setup instructions, see:"
echo "  - README.md"
echo "  - docs/SETUP_GUIDE.md"
echo ""
echo "Example API usage: examples/nodejs-client.js"
echo ""
