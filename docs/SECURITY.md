# Family Powerhouse - Security

## Authentication
- NextAuth.js v5 with JWT strategy
- Password: 12+ chars, uppercase, lowercase, number
- bcrypt hashing (cost factor 12)

## Authorization (RBAC)

| Role | Level |
|------|-------|
| OWNER | 100 |
| TREASURER | 80 |
| PLANNER | 60 |
| MEMBER | 40 |
| YOUTH | 20 |
| GUEST | 10 |

## Tenant Isolation
- All queries filtered by familyId
- JWT includes familyId and role
- Middleware validates tenant access

## Input Validation
- Zod schemas for all inputs
- Server-side validation only

## Security Headers
```
X-DNS-Prefetch-Control: on
Strict-Transport-Security: max-age=63072000
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Stripe Security
- Webhook signature verification
- Idempotency keys on all operations
- Internal ledger as source of truth

## Audit Logging
Logged events:
- AUTH: Login, logout, password change
- FAMILY: Member invited/removed, role changes
- FINANCIAL: Pool operations, contributions, withdrawals

## CI Security Checks
- npm audit
- gitleaks (secret scanning)
- TypeScript strict mode
