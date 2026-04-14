# Dorm Exchange

A dorm roommate communication platform — chat, proposals, voting, and shared agreements — all in one place.

## Features

- Room-isolated chat with image sharing
- Proposal creation, voting, and edit history
- Active dorm agreements page
- In-app notifications with unread badge
- Profile menu with display name editing
- Help center

## Tech Stack

- **Next.js 16** (App Router, TypeScript, React 19)
- **Local SQLite mode** — zero config, runs entirely offline via `better-sqlite3`
- **Supabase mode** — PostgreSQL + Auth + RLS for production deployment
- **Tailwind CSS v4** — campus-style design system

---

## Quick Start — Local Mode (No Supabase, No Account Needed)

> This is the recommended path for first-time setup and demos.

### Prerequisites

- **Node.js 20 or higher** — download from https://nodejs.org

### Step 1 — Install dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

### Step 2 — Start the dev server in local mode

```bash
npm run dev:local
```

This command automatically sets the required environment variables for local SQLite mode. No `.env` file is needed.

Open your browser at **http://localhost:3000**.

### Step 3 — Seed demo data (optional but recommended)

In a second terminal (while the dev server is running), run:

```bash
npm run seed:local
```

This creates three demo student accounts inside `data/local-demo.db`:

| Email | Password | Display name |
|---|---|---|
| jordan@example.com | demo123456 | Jordan |
| alex@example.com | demo123456 | Alex |
| sam@example.com | demo123456 | Sam |

All three accounts are already in the same dorm room. Invite code: **DORM42**

To also add demo proposal edit history records:

```bash
npm run history:demo
```

### Step 4 — Sign in

Go to http://localhost:3000/auth/login and sign in with any of the demo accounts above, or go to http://localhost:3000/auth/register to create your own account.

---

## Using the App

| Page | How to get there |
|---|---|
| Chat | Home after login → dorm room chat |
| New Proposal | "New Proposal" button in chat header |
| Proposals | Click any proposal link in chat |
| Agreements | "Agreements" button in chat header |
| Notifications | "Notifications" badge in top-right bar |
| Help | "Help" button in top-right bar |
| Profile | Avatar button (initials) in top-right bar |

### Key flows

1. **Invite a roommate** — share the invite code shown in the chat header
2. **Create a proposal** — fill in category, title, description, and details
3. **Vote** — all room members vote; unanimous approval activates the proposal
4. **Edit a proposal** — the proposer can edit pending or rejected proposals; votes reset automatically
5. **Send an image** — click the image icon next to the chat input, choose a file (JPEG/PNG/GIF/WebP, max 5 MB), then Send

---

## Project Structure

```
src/
  app/
    api/          # API route handlers (messages, proposals, upload, profile …)
    app/          # Authenticated app pages (chat, proposals, agreements …)
    auth/         # Login / register pages
    onboarding/   # Create or join a room
  components/     # Shared React components
  lib/
    localdb/      # SQLite schema, session helpers
    supabase/     # Supabase client helpers
    domain/       # Shared business logic (proposal activation rules …)
  types/          # Shared TypeScript types
scripts/
  seed-local-db.mjs        # One-command demo data seeder
  add-demo-edit-history.mjs  # Adds extra edit history records for demos
supabase/
  migrations/    # SQL migrations for Supabase (production) mode
```

---

## Supabase Mode (Production)

Only needed if you want to deploy with a real database.

### 1 — Create a Supabase project

Go to https://supabase.com and create a free project.

### 2 — Run migrations

In the Supabase SQL editor, run these files in order:

- `supabase/migrations/001_init.sql`
- `supabase/migrations/002_rls.sql`
- `supabase/migrations/003_proposal_edit_history.sql`
- `supabase/migrations/004_messages_allow_image.sql`

### 3 — Configure Auth

In Supabase → Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000` (development) or your deployed URL
- **Redirect URLs**: add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`

### 4 — Set environment variables

Create a `.env.local` file in the project root:

```bash
USE_LOCAL_DB=false
NEXT_PUBLIC_USE_LOCAL_DB=false
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5 — Start the dev server

```bash
npm run dev
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev:local` | Start dev server in local SQLite mode (no .env needed) |
| `npm run dev` | Start dev server in Supabase mode (requires .env.local) |
| `npm run seed:local` | Reset and seed demo data into local SQLite database |
| `npm run history:demo` | Add demo proposal edit history records |
| `npm run build:local` | Production build in local mode |
| `npm run lint` | Run ESLint |

---

## Deploy to Vercel (Simplest Demo Path)

This repository already includes `vercel.json` for local demo mode.

1. Push this repository to GitHub.
2. Import it into Vercel.
3. Deploy directly (no required environment variables).

After deployment, you can register accounts in-app and create/join rooms for the demo.

### Notes for Vercel demo mode

- App data is stored in a local SQLite file under `/tmp`, so data may reset across deployments/cold starts.
- In Vercel local mode, image upload is capped at **2 MB** and stored as a data URL.
- This mode is intended for coursework/demo environments, not long-term production data.

---

## Production Checklist (Supabase mode)

If you switch to `USE_LOCAL_DB=false` and deploy with Supabase:

- RLS enabled on all tables
- Supabase auth callback URLs include your Vercel domain
- Verify multi-user room isolation
- Verify proposal vote lifecycle: pending -> active agreement
- Verify notifications and read/unread flow
