# Family Powerhouse - Runbook

## Quick Reference

### Development

```bash
# Install dependencies
pnpm install

# Set up database
cp .env.example .env.local
# Edit .env.local with your credentials
pnpm db:push

# Seed database (optional, for testing)
pnpm db:seed

# Start development server
pnpm dev
```

### Production Deployment

```bash
# Build
pnpm build

# Start
pnpm start
```

---

## Environment Variables

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `NEXTAUTH_URL` | Production URL | `https://app.yourfamily.com` |
| `NEXTAUTH_SECRET` | Auth encryption key | `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing | `whsec_...` |

### Optional (Recommended)

| Variable | Description |
|----------|-------------|
| `PUSHER_*` | Real-time chat |
| `R2_*` | File storage |
| `UPSTASH_*` | Rate limiting |
| `NEXT_PUBLIC_POSTHOG_*` | Analytics |

---

## Deployment to Vercel

### 1. Connect Repository

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/family-powerhouse.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Configure environment variables
4. Deploy

### 3. Configure Vercel Settings

**Build Settings:**
- Framework: Next.js
- Build Command: `pnpm build`
- Output Directory: `.next`

**Environment Variables:**
Add all variables from `.env.example` to Vercel settings.

### 4. Set Up Database

1. Create a Neon database at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Add to Vercel environment variables as `DATABASE_URL`
4. Run initial migration:
   ```bash
   npx prisma db push
   ```

### 5. Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Post-Deploy Verification

### Health Check

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok" },
    "stripe": { "status": "ok" },
    "pusher": { "status": "ok" },
    "storage": { "status": "ok" }
  }
}
```

### Smoke Tests

1. **Homepage loads:** Visit `/` - should see landing page
2. **Auth works:** Visit `/login` - should see login form
3. **API responds:** `GET /api/health` returns 200
4. **Database connected:** Health check shows database OK

### Stripe Webhook Test

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Listen to webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

---

## Monitoring

### Vercel Logs

```bash
vercel logs --follow
```

### Error Tracking

Check Vercel dashboard for:
- Function errors
- Build failures
- Edge function timeouts

### Database Monitoring

Neon dashboard provides:
- Query performance
- Connection pooling stats
- Storage usage

---

## Common Issues

### Build Fails: Prisma Client

**Error:** `Cannot find module '.prisma/client'`

**Solution:**
```bash
pnpm prisma generate
```

### Auth Redirect Loop

**Error:** Infinite redirect on login

**Solution:**
1. Check `NEXTAUTH_URL` matches deployment URL
2. Ensure `NEXTAUTH_SECRET` is set

### Stripe Webhook 400

**Error:** Webhook returns 400 Bad Request

**Solution:**
1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Ensure webhook endpoint is public (no auth required)
3. Check Stripe dashboard for specific error

### Database Connection Timeout

**Error:** Database connection timeout on serverless

**Solution:**
1. Use connection pooling (Neon provides this)
2. Add `?connection_limit=1` to `DATABASE_URL` for Edge functions

---

## Rollback Procedure

### Vercel Rollback

1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click (...) → Promote to Production

### Database Rollback

```bash
# Revert last migration
npx prisma migrate reset

# Or restore from backup
# (Neon provides point-in-time recovery)
```

---

## Scheduled Tasks

### Vercel Cron Jobs

Configure in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/reconcile",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Available Cron Endpoints

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/reminders` | Daily 9am | Send contribution reminders |
| `/api/cron/reconcile` | Daily midnight | Reconcile ledger with Stripe |
| `/api/cron/deadlines` | Daily | Check pool deadlines |

---

## Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] NEXTAUTH_SECRET is unique and secure
- [ ] Stripe keys are production keys
- [ ] Database URL uses SSL
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Audit logging active

---

## Support

### Logs Location

- **Vercel:** Dashboard → Functions → Logs
- **Stripe:** Dashboard → Developers → Logs
- **Neon:** Dashboard → Query Insights

### Escalation

1. Check this runbook
2. Review error logs
3. Check GitHub issues
4. Contact support
