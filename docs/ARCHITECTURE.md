# Family Powerhouse - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Next.js App Router                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │ │
│  │  │   RSC    │  │  Server  │  │   API    │  │ Middleware │  │ │
│  │  │  Pages   │  │ Actions  │  │  Routes  │  │  (Auth)    │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
        │                   │                    │
        ▼                   ▼                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐
│   Neon DB    │  │   Pusher     │  │      External Services       │
│  (Postgres)  │  │  (Realtime)  │  │  ┌────────┐  ┌────────────┐  │
│              │  │              │  │  │ Stripe │  │ Cloudflare │  │
│  - Prisma    │  │  - Channels  │  │  │        │  │     R2     │  │
└──────────────┘  └──────────────┘  └──────────────────────────────┘
```

## Multi-Tenant Model

- Family = Tenant
- All tables include `familyId` foreign key
- Middleware resolves tenant from JWT
- Queries scoped by familyId

## Key Modules

### Family & Auth
- Multi-role system: OWNER > TREASURER > PLANNER > MEMBER > YOUTH > GUEST
- Invite flows with expiring tokens
- NextAuth.js with JWT strategy

### Money Pooling (Ledger-First)
- Pools: TRIP, EMERGENCY, VENTURE, CUSTOM
- Internal ledger with idempotency keys
- Stripe Checkout for payments
- Multi-sig approval workflows

### Chat
- Real-time via Pusher
- Channels: general, announcements, trips, ventures
- Mentions, reactions, file attachments

### Budget Tracking
- Household, personal, and pool budgets
- Categories with limits
- Transaction logging
- Spending alerts

### Trip Planning
- Itinerary builder
- Pool integration
- Voting system
- Task assignments

### Ventures (Wealth Engine)
- Venture profiles with stages
- Milestones and OKRs
- Simple financials tracking
- Opportunity leads CRM
