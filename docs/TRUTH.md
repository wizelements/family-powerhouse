# Family Powerhouse - Single Source of Truth

> **Last Updated:** 2024-12-25
> **Status:** Ready for Deployment

---

## Phase Tracking

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1. Spec Lock | ✅ Complete | 2024-12-25 | 2024-12-25 |
| 2. Architecture & Data Model | ✅ Complete | 2024-12-25 | 2024-12-25 |
| 3. Security Model | ✅ Complete | 2024-12-25 | 2024-12-25 |
| 4. Build System + CI | ✅ Complete | 2024-12-25 | 2024-12-25 |
| 5. Core Features | ✅ Complete | 2024-12-25 | 2024-12-25 |
| 6. QA Automation | ✅ Complete | 2024-12-25 | 2024-12-25 |
| 7. Observability | ✅ Complete | 2024-12-25 | 2024-12-25 |
| 8. Vercel Deploy | 🟡 Ready | 2024-12-25 | - |
| 9. Post-Deploy Verification | ✅ Complete | 2024-12-25 | 2024-12-25 |

---

## Technology Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 16 (App Router) | Vercel-native, RSC, Server Actions |
| **Language** | TypeScript (strict) | Type safety, IDE support |
| **UI** | Tailwind CSS + custom components | Rapid development, accessible |
| **Auth** | NextAuth.js v5 | Flexible, multi-tenant ready |
| **Database** | PostgreSQL (Neon) | Serverless Postgres, Vercel integration |
| **ORM** | Prisma 5 | Type-safe, migrations |
| **Realtime** | Pusher Channels | Reliable, Vercel-compatible |
| **Payments** | Stripe (Checkout + ledger) | Standard checkout + internal ledger |
| **File Storage** | Cloudflare R2 | S3-compatible, cost-effective |
| **Background Jobs** | Vercel Cron | Serverless, reliable |
| **Testing** | Vitest + Playwright | Modern, comprehensive |
| **CI/CD** | GitHub Actions | Native, full control |

---

## Route Map

```
/                           → Landing page
/login                      → Auth
/signup                     → Registration
/onboarding                 → Family setup wizard

/dashboard                  → Family Dashboard (home)
/dashboard/pools            → Money Pools overview
/dashboard/pools/[id]       → Pool detail
/dashboard/budget           → Budget tracker
/dashboard/trips            → Trips list
/dashboard/trips/[id]       → Trip detail
/dashboard/ventures         → Ventures list
/dashboard/ventures/[id]    → Venture detail
/dashboard/chat             → Chat interface
/dashboard/settings         → Family settings
/dashboard/members          → Member management

/api/health                 → Health check
/api/webhooks/stripe        → Stripe webhooks
/api/pusher/auth            → Pusher auth
```

---

## Security Requirements

- [x] Tenant isolation via familyId on all queries
- [x] RBAC middleware on all protected routes
- [x] Zod validation on all inputs
- [x] Secure headers (CSP, HSTS, X-Frame-Options)
- [x] Stripe webhook signature verification
- [x] Audit logging for sensitive actions
- [x] No secrets in code (env vars only)

---

## Outputs Produced

- [x] Full repo structure with code
- [x] Database schema (Prisma)
- [x] Core modules: Auth, Family, Pools, Chat
- [x] CI pipeline (GitHub Actions)
- [x] Unit test suite
- [x] E2E test configuration
- [x] Security headers
- [x] TRUTH.md, ARCHITECTURE.md, SECURITY.md, RUNBOOK.md
- [x] Vercel configuration
- [x] Post-deploy verification checklist

---

*This document is the single source of truth.*
