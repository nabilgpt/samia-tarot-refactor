# SAMIA TAROT - Deployment & DevOps Documentation

## Overview
This documentation covers the complete deployment and DevOps infrastructure for the SAMIA TAROT platform, including CI/CD pipelines, containerization, cloud infrastructure, monitoring, and production operations.

## Table of Contents
1. [Infrastructure Architecture](#infrastructure-architecture)
2. [CI/CD Pipeline](#cicd-pipeline)
3. [Containerization](#containerization)
4. [Cloud Deployment](#cloud-deployment)
5. [Environment Management](#environment-management)
6. [Monitoring & Logging](#monitoring--logging)
7. [Security & Compliance](#security--compliance)
8. [Backup & Recovery](#backup--recovery)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

## Infrastructure Architecture

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   Web Servers   │────│   API Servers   │
│   (Cloudflare)  │    │   (Frontend)    │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN           │    │   File Storage  │    │   Database      │
│   (Cloudflare)  │    │   (Supabase)    │    │   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: React + Vite (deployed on Vercel)
- **Backend**: Node.js + Express (deployed on Railway/Heroku)
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage + Backblaze B2
- **CDN**: Cloudflare
- **Monitoring**: Sentry, UptimeRobot
- **CI/CD**: GitHub Actions

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: 🚀 SAMIA TAROT CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io

jobs:
  # Quality Checks & Testing
  test:
    name: 🧪 Quality & Testing
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 🔧 Install dependencies
        run: npm ci

      - name: 🔍 Lint code
        run: npm run lint

      - name: 🧪 Run tests
        run: npm run test:coverage

      - name: 📊 Upload coverage
        uses: codecov/codecov-action@v3

  # Build & Deploy
  deploy:
    name: 🚀 Deploy
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: 🏗️ Build application
        run: npm run build

      - name: 🌐 Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
```

### Deployment Stages
1. **Development** → Automatic deployment on feature branches
2. **Staging** → Deployment on `develop` branch
3. **Production** → Deployment on `main` branch with manual approval

### Quality Gates
- ✅ Linting passes
- ✅ Unit tests pass (80% coverage minimum)
- ✅ Integration tests pass
- ✅ Security scans pass
- ✅ Performance benchmarks met

## Containerization

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose (Development)
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:80"
    environment:
      - NODE_ENV=development
    volumes:
      - ./src:/app/src
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./backend/src:/app/src

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## Cloud Deployment

### Vercel Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

### Railway Configuration
```toml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"

[[services]]
name = "backend"
source = "./backend"

[services.variables]
NODE_ENV = "production"
PORT = "5000"
```

### Environment Variables
```bash
# Production Environment
NODE_ENV=production
FRONTEND_URL=https://samia-tarot.com
API_URL=https://api.samia-tarot.com

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_...
SQUARE_ACCESS_TOKEN=sq0atp_...

# External Services
OPENAI_API_KEY=sk-...
AGORA_APP_ID=your_agora_id
```

## Environment Management

### Environment Strategy
- **Development**: Local development with test data
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

### Configuration Management
```javascript
// src/config/environment.js
const environments = {
  development: {
    API_URL: 'http://localhost:5000',
    DATABASE_URL: 'postgresql://localhost:5432/samia_dev',
    STRIPE_KEY: 'pk_test_...',
    DEBUG: true
  },
  staging: {
    API_URL: 'https://staging-api.samia-tarot.com',
    DATABASE_URL: process.env.STAGING_DATABASE_URL,
    STRIPE_KEY: 'pk_test_...',
    DEBUG: true
  },
  production: {
    API_URL: 'https://api.samia-tarot.com',
    DATABASE_URL: process.env.DATABASE_URL,
    STRIPE_KEY: 'pk_live_...',
    DEBUG: false
  }
};

export default environments[process.env.NODE_ENV || 'development'];
```

### Secrets Management
```bash
# Using GitHub Secrets
gh secret set SUPABASE_URL --body "https://your-project.supabase.co"
gh secret set STRIPE_SECRET_KEY --body "sk_live_..."

# Using environment files (development only)
cp .env.example .env.local
# Edit .env.local with your development credentials
```

## Monitoring & Logging

### Application Monitoring
```javascript
// src/services/monitoring.js
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
  ]
});

export const logError = (error, context) => {
  console.error('Error:', error);
  Sentry.captureException(error, { extra: context });
};

export const logPerformance = (name, duration) => {
  Sentry.addBreadcrumb({
    message: `Performance: ${name}`,
    level: 'info',
    data: { duration }
  });
};
```

### Health Checks
```javascript
// backend/routes/health.js
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
    checks: {
      database: 'OK',
      redis: 'OK',
      external_apis: 'OK'
    }
  };

  try {
    // Check database connection
    await supabase.from('profiles').select('count').limit(1);
    
    // Check external APIs
    await fetch('https://api.stripe.com/v1/charges', {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
    });

    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'ERROR';
    healthCheck.checks.database = error.message;
    res.status(503).json(healthCheck);
  }
});
```

### Logging Configuration
```javascript
// backend/middleware/logging.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export const requestLogger = (req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
};
```

## Security & Compliance

### Security Headers
```javascript
// backend/middleware/security.js
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com"]
    }
  }
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### SSL/TLS Configuration
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name samia-tarot.com;
    
    ssl_certificate /etc/ssl/certs/samia-tarot.crt;
    ssl_certificate_key /etc/ssl/private/samia-tarot.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
}
```

## Backup & Recovery

### Database Backup Strategy
```bash
#!/bin/bash
# scripts/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

