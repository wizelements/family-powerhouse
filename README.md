# Family Powerhouse

[![CI](https://github.com/wizelements/family-powerhouse/actions/workflows/ci.yml/badge.svg)](https://github.com/wizelements/family-powerhouse/actions/workflows/ci.yml)
[![Deploy Checks](https://github.com/wizelements/family-powerhouse/actions/workflows/deploy-checks.yml/badge.svg)](https://github.com/wizelements/family-powerhouse/actions/workflows/deploy-checks.yml)

A production-grade, multi-tenant web application for families to stay connected, pool money for shared goals, track budgets, plan trips, and build entrepreneurial wealth systems together.

## Features

- 🏠 **Family Accounts** - Multi-tenant with roles (Owner, Treasurer, Planner, Member, Youth, Guest)
- 💬 **Live Chat** - Real-time messaging with channels, mentions, reactions
- 💰 **Money Pooling** - Create pools for trips, emergencies, ventures with approval workflows
- 📊 **Budget Tracking** - Household and personal budgets with categories and alerts
- ✈️ **Trip Planning** - Collaborative itineraries, voting, pool integration
- 🚀 **Ventures** - Track family business ventures with milestones and financials
- 🎯 **Accountability** - Habit tracking and family scoreboards

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon) + Prisma
- **Auth:** NextAuth.js v5
- **Realtime:** Pusher Channels
- **Payments:** Stripe
- **Storage:** Cloudflare R2
- **Deployment:** Vercel

## Quick Start

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/family-powerhouse.git
cd family-powerhouse
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
pnpm db:push

# Start development
pnpm dev
```

## Required Environment Variables

Copy `.env.example` to `.env.local` and configure the following:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `NEXTAUTH_URL` | Your app URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Auth secret (generate with `openssl rand -base64 32`) | Random 32-byte base64 string |
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` |

### Optional (Recommended)

| Variable | Description |
|----------|-------------|
| `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` | Real-time chat |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher client config |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Cloudflare R2 file storage |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Analytics |
| `NEXT_PUBLIC_APP_URL` | Public app URL |

### Validate Environment

Run the env check script before building:

```bash
node scripts/check-env.mjs
```

## Scripts

```bash
pnpm dev           # Start development server
pnpm build         # Build for production
pnpm start         # Start production server
pnpm lint          # Run ESLint
pnpm typecheck     # Run TypeScript check
pnpm test          # Run tests
pnpm test:e2e      # Run E2E tests
pnpm db:push       # Push schema to database
pnpm db:seed       # Seed database with test data
pnpm db:studio     # Open Prisma Studio
```

## Project Structure

```
├── docs/               # Documentation
│   ├── TRUTH.md       # Single source of truth
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   └── RUNBOOK.md
├── prisma/
│   └── schema.prisma  # Database schema
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # React components
│   ├── lib/           # Utilities and configs
│   ├── server/        # Server actions and services
│   └── types/         # TypeScript types
├── tests/             # Unit and integration tests
├── e2e/               # Playwright E2E tests
└── scripts/           # Build and seed scripts
```

## Deployment

See [docs/RUNBOOK.md](docs/RUNBOOK.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

## Documentation

- [TRUTH.md](docs/TRUTH.md) - Single source of truth, phase tracking
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
- [SECURITY.md](docs/SECURITY.md) - Security implementation
- [RUNBOOK.md](docs/RUNBOOK.md) - Deployment and operations guide
- [WORKFLOW_CHECKS.md](docs/WORKFLOW_CHECKS.md) - CI/CD pipeline and automated checks

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests and linting
4. Submit a pull request

## License

MIT

---

**Disclaimer:** This is a budgeting and planning tool. We do not provide financial, investment, or legal advice.
