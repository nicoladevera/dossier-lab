# Dossier AI

A personal intelligence tool that transforms your reading into a searchable, synthesizable knowledge base. Capture articles, documents, and text, then search semantically, ask questions, and get source-grounded answers with citations.

## Features

- **Content Capture** -- Ingest URLs (with automatic article extraction), PDFs, Word documents, Markdown, and plain text
- **Hybrid Search** -- Semantic vector search (when OpenAI embeddings are configured) + metadata-aware PostgreSQL full-text search with fallback loose matching
- **Q&A with Citations** -- Ask natural language questions and get streaming answers with source-level citations and expandable evidence passages
- **Evaluation Dashboard** -- Track retrieval accuracy, groundedness, latency, and cost with LLM-as-judge scoring
- **Multi-Provider LLM Support** -- Switch between OpenAI (GPT-4o) and Anthropic (Claude) with encrypted API key storage

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Database:** PostgreSQL with pgvector for vector similarity search
- **ORM:** Prisma 7
- **Auth:** NextAuth.js with credentials provider (bcrypt + JWT sessions)
- **UI:** Tailwind CSS v4 + shadcn/ui + Radix primitives
- **LLM SDKs:** OpenAI, Anthropic
- **Testing:** Jest + ts-jest

## Prerequisites

- Node.js 20+
- PostgreSQL 17+ with the [pgvector](https://github.com/pgvector/pgvector) extension

On macOS with Homebrew:

```bash
brew install postgresql@17 pgvector
brew services start postgresql@17
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

```bash
createdb dossier_ai
```

Do **not** manually create the pgvector extension -- the Prisma migration handles that.

### 3. Configure environment variables

Create `.env.local` with the following (generate secrets with `openssl`):

```bash
# Database connection (macOS Homebrew uses your system user, no password)
DATABASE_URL="postgresql://YOUR_USERNAME:@localhost:5432/dossier_ai"

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret"

NEXTAUTH_URL="http://localhost:3000"

# Generate with: openssl rand -hex 16
ENCRYPTION_KEY="your-generated-key"
```

Also update the `DATABASE_URL` in `.env` to match (Prisma reads both files).

API keys (OpenAI/Anthropic) are configured per-user in the Settings page, not in environment variables.
OpenAI is optional: without it, ingestion/search/Q&A use keyword-only retrieval.

### 4. Set up the database schema

```bash
# Run migrations (creates tables, pgvector extension, and indexes)
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to create an account and get started.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Project Structure

```
app/
  page.tsx             # Root redirect (authenticated -> /dashboard, otherwise -> /login)
  (auth)/              # Login and signup pages
  (main)/              # Authenticated pages with sidebar layout
    dashboard/         # Dashboard home page
    knowledge-base/    # Knowledge base list and detail pages
    search/            # Search results page
    qa/                # Q&A interface
    evaluation/        # Evaluation dashboard
    settings/          # Settings page
  api/                 # API routes (auth, ingest, search, qa, evaluation, settings, sources)
components/
  capture/             # Content capture forms (URL, upload, text paste)
  evaluation/          # Metrics chart, test suite runner
  knowledge-base/      # Source list, card, filters
  layout/              # Navbar, sidebar
  onboarding/          # 4-step first-run flow
  providers/           # Session and theme providers
  qa/                  # Question input, answer display, citations
  search/              # Search input and results
  shared/              # Empty state, loading state
  ui/                  # shadcn/ui primitives
lib/
  services/
    chunking/          # Text chunking (recursive character splitter)
    embedding/         # Embedding generation + provider/key resolution
    encryption/        # AES-256-GCM API key encryption
    evaluation/        # Retrieval accuracy, groundedness, cost tracking
    extraction/        # Content extractors (URL, PDF, Word, Markdown, text)
    llm/               # LLM provider abstraction (OpenAI, Anthropic)
    processing/        # Async document processing queue
    search/            # Semantic, keyword, and hybrid search
prisma/
  schema.prisma        # Database schema
  migrations/          # SQL migrations
```

## Architecture

### Document Processing Pipeline

```
Content Capture --> Text Extraction --> Chunking (500 char, 50 overlap)
    --> Optional Embedding (OpenAI text-embedding-3-small) --> Chunk Storage
```

### Search & Q&A Flow

```
Query --> Optional Query Embedding --> Semantic Search (cosine similarity)
      --> Keyword Search (tsvector/tsquery + metadata + loose fallback)
      --> RRF Fusion (k=60, top 10)
      --> Source-level citation grouping
      --> LLM Generation (streaming, source metadata + passages) --> Cited Answer
```

### Data Isolation

All database queries are scoped by `user_id`. Each user's knowledge base is fully isolated.

## License

Private project.
