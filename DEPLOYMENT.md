# CopaMundial Deployment Guide

Complete deployment documentation for the Sports Management Platform.

## 📁 Deployment Files Created

### Docker & Docker Compose
- `Dockerfile` - Multi-stage build for Next.js app
- `Dockerfile.socket` - Standalone Socket.IO server
- `docker-compose.yml` - Local development stack
- `docker-compose.prod.yml` - Production stack with Nginx
- `.env.example` - Environment variable template

### Kubernetes
- `k8s/namespace.yaml` - Kubernetes namespace
- `k8s/configmap.yaml` - Environment configuration
- `k8s/postgres.yaml` - PostgreSQL StatefulSet
- `k8s/redis.yaml` - Redis Deployment
- `k8s/app-deployment.yaml` - Next.js app Deployment + Ingress
- `k8s/socket-deployment.yaml` - Socket.IO server Deployment + Ingress

### Nginx Configuration
- `nginx/nginx.conf` - Reverse proxy with rate limiting

### CI/CD
- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `scripts/deploy.sh` - Deployment automation script

### Code Fixes
- `server/socket-server.js` - Standalone Socket.IO server
- `hooks/use-socket-client.ts` - Updated React hook
- `next.config.mjs` - Standalone output + security headers
- `app/api/health/route.ts` - Health check endpoint

## 🚀 Quick Start

### 1. Local Development (Docker)

```bash
cd /home/workspace/code/copamundial

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Deploy locally
./scripts/deploy.sh local
```

Access points:
- App: http://localhost:3000
- Socket Server: http://localhost:3001
- Health: http://localhost:3000/api/health

### 2. Production (Docker Compose)

```bash
# Set up environment
export DB_USER=copamundial
export DB_PASSWORD=your-secure-password
export DB_NAME=copamundial
export NEXTAUTH_SECRET=your-secret-key-min-32-chars
export NEXTAUTH_URL=https://yourdomain.com
export GOOGLE_CLIENT_ID=your-google-client-id
export GOOGLE_CLIENT_SECRET=your-google-client-secret

# Deploy
./scripts/deploy.sh production
```

### 3. Production (Kubernetes)

```bash
# Create namespace and configs
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/socket-deployment.yaml

# Update image (after GitHub Actions builds)
kubectl set image deployment/copamundial-app app=ghcr.io/yourusername/copamundial:latest-app -n copamundial
kubectl set image deployment/copamundial-socket socket-server=ghcr.io/yourusername/copamundial:latest-socket -n copamundial
```

## 🔧 Critical Fix: Socket.IO

### Problem
The original implementation used Socket.IO within Next.js API routes:
- Socket instances don't persist across serverless function invocations
- Real-time features break in production/serverless environments

### Solution
Created a **standalone Socket.IO server** (`server/socket-server.js`):
- Runs as a separate service (port 3001)
- Uses Redis adapter for horizontal scaling
- Handles all real-time features:
  - Team chat/messages
  - User presence/typing indicators
  - Formation updates
  - Match score updates
  - Notifications

### Updated Client Hook
Replace old socket hooks with new `useSocket` and `useTeamSocket` from `hooks/use-socket-client.ts`:

```typescript
import { useSocket, useTeamSocket } from '@/hooks/use-socket-client';

// Basic usage
const { socket, isConnected, joinTeam, sendTeamMessage } = useSocket({
  userId: currentUser.id,
  userName: currentUser.name,
});

// Team-specific usage
const { messages, members, typingUsers, sendMessage } = useTeamSocket(
  teamId,
  currentUser.id,
  currentUser.name
);
```

## 📊 Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Nginx Proxy   │────▶│  Next.js App    │────▶│   PostgreSQL  │
│   (80/443)      │     │   (port 3000)   │     │   (port 5432)   │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         │              ┌─────────────────┐     ┌─────────────────┐
         └─────────────▶│ Socket.IO Server│────▶│     Redis      │
                        │   (port 3001)   │     │   (port 6379)  │
                        └─────────────────┘     └─────────────────┘
```

## 🔐 Environment Variables

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `DB_USER` | PostgreSQL username | `copamundial` |
| `DB_PASSWORD` | PostgreSQL password | `secure-password` |
| `DB_NAME` | PostgreSQL database | `copamundial` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | `min-32-char-secret` |
| `NEXTAUTH_URL` | App URL | `https://example.com` |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | - |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `SOCKET_SERVER_URL` | Socket server URL | `http://localhost:3001` |

## 🧪 Testing the Deployment

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test socket server health
curl http://localhost:3001/health

# Check Docker logs
docker-compose logs -f app
docker-compose logs -f socket-server

# Check Kubernetes status
kubectl get pods -n copamundial
kubectl logs -f deployment/copamundial-app -n copamundial
```

## 📦 Production Checklist

- [ ] Update `.env` with production values
- [ ] Configure Google OAuth credentials
- [ ] Set up SSL certificates for Nginx
- [ ] Configure DNS (A records for domain)
- [ ] Set up database backups
- [ ] Enable monitoring/logging
- [ ] Configure CI/CD secrets (KUBE_CONFIG, SSH keys)
- [ ] Set up Redis persistence
- [ ] Test Socket.IO functionality
- [ ] Run load tests

## 🔄 CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/deploy.yml`):

1. **Test**: Runs linting and type checking
2. **Build**: Builds and pushes Docker images to GHCR
3. **Deploy**: Deploys to Kubernetes or via SSH (configure as needed)

Configure secrets in GitHub:
- `KUBE_CONFIG` - Base64-encoded kubeconfig (for K8s deployment)
- `SSH_HOST`, `SSH_USER`, `SSH_KEY` - For SSH deployment

## 🆘 Troubleshooting

### Socket.IO Connection Issues
```bash
# Check if socket server is running
curl http://localhost:3001/health

# Check Redis connection
docker-compose exec redis redis-cli ping

# View socket server logs
docker-compose logs -f socket-server
```

### Database Connection Issues
```bash
# Check PostgreSQL
docker-compose exec postgres pg_isready -U copamundial

# Run migrations manually
npx prisma migrate deploy
```

### Container Issues
```bash
# Rebuild all containers
docker-compose down -v
docker-compose up --build

# Check resource usage
docker stats
```

## 📞 Support

For deployment issues:
1. Check container logs: `docker-compose logs <service>`
2. Verify environment variables: `docker-compose config`
3. Test health endpoints
4. Review Kubernetes events: `kubectl get events -n copamundial`
