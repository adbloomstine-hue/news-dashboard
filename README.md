# News Dashboard

A private news aggregation and curation dashboard for California gaming and policy news. Articles are ingested via RSS feeds and optional News API providers, placed in an admin review queue, and published to the public dashboard only after approval.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
# or: pnpm install / bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values. Required:
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — your admin credentials
- `DATABASE_URL` — defaults to `file:./prisma/dev.db` (SQLite)

### 3. Initialize the database

```bash
# Create the database schema
npm run db:migrate

# Create the admin user and sample data
npm run db:seed
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public dashboard.
Open [http://localhost:3000/admin/queue](http://localhost:3000/admin/queue) for the admin panel.

---

## All Commands

| Command               | Description                                    |
|-----------------------|------------------------------------------------|
| `npm run dev`         | Start Next.js development server               |
| `npm run build`       | Build for production                           |
| `npm run start`       | Start production server                        |
| `npm run lint`        | Run ESLint                                     |
| `npm run db:migrate`  | Apply Prisma migrations (dev)                  |
| `npm run db:migrate:prod` | Deploy migrations (production)            |
| `npm run db:seed`     | Create admin user + sample articles            |
| `npm run db:studio`   | Open Prisma Studio (GUI for database)          |
| `npm run db:generate` | Regenerate Prisma client (after schema change) |
| `npm run test`        | Run all unit tests                             |
| `npm run test:watch`  | Run tests in watch mode                        |
| `npm run ingest`      | Manually trigger ingestion from CLI            |

---

## Architecture

```
news-dashboard/
├── prisma/
│   ├── schema.prisma          ← Data model
│   ├── seed.ts                ← Admin user + sample data
│   ├── rss-feeds.json         ← RSS feed configuration
│   └── migrations/            ← Database migrations
├── src/
│   ├── app/                   ← Next.js App Router pages
│   │   ├── page.tsx           ← Public dashboard
│   │   ├── login/             ← Admin login
│   │   ├── admin/             ← Protected admin area
│   │   │   ├── queue/         ← Review queue
│   │   │   ├── manual-entry/  ← Manual article entry
│   │   │   └── audit/         ← Audit log
│   │   └── api/               ← API routes
│   │       ├── articles/      ← Public article list + single article
│   │       ├── queue/         ← Admin queue (GET + POST)
│   │       ├── ingest/        ← Manual ingestion trigger
│   │       ├── cron/          ← Scheduled ingestion endpoint
│   │       └── audit/         ← Audit log API
│   ├── components/
│   │   ├── ui/                ← Base UI components
│   │   ├── dashboard/         ← Public dashboard components
│   │   ├── admin/             ← Admin UI components
│   │   └── shared/            ← Shared (Logo, OutletIcon, etc.)
│   ├── ingestion/
│   │   ├── index.ts           ← Ingestion orchestrator
│   │   ├── keywords.ts        ← Tracked keywords
│   │   └── adapters/
│   │       ├── rss.ts         ← Adapter A: RSS feeds
│   │       └── newsapi.ts     ← Adapter B: News API (optional)
│   └── lib/
│       ├── auth.ts            ← NextAuth config
│       ├── prisma.ts          ← Prisma client singleton
│       ├── audit.ts           ← Audit log helpers
│       ├── rate-limit.ts      ← In-memory rate limiter
│       ├── sanitize.ts        ← HTML sanitization (DOMPurify)
│       ├── tokens.ts          ← Design tokens (SWAP LOGO HERE)
│       └── utils.ts           ← Shared utilities
└── tests/
    ├── ingestion.test.ts      ← Keyword matching + sanitization tests
    └── approval.test.ts       ← Workflow state machine tests
```

---

## Ingestion

### How it works

1. **Adapter A (RSS)** — Fetches configured RSS feeds every `INGEST_INTERVAL_MINUTES` minutes. Only stores metadata and short snippets. Never scrapes full article text.
2. **Adapter B (News API)** — Optional. Set `NEWS_API_KEY` in `.env` to enable. Supports `newsapi.org` and `newsdata.io`.
3. **Adapter C (Manual)** — Admin can enter articles manually via `/admin/manual-entry` — required for paywalled sources.

### Configuring RSS feeds

Edit `prisma/rss-feeds.json`:

```json
{
  "feeds": [
    {
      "name":    "My Feed",
      "url":     "https://example.com/feed.xml",
      "outlet":  "Example News",
      "domain":  "example.com",
      "enabled": true
    }
  ]
}
```

### Scheduling (production)

**Vercel Cron** (automatic with `vercel.json`):
- The cron is configured to run hourly at `/api/cron`
- Secure it with `CRON_SECRET` in your Vercel environment variables

**External cron** (any cron service):
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron
```

**Local dev polling** (optional):
```bash
# Add to a separate terminal or use a tool like `watch`
while true; do npm run ingest && sleep $((INGEST_INTERVAL_MINUTES * 60)); done
```

---

## Database

### SQLite (default — local dev)
Works out of the box. The database file is at `prisma/dev.db`.

### PostgreSQL (production)
1. Change `provider` in `prisma/schema.prisma` from `"sqlite"` to `"postgresql"`
2. Update `DATABASE_URL` in your `.env`:
   ```
   DATABASE_URL="postgresql://user:pass@host:5432/news_dashboard?schema=public"
   ```
3. Run `npm run db:migrate:prod`

---

## Security

- **Admin routes** are protected by NextAuth session checks at the layout level.
- **API routes** check session on every request.
- **Cron endpoint** requires `CRON_SECRET` Bearer token.
- **Input sanitization**: All user-entered text is sanitized with DOMPurify via `isomorphic-dompurify`.
- **No paywall bypass**: Only publicly available RSS metadata is stored. Paywalled articles require manual summary entry.
- **Rate limiting**: Ingestion API endpoint is rate limited (configurable via `INGEST_RATE_LIMIT`).
- **CSP**: `next.config.ts` includes Content-Security-Policy headers. Adjust `script-src` for production (remove `unsafe-eval`).

---

## Compliance

- Articles are ingested only from publicly accessible RSS feeds and licensed API providers.
- No third-party credentials are stored.
- No paywall content is scraped or displayed.
- All stored content is properly attributed with canonical source URLs.
- Admins are instructed not to reproduce copyrighted content verbatim in manual summaries.

---

## Testing

```bash
npm run test          # Run all tests once
npm run test:watch    # Watch mode
```

Tests cover:
- Keyword matching (all 11 tracked keywords)
- HTML sanitization and XSS prevention
- Approval workflow state machine
- Manual entry validation
- Tag handling

---

See `DESIGNER_NOTES.md` for visual system documentation and logo swap instructions.
