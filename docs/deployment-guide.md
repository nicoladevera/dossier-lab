# Deployment Guide - Dossier Lab

This guide covers deploying Dossier Lab to production environments. Choose the deployment option that best fits your needs.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
  - [Option 1: Vercel + Supabase (Recommended)](#option-1-vercel--supabase-recommended)
  - [Option 2: Railway](#option-2-railway)
  - [Option 3: Render](#option-3-render)
  - [Option 4: Docker Self-Hosted](#option-4-docker-self-hosted)
- [Post-Deployment Steps](#post-deployment-steps)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure your app meets these requirements:

- **Runtime:** Node.js 20+
- **Database:** PostgreSQL 17+ with **pgvector extension**
- **Build Output:** Next.js production build
- **Environment Variables:** All required secrets configured

### Critical Database Requirement

⚠️ **Your database MUST have the pgvector extension enabled.** This is non-negotiable for the vector search functionality.

---

## Deployment Options

### Option 1: Vercel + Supabase (Recommended)

**Best for:** Quick deployment, minimal configuration, automatic scaling

**Pros:**
- Easiest setup for Next.js apps
- Automatic deployments on git push
- Excellent performance and CDN
- Free tier available

**Cons:**
- Separate database service required
- Cold starts on free tier

#### Step 1: Set Up PostgreSQL Database (Supabase)

1. Create a [Supabase](https://supabase.com) account and new project
2. Navigate to **Project Settings → Database**
3. Copy the **Connection Pooler** string (Session mode for Prisma)
4. Verify pgvector is enabled:
   - Go to **SQL Editor**
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`
   - Should return success or "already exists"

**Database URL format:**
```
postgresql://postgres.xxx:[PASSWORD]@xxx.pooler.supabase.com:6543/postgres
```

#### Step 2: Deploy to Vercel

**Option A: Via Vercel Dashboard (Easiest)**

1. Go to [vercel.com](https://vercel.com)
2. Click **New Project**
3. Import your GitHub repository
4. Configure environment variables (see [Environment Variables](#environment-variables))
5. Click **Deploy**

**Option B: Via Vercel CLI**

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login and link project:
   ```bash
   vercel login
   vercel link
   ```

3. Add environment variables:
   ```bash
   vercel env add DATABASE_URL production
   vercel env add NEXTAUTH_SECRET production
   vercel env add NEXTAUTH_URL production
   vercel env add ENCRYPTION_KEY production
   ```

4. Deploy:
   ```bash
   vercel --prod
   ```

#### Step 3: Run Database Migrations

After first deployment:

```bash
# Connect to your production database and run migrations
DATABASE_URL="your-supabase-connection-string" npx prisma migrate deploy
```

**Alternative:** Set up a migration script in your repository:

```json
// package.json
{
  "scripts": {
    "migrate:prod": "npx prisma migrate deploy"
  }
}
```

Then run:
```bash
DATABASE_URL="your-supabase-connection-string" npm run migrate:prod
```

---

### Option 2: Railway

**Best for:** All-in-one platform with integrated database and app hosting

**Pros:**
- Database and app in one platform
- Simple pricing
- Automatic HTTPS
- Easy rollbacks

**Cons:**
- pgvector requires manual setup
- Limited free tier

#### Step 1: Create Railway Project

1. Sign up at [railway.app](https://railway.app)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Connect your repository

#### Step 2: Add PostgreSQL Service

1. In your Railway project, click **New Service**
2. Select **Database → PostgreSQL**
3. Railway will provision a database and set `DATABASE_URL` automatically

#### Step 3: Enable pgvector Extension

Railway's PostgreSQL doesn't include pgvector by default:

1. Click on your PostgreSQL service
2. Go to **Connect** tab and copy the connection URL
3. Connect via psql locally:
   ```bash
   psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway"
   ```
4. Enable extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   \dx  -- Verify it's installed
   \q
   ```

#### Step 4: Configure Environment Variables

In your app service settings, add:

- `DATABASE_URL` (should be auto-populated, verify it's correct)
- `NEXTAUTH_SECRET` → Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` → Your Railway app URL (e.g., `https://dossier-lab-production.up.railway.app`)
- `ENCRYPTION_KEY` → Generate with `openssl rand -hex 16`
- `NODE_ENV` → `production`

#### Step 5: Configure Build Settings

Railway auto-detects Next.js, but verify:

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`

#### Step 6: Deploy and Migrate

1. Railway auto-deploys on git push to main
2. After first deployment, run migrations:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login and link project
   railway login
   railway link

   # Run migrations
   railway run npx prisma migrate deploy
   ```

---

### Option 3: Render

**Best for:** Predictable pricing, good performance, managed services

**Pros:**
- Transparent pricing
- Good free tier for databases
- Auto-scaling available
- Built-in cron jobs

**Cons:**
- Slower cold starts than Vercel
- pgvector requires manual setup

#### Step 1: Create PostgreSQL Database

1. Sign up at [render.com](https://render.com)
2. Click **New → PostgreSQL**
3. Configure:
   - **Name:** `dossier-lab-db`
   - **Database:** `dossier_lab`
   - **User:** `dossier_lab_user`
   - **Region:** Choose closest to your users
   - **Plan:** Choose based on your needs (Free tier available)
4. Click **Create Database**

#### Step 2: Enable pgvector Extension

1. After database creation, click **Connect → External Connection**
2. Copy the **External Database URL**
3. Connect via psql:
   ```bash
   psql "your-render-external-database-url"
   ```
4. Enable extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   \dx  -- Verify installation
   \q
   ```

#### Step 3: Create Web Service

1. Click **New → Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `dossier-lab`
   - **Region:** Same as database
   - **Branch:** `main`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm run start`
   - **Environment:** `Node`
   - **Plan:** Choose based on your needs

#### Step 4: Set Environment Variables

In your web service settings, add environment variables:

- `DATABASE_URL` → Your database's **Internal Database URL** (found in database settings)
- `NEXTAUTH_SECRET` → `openssl rand -base64 32`
- `NEXTAUTH_URL` → Your Render app URL (e.g., `https://dossier-lab.onrender.com`)
- `ENCRYPTION_KEY` → `openssl rand -hex 16`
- `NODE_ENV` → `production`

#### Step 5: Deploy and Migrate

1. Click **Create Web Service** - Render will auto-deploy
2. After successful deployment, run migrations from your local machine:
   ```bash
   DATABASE_URL="your-render-internal-database-url" npx prisma migrate deploy
   ```

**Tip:** For future migrations, you can set up a Render **Shell** and run migrations directly on the server.

---

### Option 4: Docker Self-Hosted

**Best for:** Full control, on-premise deployment, custom infrastructure

**Pros:**
- Complete control over infrastructure
- Can run anywhere (AWS EC2, DigitalOcean, on-prem)
- No vendor lock-in
- Predictable costs

**Cons:**
- More complex setup
- Manual scaling
- You manage updates and security

#### Step 1: Create Dockerfile

Create `Dockerfile` in your project root:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (requires standalone output mode)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### Step 2: Update Next.js Config

Edit `next.config.ts` to enable standalone output:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Required for Docker deployment
};

export default nextConfig;
```

#### Step 3: Create .dockerignore

Create `.dockerignore`:

```
.git
.github
.next
node_modules
.env.local
.env*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
README.md
```

#### Step 4: Create docker-compose.yml

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg17
    container_name: dossier-lab-db
    environment:
      POSTGRES_DB: dossier_lab
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-change_me_in_production}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    container_name: dossier-lab-app
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-change_me_in_production}@postgres:5432/dossier_lab
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost:3000}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
```

#### Step 5: Create Environment File

Create `.env.production`:

```bash
# Database password
DB_PASSWORD=your_secure_password_here

# NextAuth configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-domain.com

# Encryption key for API keys
ENCRYPTION_KEY=your_32_char_hex_key_here
```

**Generate secrets:**
```bash
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -hex 16     # For ENCRYPTION_KEY
```

#### Step 6: Build and Deploy

```bash
# Load environment variables
export $(cat .env.production | xargs)

# Build and start services
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f app

# Run database migrations
docker-compose exec app npx prisma migrate deploy
```

#### Step 7: Set Up Reverse Proxy (Production)

For production, use nginx or Caddy as a reverse proxy:

**Example Caddyfile:**
```caddy
your-domain.com {
    reverse_proxy localhost:3000
}
```

**Example nginx config:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Post-Deployment Steps

After deploying to any platform, complete these steps:

### 1. Verify Database Migrations

```bash
# Run this against your production database
DATABASE_URL="your-production-db-url" npx prisma migrate deploy
```

**Verify migrations applied:**
```bash
DATABASE_URL="your-production-db-url" npx prisma migrate status
```

### 2. Create First User Account

1. Visit your deployed URL
2. Click **Sign Up**
3. Create your account
4. Verify login works

### 3. Configure API Keys

Each user must add their API keys in the Settings page:

1. Log in to your account
2. Navigate to **Settings**
3. Add OpenAI API key (required for embeddings and search)
4. Add Anthropic API key (optional, for Claude models)
5. Select default LLM provider
6. Click **Save**

### 4. Test Core Functionality

Verify all features work:

- [ ] **Upload a document** (URL, PDF, or text)
- [ ] **View document** in Knowledge Base
- [ ] **Perform a search** (should return relevant results)
- [ ] **Ask a question** in Q&A interface
- [ ] **Check citations** in answer
- [ ] **View evaluation metrics** in dashboard

### 5. Monitor Performance

Check these on your hosting platform:

- Response times (should be <2s for most queries)
- Error rates (should be <1%)
- Database connection pool usage
- Memory usage (Node.js app typically uses 200-500MB)

### 6. Set Up Monitoring (Optional)

Consider adding:

- **Error tracking:** Sentry, Rollbar
- **Analytics:** Vercel Analytics, Plausible
- **Uptime monitoring:** UptimeRobot, Pingdom
- **Log aggregation:** Datadog, LogRocket

---

## Environment Variables

### Required Variables

| Variable | Description | How to Generate | Example |
|----------|-------------|----------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | From your database provider | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js session encryption | `openssl rand -base64 32` | `abc123...xyz` (long random string) |
| `NEXTAUTH_URL` | Full URL of your deployed app | Your production domain | `https://dossier-lab.vercel.app` |
| `ENCRYPTION_KEY` | Key for encrypting user API keys | `openssl rand -hex 16` | `a1b2c3d4e5f6...` (32 hex chars) |

### Optional Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `NODE_ENV` | Node environment | `production` | Set automatically on most platforms |
| `PORT` | Port for the app to listen on | `3000` | Set automatically on most platforms |

### Important Notes

⚠️ **ENCRYPTION_KEY Security:**
- Must be exactly 32 hexadecimal characters (16 bytes)
- **Never change this in production** - users will lose access to their saved API keys
- If you must rotate it, notify users to re-enter their API keys

⚠️ **NEXTAUTH_URL:**
- Must match your production domain exactly (including protocol)
- Include port if non-standard: `https://example.com:8080`
- No trailing slash

⚠️ **DATABASE_URL Format:**
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?schema=public
```

For connection pooling (Supabase, some managed databases):
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?pgbouncer=true
```

---

## Troubleshooting

### Database Issues

#### Error: "pgvector extension not found"

**Symptom:**
```
Error: Extension "vector" not found
```

**Solution:**
1. Connect to your database via psql
2. Run: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Verify: `\dx` should list "vector" extension

**On Supabase:**
- Usually pre-installed, verify in SQL Editor

**On Railway/Render:**
- Must be manually enabled (see platform-specific steps above)

#### Error: "Prisma migrate failed"

**Symptom:**
```
Error: P3009: migrate found failed migrations
```

**Solutions:**

1. **Check database permissions:**
   ```bash
   # Verify your DATABASE_URL has CREATE/ALTER permissions
   ```

2. **Use migrate deploy for production:**
   ```bash
   # NOT migrate dev (which is for development only)
   npx prisma migrate deploy
   ```

3. **If you need to reset (⚠️ destroys data):**
   ```bash
   npx prisma migrate reset --force
   ```

#### Error: "Connection pool exhausted"

**Symptom:**
```
Error: Can't reach database server
```

**Solutions:**

1. **Check connection limits:**
   - Supabase free tier: 60 connections
   - Most managed databases: 20-100 connections

2. **Use connection pooling:**
   ```typescript
   // prisma.config.ts
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
       },
     },
   });
   ```

3. **For Supabase, use the pooler URL** (port 6543, not 5432)

### Authentication Issues

#### Error: "NextAuth session not working"

**Symptom:**
- Can't stay logged in
- Redirected to login after successful authentication

**Solutions:**

1. **Verify NEXTAUTH_URL exactly matches your domain:**
   ```bash
   # Correct
   NEXTAUTH_URL=https://dossier-lab.vercel.app

   # Wrong (trailing slash)
   NEXTAUTH_URL=https://dossier-lab.vercel.app/
   ```

2. **Check NEXTAUTH_SECRET is set and non-empty:**
   ```bash
   # Generate a new one if needed
   openssl rand -base64 32
   ```

3. **Verify cookies are not blocked:**
   - Check browser console for SameSite warnings
   - Ensure your domain supports HTTPS in production

#### Error: "API key decryption failed"

**Symptom:**
```
Error: Invalid initialization vector
```

**Solutions:**

1. **Verify ENCRYPTION_KEY is exactly 32 hex characters:**
   ```bash
   # Check length
   echo -n "your-key-here" | wc -c  # Should output 32

   # Generate a valid one
   openssl rand -hex 16  # Outputs 32 characters
   ```

2. **If you changed ENCRYPTION_KEY:**
   - Users must re-enter their API keys in Settings
   - Old encrypted keys cannot be decrypted with new key

### Build and Deployment Issues

#### Error: "Module not found" in production

**Symptom:**
```
Error: Cannot find module 'prisma/client'
```

**Solutions:**

1. **Ensure postinstall script runs:**
   ```json
   // package.json
   {
     "scripts": {
       "postinstall": "prisma generate"
     }
   }
   ```

2. **For Docker, generate Prisma client in Dockerfile:**
   ```dockerfile
   RUN npx prisma generate
   ```

#### Error: Next.js build fails

**Symptom:**
```
Error: Build failed with exit code 1
```

**Solutions:**

1. **Check for TypeScript errors:**
   ```bash
   npm run build
   ```

2. **Verify all dependencies are installed:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check environment variables are set during build:**
   - Some platforms require env vars at build time
   - Set `DATABASE_URL` in build environment

#### Error: "Standalone output not found" (Docker)

**Symptom:**
```
Error: Cannot find ./server.js
```

**Solution:**

Ensure `next.config.ts` has standalone output:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
};
```

Then rebuild:
```bash
docker-compose build --no-cache
```

### Performance Issues

#### Slow search/Q&A responses

**Symptoms:**
- Queries take >10 seconds
- Timeout errors

**Solutions:**

1. **Check database indexes:**
   ```sql
   -- Verify indexes exist
   \di

   -- Should see indexes on:
   -- - chunks(user_id)
   -- - chunks(source_id)
   -- - sources(user_id)
   ```

2. **Check if embeddings are being generated:**
   - Log into Settings
   - Verify OpenAI API key is saved
   - Re-upload a document and check if embeddings are created

3. **Monitor database performance:**
   - Check query execution time in database logs
   - Consider upgrading database plan if consistently slow

#### High costs

**Symptoms:**
- Unexpected API bills from OpenAI/Anthropic

**Solutions:**

1. **Set daily cost thresholds:**
   - Go to Settings → Daily Cost Threshold
   - Set a reasonable limit (default: $2/day)

2. **Use cheaper models:**
   - OpenAI: Switch to `gpt-4o-mini` for Q&A
   - Consider using smaller embedding models

3. **Optimize chunk size:**
   - Current: 500 characters with 50 overlap
   - Larger chunks = fewer API calls but less precise retrieval

---

## Security Checklist

Before going live, verify:

- [ ] All environment variables are set and secured
- [ ] NEXTAUTH_SECRET is strong and random (32+ characters)
- [ ] ENCRYPTION_KEY is exactly 32 hex characters
- [ ] Database credentials are strong passwords
- [ ] Database is not publicly accessible (except via app)
- [ ] HTTPS is enabled for production domain
- [ ] API keys are stored encrypted in database (not in env vars)
- [ ] User sessions expire appropriately (default: 30 days)
- [ ] CORS is properly configured (Next.js handles this by default)
- [ ] Rate limiting is considered for API routes (not included by default)

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check API usage and costs
- Verify uptime

**Weekly:**
- Review evaluation metrics
- Check database size and growth
- Update dependencies (security patches)

**Monthly:**
- Review and optimize database performance
- Audit user accounts (if multi-tenant)
- Update Next.js and Prisma to latest stable versions

### Database Backups

**Automated (Recommended):**
- Supabase: Built-in daily backups
- Railway: Point-in-time recovery available
- Render: Automated backups on paid plans

**Manual Backup:**
```bash
# Export entire database
pg_dump "your-database-url" > backup-$(date +%Y%m%d).sql

# Restore from backup
psql "your-database-url" < backup-20260215.sql
```

### Updating the Application

1. **Test changes locally:**
   ```bash
   npm run build
   npm run start
   ```

2. **Create a migration (if schema changed):**
   ```bash
   npx prisma migrate dev --name describe_your_changes
   ```

3. **Deploy to production:**
   ```bash
   git push origin main  # Auto-deploys on Vercel/Railway/Render
   ```

4. **Run migrations:**
   ```bash
   DATABASE_URL="production-url" npx prisma migrate deploy
   ```

---

## Cost Estimates

### Vercel + Supabase
- **Vercel Pro:** $20/month (includes team features, analytics)
- **Supabase Pro:** $25/month (8GB database, 50GB bandwidth)
- **Total:** ~$45/month + API usage

### Railway
- **Database:** $5-20/month (based on usage)
- **App:** $5-20/month (based on usage)
- **Total:** ~$10-40/month + API usage

### Render
- **Database:** Free tier available, $7/month for starter
- **Web Service:** $7/month for starter
- **Total:** ~$14/month (or free for testing) + API usage

### Self-Hosted (DigitalOcean)
- **Droplet:** $12/month (2GB RAM, 50GB SSD)
- **Database:** $15/month (managed PostgreSQL)
- **Total:** ~$27/month + API usage

**API Usage Costs (approximate):**
- Embeddings: $0.0001 per 1,000 tokens (~$0.10 per 1,000 documents)
- Q&A with GPT-4o-mini: ~$0.01 per query
- Evaluation scoring: ~$0.005 per query

---

## Support and Resources

- **Next.js Documentation:** https://nextjs.org/docs
- **Prisma Documentation:** https://www.prisma.io/docs
- **Vercel Documentation:** https://vercel.com/docs
- **Railway Documentation:** https://docs.railway.app
- **Render Documentation:** https://render.com/docs
- **pgvector GitHub:** https://github.com/pgvector/pgvector

For project-specific issues, check the main [README.md](../README.md) or project documentation.
