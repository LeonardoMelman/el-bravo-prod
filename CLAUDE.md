# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**El Bravo** is a full-stack fitness competition app. Users join groups, compete in time-bounded seasons, log workout activities, and earn points/awards based on performance. The app is in Spanish.

## Commands

```bash
npm run dev        # Start Next.js dev server
npm run build      # prisma generate && next build
npm start          # Production server
npm run lint       # ESLint
npm run seed       # Seed DB with activity types, muscles, and exercises
```

There are no automated tests in this project.

## Architecture

**Full-stack Next.js 16 (App Router)** with TypeScript. All API logic lives in `/app/api/` as Next.js route handlers. The frontend uses React 19 with Tailwind CSS v4.

### Key Layers

- **`/app/api/`** — 30 REST-style route handlers (POST/GET/DELETE). Organized by feature: `auth/`, `activities/`, `exercises/`, `groups/`, `seasons/`, `profiles/`, `routines/`, `scoring/`.
- **`/src/lib/`** — Core business logic:
  - `auth.ts` — JWT sign/verify via `jose`; token stored in HTTP-only cookies.
  - `db.ts` — Prisma client singleton (MariaDB via `@prisma/adapter-mariadb`).
  - `currentUser.ts` — Reads the JWT cookie and returns the logged-in user from DB.
  - `scoring/` — Complex point calculation: base × duration multiplier × consistency multiplier + comeback bonuses. Includes fair-play caps (max scoreable minutes per activity/day).
  - `awards/` — Award evaluation triggered after activity logging.
  - `muscles/` — Muscle group calculations for routines.
- **`/src/components/`** — 26 reusable React components (forms, cards, modals, selectors).
- **`/src/schemas/`** — Zod validation schemas for exercises and routines.
- **`/prisma/`** — Schema, migrations, and seed script.

### Data Model Core

```
User → GroupMember → Group → Season → SeasonMember
                                     ↓
User → Activity (logs workouts) → ScoreEvent (points earned)
                                → SeasonWeekProgress (streaks, goals)
                                → AwardEarned (badges)
User → Routine → RoutineExercise → Exercise → ExerciseMuscle
```

Key enums: `ActivityType` (19 types), `GroupRole` (admin/member), `MembershipStatus`, `ScoreEventType`, `AwardScope`, `ExerciseMeasureType`.

### Auth Flow

1. Login/register via `/app/api/auth/` — bcryptjs password hash, jose JWT signed with `JWT_SECRET`.
2. Token stored as HTTP-only cookie (`elbravo_token` by default).
3. Protected routes call `currentUser()` from `src/lib/currentUser.ts` at the top of each handler.

## Environment Variables

```
DATABASE_URL        # MariaDB connection string (required)
JWT_SECRET          # JWT signing secret (required)
JWT_COOKIE_NAME     # Cookie name (optional, defaults to "elbravo_token")
```

## Notable Conventions

- **Path alias**: `@/*` maps to `./src/*` (configured in `tsconfig.json`).
- **Prisma config**: Defined in `prisma.config.ts` at root (not just `schema.prisma`).
- **Scoring recalculation**: Several API routes in `scoring/` recalculate historical scores and week progress — these are expensive operations designed for admin use.
- **Timezone handling**: Users have a `timezone` field; week boundaries are calculated per user's local timezone.