# Create database backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Encrypt backup
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 --s2k-count 65536 \
    --symmetric --output ${BACKUP_FILE}.gpg $BACKUP_FILE

# Upload to cloud storage
aws s3 cp ${BACKUP_FILE}.gpg s3://samia-tarot-backups/

# Cleanup local files
rm $BACKUP_FILE ${BACKUP_FILE}.gpg

echo "Backup completed: ${BACKUP_FILE}.gpg"
```

### Automated Backup Schedule
```yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Create backup
        run: |
          pg_dump ${{ secrets.DATABASE_URL }} > backup.sql
          
      - name: Upload to S3
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
```

### Disaster Recovery Plan
1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 24 hours
3. **Backup Frequency**: Daily automated backups
4. **Recovery Testing**: Monthly recovery drills

## Performance Optimization

### Frontend Optimization
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['framer-motion', 'lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
```

### CDN Configuration
```javascript
// Cloudflare settings
const cloudflareConfig = {
  caching: {
    browserCacheTtl: 31536000, // 1 year for static assets
    edgeCacheTtl: 7200, // 2 hours for API responses
    cacheLevel: 'aggressive'
  },
  compression: {
    gzip: true,
    brotli: true
  },
  minification: {
    html: true,
    css: true,
    js: true
  }
};
```

### Database Optimization
```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY idx_bookings_user_id ON bookings(user_id);
CREATE INDEX CONCURRENTLY idx_bookings_status ON bookings(status);
CREATE INDEX CONCURRENTLY idx_profiles_role ON profiles(role);

-- Query optimization
EXPLAIN ANALYZE SELECT * FROM bookings 
WHERE user_id = $1 AND status = 'active';
```

## Troubleshooting

### Common Deployment Issues

#### 1. Build Failures
```bash
# Check build logs
npm run build 2>&1 | tee build.log

# Common fixes
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. Environment Variable Issues
```bash
# Verify environment variables
printenv | grep VITE_
printenv | grep NODE_ENV

# Test environment configuration
node -e "console.log(process.env.NODE_ENV)"
```

#### 3. Database Connection Issues
```javascript
// Test database connection
import { supabase } from './lib/supabase.js';

const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};
```

### Monitoring & Alerts
```javascript
// Alert configurations
const alerts = {
  errorRate: {
    threshold: '5%',
    window: '5m',
    action: 'notify-team'
  },
  responseTime: {
    threshold: '2s',
    window: '1m',
    action: 'scale-up'
  },
  uptime: {
    threshold: '99.9%',
    window: '24h',
    action: 'emergency-response'
  }
};
```

### Performance Monitoring
```javascript
// Performance metrics
const metrics = {
  loadTime: 'First Contentful Paint < 2s',
  interactivity: 'Time to Interactive < 5s',
  stability: 'Cumulative Layout Shift < 0.1',
  accessibility: 'Lighthouse Score > 90'
};
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security scans completed
- [ ] Performance benchmarks met
- [ ] Backup created

### Deployment
- [ ] Deploy to staging first
- [ ] Smoke tests passed
- [ ] Database integrity verified
- [ ] External services connected
- [ ] SSL certificates valid
- [ ] CDN configured

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Performance metrics normal
- [ ] User acceptance testing
- [ ] Documentation updated
- [ ] Team notified

## Scripts & Automation

### Deployment Scripts
```json
{
  "scripts": {
    "deploy:staging": "vercel --target staging",
    "deploy:production": "vercel --prod",
    "db:migrate": "supabase db push",
    "db:seed": "node scripts/seed-data.js",
    "health:check": "curl -f $API_URL/health",
    "logs:tail": "vercel logs --follow",
    "backup:create": "bash scripts/backup-database.sh",
    "rollback": "vercel rollback"
  }
}
```

### Monitoring Scripts
```bash
#!/bin/bash
# scripts/health-monitor.sh

API_URL="https://api.samia-tarot.com"
WEBHOOK_URL="https://hooks.slack.com/services/..."

response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)

if [ $response != "200" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 SAMIA TAROT API is down!"}' \
        $WEBHOOK_URL
fi
```

---

**Documentation Status**: ✅ Active  
**Last Updated**: December 2024  
**Maintained By**: SAMIA TAROT DevOps Team  
**Next Review**: Monthly 