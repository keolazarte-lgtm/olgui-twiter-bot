# Task 2: Dinasty Academy Campus Platform

## Summary
Built the complete Dinasty Academy campus platform with authentication, course content, payment integration, and admin management.

## Files Created
- `/src/lib/academy-db.ts` — Database helpers (supports Turso + local SQLite)
- `/src/lib/auth.ts` — JWT + bcrypt authentication helpers
- `/src/middleware.ts` — Route protection for /campus/* and /admin/*
- `/src/app/api/auth/register/route.ts` — User registration
- `/src/app/api/auth/login/route.ts` — User login
- `/src/app/api/auth/me/route.ts` — Get current user
- `/src/app/api/mp/create-preference/route.ts` — MercadoPago payment
- `/src/app/api/mp/webhook/route.ts` — MP webhook handler
- `/src/app/api/admin/users/route.ts` — Admin user management
- `/src/app/api/modules/route.ts` — Course modules API
- `/src/app/api/progress/route.ts` — Lesson progress API
- `/src/app/api/seed/route.ts` — Database seeding
- `/src/app/login/page.tsx` — Login/Register page
- `/src/app/campus/page.tsx` — Campus dashboard
- `/src/app/campus/modulo/[id]/page.tsx` — Module detail page
- `/src/app/campus/pending/page.tsx` — Payment pending page
- `/src/app/admin/page.tsx` — Admin panel
- `.env.local` — Environment variables

## Files Modified
- `/src/app/page.tsx` — Updated payment modal with password field and new purchase flow

## Database
- Using local SQLite at `db/academy.db`
- Turso cloud DB credentials expired (HTTP 400); can be reconnected when new credentials available
- Database auto-initializes with `initSchema()` on first API call
- Seed via POST to `/api/seed`

## Admin Access
- Email: admin@dinastyacademy.com
- Password: Dinasty2026!

## Payment Flow
1. User clicks "PAGAR CON MERCADOPAGO" on landing page or registers on /login
2. Account created (active=0) → MP preference created → redirect to MP
3. After MP payment → webhook activates user (active=1)
4. User accesses /campus with full course content

## Current Status
- All endpoints tested and working
- Lint passes
- Database seeded with 6 modules, 12 lessons
- Admin user created
