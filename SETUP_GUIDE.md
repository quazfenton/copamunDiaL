# CopaMundial - Setup Guide

Complete guide for setting up and running the CopaMundial sports management platform.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **Redis** 6+ ([Download](https://redis.io/download)) (optional for development, required for production)
- **Git** ([Download](https://git-scm.com/))

## Quick Start (Development)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd copamundial
```

### 2. Install Dependencies

```bash
# Install main dependencies
npm install

# Install MCP server dependencies
cd mcp-server
npm install
cd ..
```

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
copy .env.example .env.local
```

Edit `.env.local` and add your API keys. **Minimum required for development:**

```env
# Required
DATABASE_URL=postgresql://postgres:password@localhost:5432/copamundial
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-min-32-characters-long

# Optional (for full features)
GOOGLE_MAPS_API_KEY=your_google_maps_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
SENDGRID_API_KEY=SG.your_sendgrid_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
```

**Generate NEXTAUTH_SECRET:**
```bash
# Windows (PowerShell)
[Convert]::ToBase64String((New-Object Byte[] 32))

# Linux/Mac
openssl rand -base64 32
```

### 4. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Or run migrations (production)
npx prisma migrate dev
```

### 5. Start Redis (Optional but Recommended)

```bash
# Windows (if installed as service)
redis-server

# Linux/Mac
redis-server
```

### 6. Start Development Server

```bash
# Start Next.js app
npm run dev

# In a separate terminal, start MCP server (optional)
npm run dev:mcp
```

Visit [http://localhost:3000](http://localhost:3000)

## Production Setup

### 1. Environment Configuration

Set all required environment variables for production:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-host:5432/copamundial
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-production-secret
REDIS_URL=redis://prod-redis-host:6379
SOCKET_SERVER_URL=https://socket.yourdomain.com
```

### 2. Build Application

```bash
# Build Next.js app
npm run build

# Build MCP server
npm run build:mcp
```

### 3. Database Migration

```bash
# Run production migrations
npx prisma migrate deploy
```

### 4. Start Production Services

```bash
# Start Next.js app
npm start

# Start Socket.IO server (separate process)
node server/socket-server.js

# Start MCP server (optional)
cd mcp-server && node dist/index.js
```

### 5. Docker Deployment (Recommended)

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f
```

## API Keys Setup

### Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Geocoding API
   - Distance Matrix API
   - Places API
   - Static Maps API
4. Create credentials (API Key)
5. Add to `.env.local`:
   ```env
   GOOGLE_MAPS_API_KEY=your_key_here
   ```

### Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Developers → API Keys
3. Copy the keys:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. For webhooks:
   - Go to Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/payments/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the signing secret:
     ```env
     STRIPE_WEBHOOK_SECRET=whsec_...
     ```

### SendGrid

1. Go to [SendGrid](https://sendgrid.com/)
2. Create account and verify email
3. Navigate to Settings → API Keys
4. Create API Key with "Full Access"
5. Add to `.env.local`:
   ```env
   SENDGRID_API_KEY=SG....
   SENDGRID_FROM_EMAIL=verified@yourdomain.com
   ```

### Cloudinary

1. Go to [Cloudinary](https://cloudinary.com/)
2. Create account
3. Find credentials in Dashboard:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

## Database Setup

### Local PostgreSQL

1. Install PostgreSQL
2. Create database:
   ```sql
   CREATE DATABASE copamundial;
   CREATE USER copamundial WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE copamundial TO copamundial;
   ```
3. Update `.env.local`:
   ```env
   DATABASE_URL=postgresql://copamundial:your_password@localhost:5432/copamundial
   ```

### Managed Database (Production)

**Options:**
- [Supabase](https://supabase.com/) - Free tier available
- [Railway](https://railway.app/) - Easy deployment
- [AWS RDS](https://aws.amazon.com/rds/) - Enterprise grade
- [DigitalOcean Managed Database](https://www.digitalocean.com/products/managed-databases/)

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test files
npm run test:unit
```

### Type Checking

```bash
# Run TypeScript type check
npm run typecheck
```

### Linting

```bash
# Run ESLint
npm run lint
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
# Windows
pg_isready

# Linux/Mac
pg_isready -h localhost
```

### Port Already in Use

```bash
# Find process using port 3000
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Kill the process
# Windows
taskkill /PID <PID> /F

# Linux/Mac
kill -9 <PID>
```

### Prisma Client Errors

```bash
# Regenerate Prisma client
npx prisma generate
```

### Module Not Found

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

## Performance Optimization

### Database Indexing

The schema includes indexes on frequently queried fields:
- `User.location`
- `Team.name`, `Team.location`, `Team.rating`
- `MatchRequest.fromTeamId`, `MatchRequest.toTeamId`, `MatchRequest.status`

### Caching Strategy

1. **Redis Cache** - Enable for:
   - Rate limiting (production)
   - Socket.IO adapter
   - Session storage

2. **Query Optimization**
   - Use `select` to limit returned fields
   - Use `include` judiciously
   - Add pagination with `take` and `skip`

### Image Optimization

- Use Cloudinary for automatic optimization
- Enable responsive images with `srcset`
- Lazy load images below the fold

## Security Checklist

- [ ] Set strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable database SSL
- [ ] Use strong passwords for database
- [ ] Regular security updates
- [ ] Monitor for suspicious activity

## Monitoring

### Health Checks

```bash
# App health
curl http://localhost:3000/api/health

# Socket server health
curl http://localhost:3001/health
```

### Logging

Logs are written to console. In production, consider:
- [Winston](https://www.npmjs.com/package/winston) for file logging
- [Datadog](https://www.datadoghq.com/) for centralized logging
- [Sentry](https://sentry.io/) for error tracking

### Metrics to Monitor

- API response times
- Database query performance
- Socket.IO connection count
- Rate limit hits
- Error rates
- Memory usage

## Backup and Recovery

### Database Backup

```bash
# PostgreSQL backup
pg_dump -U copamundial copamundial > backup.sql

# Restore
psql -U copamundial copamundial < backup.sql
```

### Automated Backups

Set up automated daily backups:
- Use cloud provider's automated backup
- Or use `pg_dump` in a cron job

## Deployment Platforms

### Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```bash
# Build image
docker build -t copamundial .

# Run container
docker run -p 3000:3000 --env-file .env.local copamundial
```

### Kubernetes

See `k8s/` directory for manifests:
```bash
kubectl apply -f k8s/
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Socket.IO Documentation](https://socket.io/docs/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol)

## Support

For issues or questions:
1. Check this documentation
2. Review existing GitHub issues
3. Create a new issue with detailed information
4. Include error messages and steps to reproduce

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Last Updated:** March 3, 2026  
**Version:** 1.0.0
