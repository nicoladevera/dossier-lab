# Dossier AI

A personal intelligence tool that transforms your reading into a searchable, synthesizable knowledge base. Capture articles, documents, and text, then search semantically, ask questions, and get source-grounded answers with citations.

## Features

- **Content Capture** -- Ingest URLs (with automatic article extraction), PDFs, Word documents, Markdown, and plain text
- **Hybrid Search** -- Semantic vector search + PostgreSQL full-text search combined via Reciprocal Rank Fusion (RRF)
- **Q&A with Citations** -- Ask natural language questions and get streaming answers with clickable, expandable citations
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
- PostgreSQL 15+ with the [pgvector](https://github.com/pgvector/pgvector) extension

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example and fill in your values:

```bash
cp .env .env.local
```

Required variables in `.env.local`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/dossier_ai"
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="your-32-char-encryption-key"
```

API keys (OpenAI/Anthropic) are configured per-user in the Settings page, not in environment variables.

### 3. Set up the database

```bash
# Enable pgvector extension (run once in psql)
psql -d dossier_ai -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### 4. Start the dev server

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
  (auth)/              # Login and signup pages
  (main)/              # Authenticated pages (dashboard, KB, search, Q&A, eval, settings)
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
    embedding/         # Embedding generation (OpenAI text-embedding-3-small)
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
    --> Embedding (text-embedding-3-small) --> pgvector Storage
```

### Search & Q&A Flow

```
Query --> Embed Query --> Semantic Search (cosine similarity)
                     --> Keyword Search (tsvector/tsquery)
                     --> RRF Fusion (k=60, top 10)
                     --> LLM Generation (streaming) --> Cited Answer
```

### Data Isolation

All database queries are scoped by `user_id`. Each user's knowledge base is fully isolated.

## License

Private project.
