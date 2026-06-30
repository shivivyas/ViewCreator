# ViewCreator

AI-powered social content generation platform. Generate high-volume marketing images and videos using Google Gemini, with a library of viral templates, upvoting, and Clerk authentication.

---

## 🏗️ Architecture

This repository is a **npm workspaces monorepo** with three packages:

| Package | Description |
|---------|-------------|
| **`viewcreator-api`** | Express + TypeScript backend. Handles image/video generation via Google Gemini (`gemini-3.1-flash-image`), Clerk auth, S3 template uploads, and database operations. |
| **`viewcreator-ui`** | Next.js 16.2.9 frontend. Landing pages, AI Studio (generation UI), template browsing, and voting. |
| **`viewcreator-database`** | Shared database layer. PostgreSQL connection pool, migrations, seed scripts, and typed repositories (`UserRepository`, `TemplateRepository`, `VoteRepository`). |

### Data flow

```
User's browser  ──►  viewcreator-ui (Next.js, port 3000)
                        │
                        ▼ (HTTP / Bearer token)
                  viewcreator-api (Express, port 3001)
                        │
                        ├──► Google Gemini API (image/video generation)
                        ├──► AWS S3 (template image storage)
                        └──► Supabase PostgreSQL (users, templates, votes)
```

---

## 🧰 Prerequisites

Before setting up, you'll need accounts / keys for the following services:

- **Supabase** — PostgreSQL database (the app connects via `DATABASE_URL`)
- **Clerk** — Authentication (get a publishable + secret key from [dashboard.clerk.com](https://dashboard.clerk.com))
- **Google Gemini API** — AI generation (`gemini-3.1-flash-image` model)
- **AWS S3** — Template image storage (bucket + access keys) — *optional if not using template features*

---

## 🚀 Setup (from scratch)

### 1. Install root dependencies

```bash
npm install
```

This installs dependencies for all three workspace packages (`viewcreator-api`, `viewcreator-ui`, `viewcreator-database`).

### 2. Configure environment variables

Each package has an `.env.example` — copy to `.env` (or `.env.local` for the UI) and fill in the values.

#### `viewcreator-api/.env`

```bash
cp viewcreator-api/.env.example viewcreator-api/.env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API server port (default: `3001`) |
| `GEMINI_NANO_BANANA_API_KEY` | **Yes** | Google Gemini API key for the `gemini-3.1-flash-image` model |
| `CLERK_PUBLISHABLE_KEY` | **Yes** | Clerk publishable key (Express backend) |
| `CLERK_SECRET_KEY` | **Yes** | Clerk secret key (Express backend) |
| `AWS_REGION` | No | S3 region (default: `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | For templates | AWS access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | For templates | AWS secret key for S3 |
| `AWS_S3_BUCKET` | For templates | S3 bucket name for template images |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Yes** | Supabase publishable key (anon key) |
| `DATABASE_URL` | **Yes** | Full Postgres connection string from Supabase |

#### `viewcreator-database/.env`

```bash
cp viewcreator-database/.env.example viewcreator-database/.env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Yes** | Supabase publishable key |
| `DATABASE_URL` | **Yes** | Full Postgres connection string from Supabase |

#### `viewcreator-ui/.env.local`

```bash
cp viewcreator-ui/.env.example viewcreator-ui/.env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | API backend URL (default: `http://localhost:3001`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes** | Clerk publishable key (Next.js client) |
| `CLERK_SECRET_KEY` | **Yes** | Clerk secret key (Next.js server) |

### 3. Build the database package

The `viewcreator-database` package needs to be compiled before `viewcreator-api` can use it.

```bash
cd viewcreator-database
npm run build
cd ..
```

> **Why?** `viewcreator-api` references `viewcreator-database` as a file dependency (`"viewcreator-database": "file:../viewcreator-database"`). The compiled output in `viewcreator-database/dist/` is what gets resolved at runtime.

### 4. Run database migrations

This creates the `users`, `templates`, and `template_upvotes` tables in your Supabase PostgreSQL instance.

```bash
cd viewcreator-database
npm run db:migrate
cd ..
```

### 5. (Optional) Seed sample data

Populates a demo user and an initial viral template:

```bash
cd viewcreator-database
npm run db:seed
cd ..
```

### 6. Start the API server

```bash
cd viewcreator-api
npm run dev
```

The API will be available at `http://localhost:3001`. Verify with:

```bash
curl http://localhost:3001/health
# → {"status":"healthy","timestamp":"..."}
```

### 7. Start the UI (in a separate terminal)

```bash
cd viewcreator-ui
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Package details

### `viewcreator-database`

Pure PostgreSQL module using `pg` (node-postgres). Connects to Supabase Postgres via `DATABASE_URL`.

**Scripts:**

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run db:migrate` | Apply `src/schema.sql` to create/update tables |
| `npm run db:seed` | Insert demo user + initial template |

**Repositories:**

- `UserRepository` — `findById`, `findByEmail`, `create`
- `TemplateRepository` — `findById`, `findAll`, `create`, `delete`
- `VoteRepository` — `findAllWithVotes`, `findByIdWithVotes`, `toggleUpvote`

### `viewcreator-api`

Express server with these endpoints:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |
| `GET` | `/api/templates` | **Yes** | List templates (with vote counts, pagination) |
| `POST` | `/api/templates/upload` | **Yes** | Upload a template image to S3 |
| `DELETE` | `/api/templates/:id` | **Yes** | Delete own template |
| `POST` | `/api/templates/:id/vote` | **Yes** | Toggle upvote |
| `POST` | `/api/generate` | **Yes** | Generate image(s) via Gemini |
| `POST` | `/api/generate/video` | **Yes** | Generate video via Gemini |

### `viewcreator-ui`

Next.js 16.2.9 app with App Router, Tailwind CSS v4, and shadcn/ui components.

**Key pages:**

- `/` — Landing page
- `/generate` — AI Studio (image/video generation dashboard)
- `/generate/edit` — Inline image editor
- `/templates` — Template gallery with voting

---

## 🔐 Authentication

The app uses **Clerk** for end-to-end authentication:

- The **UI** uses `@clerk/nextjs` for login/signup flows.
- The **API** uses `@clerk/express` to validate Bearer tokens on protected routes.
- When a user hits a protected endpoint for the first time, the API automatically syncs their profile (name, email) into the database via `Clerk → ensureUserSynced`.

---

## 🗄️ Database schema (Supabase PostgreSQL)

The schema lives in `viewcreator-database/src/schema.sql` and includes:

- **`users`** — Synced from Clerk on first API call (`id`, `email`, `name`, timestamps)
- **`templates`** — Viral social media templates with flexible `JSONB config` and `s3_link`
- **`template_upvotes`** — Many-to-many upvotes with a unique `(template_id, user_id)` constraint

An `update_timestamp()` trigger automatically maintains `updated_at` on `users` and `templates`.

---

## 🌐 Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| `viewcreator-api` | Any Node.js host (Railway, Fly.io, Cloud Run, etc.) | Set all env vars from `.env` |
| `viewcreator-ui` | Vercel, Netlify | Set `NEXT_PUBLIC_API_URL` to deployed API URL |
| PostgreSQL | Supabase (managed) | Already hosted — keep `DATABASE_URL` in your deployed env |
