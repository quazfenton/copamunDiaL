#!/bin/bash
set -e

# CopaMundial Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environments: local (default), staging, production

ENVIRONMENT=${1:-local}
echo "🚀 Deploying CopaMundial to $ENVIRONMENT environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_warn ".env file not found. Copying from .env.example..."
    cp .env.example .env
    print_error "Please edit .env file with your configuration before deploying."
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Build Docker images
print_info "Building Docker images..."
docker-compose build

# Deploy based on environment
case $ENVIRONMENT in
    local)
        print_info "Starting local development environment..."
        docker-compose up -d postgres redis
        
        # Wait for database to be ready
        print_info "Waiting for database to be ready..."
        sleep 5
        
        # Run migrations
        print_info "Running database migrations..."
        npx prisma migrate deploy
        
        # Start the application
        print_info "Starting application..."
        docker-compose up -d app socket-server
        
        print_info "Local environment ready!"
        print_info "App: http://localhost:3000"
        print_info "Socket Server: http://localhost:3001"
        ;;
    
    staging)
        print_info "Deploying to staging..."
        
        # Tag images for staging
        docker tag ${IMAGE_NAME}:latest ${REGISTRY}/${IMAGE_NAME}:staging-app
        docker tag ${IMAGE_NAME}-socket:latest ${REGISTRY}/${IMAGE_NAME}:staging-socket
        
        # Push images
        docker push ${REGISTRY}/${IMAGE_NAME}:staging-app
        docker push ${REGISTRY}/${IMAGE_NAME}:staging-socket
        
        # Deploy via SSH or Kubernetes
        print_warn "Update this script with your staging deployment commands"
        ;;
    
    production)
        print_info "Deploying to production..."
        
        # Confirm production deployment
        read -p "Are you sure you want to deploy to production? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            print_info "Deployment cancelled."
            exit 0
        fi
        
        # Tag and push production images
        docker tag ${IMAGE_NAME}:latest ${REGISTRY}/${IMAGE_NAME}:latest-app
        docker tag ${IMAGE_NAME}-socket:latest ${REGISTRY}/${IMAGE_NAME}:latest-socket
        
        docker push ${REGISTRY}/${IMAGE_NAME}:latest-app
        docker push ${REGISTRY}/${IMAGE_NAME}:latest-socket
        
        # Deploy with production compose
        docker-compose -f docker-compose.prod.yml pull
        docker-compose -f docker-compose.prod.yml up -d
        
        # Cleanup old images
        docker system prune -f
        
        print_info "Production deployment complete!"
        ;;
    
    *)
        print_error "Unknown environment: $ENVIRONMENT"
        print_info "Usage: ./scripts/deploy.sh [local|staging|production]"
        exit 1
        ;;
esac

print_info "Deployment script completed!"
