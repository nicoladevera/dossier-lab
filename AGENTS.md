# Agents Guide

This document provides context for AI coding agents working on this codebase.

## Project Overview

Dossier AI is a RAG (Retrieval-Augmented Generation) application built with Next.js 16 (App Router), Prisma 7, PostgreSQL + pgvector, and TypeScript. It provides content capture, hybrid search, Q&A with citations, and evaluation infrastructure.

## Development Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run test         # Run all tests (Jest)
npm run test:watch   # Tests in watch mode
npm run lint         # ESLint
npm run format       # Prettier
npx prisma migrate dev    # Apply database migrations
npx prisma generate       # Regenerate Prisma client
```

## Key Conventions

### Next.js App Router

This project uses the **App Router** (not Pages Router). All routes are in `app/`. Route groups:

- `app/page.tsx` -- Root redirect (authenticated users -> `/dashboard`, unauthenticated -> `/login`)
- `(auth)/` -- Public pages (login, signup)
- `(main)/` -- Authenticated pages, wrapped in `SessionProvider` with sidebar layout. Dashboard is at `(main)/dashboard/page.tsx`.
- `api/` -- API route handlers

### Data Isolation

**Every database query must be scoped by `user_id`.** This is a hard rule. Use the auth helpers to get the current user:

```typescript
import { getRequiredAuthSession } from "@/lib/auth";

const session = await getRequiredAuthSession();
const userId = session.user.id;

// Always filter by userId
const sources = await prisma.source.findMany({
  where: { userId },
});
```

### Authentication

- NextAuth.js v4 with Credentials provider (email + bcrypt password)
- JWT session strategy (sessions survive browser refreshes)
- `middleware.ts` protects all `/(main)` routes, redirecting to `/login`
- Auth helpers: `getAuthSession()` (nullable) and `getRequiredAuthSession()` (throws if unauthenticated)

### Database

- **ORM:** Prisma 7 with PostgreSQL + pgvector extension
- **Driver adapter:** Prisma 7 uses the client engine which requires `@prisma/adapter-pg`. The adapter is configured in `lib/db.ts`.
- **Schema:** `prisma/schema.prisma`
- **Client singleton:** `lib/db.ts` -- always import `prisma` from here
- **Generated client location:** `app/generated/prisma` (in .gitignore)
- **Import path:** Use `@/app/generated/prisma/client` (not `@/app/generated/prisma` -- there is no index file)
- **Vector columns:** Use `Unsupported("vector(1536)")` in Prisma schema; interact via raw SQL (`$queryRawUnsafe`)
- After schema changes: run `npx prisma migrate dev` then `npx prisma generate`
- **Important:** Do not manually create the pgvector extension before running migrations -- it causes drift detection errors. The migration SQL handles extension creation.

### Key Models

| Model | Purpose |
|-------|---------|
| `User` | Auth + data ownership |
| `Source` | Captured document (URL, PDF, Word, Markdown, text) |
| `Chunk` | Text chunk with embedding vector |
| `UserSettings` | Encrypted API keys, provider/model preferences |
| `Evaluation` | Q&A interaction metrics (scores, cost, latency) |
| `QueryTestCase` | Golden test queries for regression testing |

### Service Layer

Services live in `lib/services/` and follow a provider/strategy pattern:

- **Chunking** (`chunking/`) -- `ChunkingStrategy` interface with `RecursiveCharacterSplitter` implementation
- **Embedding** (`embedding/`) -- `EmbeddingProvider` interface with OpenAI implementation plus key/provider resolution (`provider-factory.ts`)
- **LLM** (`llm/`) -- `LLMProvider` interface with OpenAI and Anthropic implementations, plus a factory
- **Extraction** (`extraction/`) -- Content extractors for URL, PDF, Word, Markdown, text
- **Search** (`search/`) -- Semantic, keyword, and hybrid (RRF) search with metadata-aware keyword fallback
- **Processing** (`processing/`) -- Async pipeline: chunk -> optional embed -> store
- **Evaluation** (`evaluation/`) -- Retrieval accuracy, groundedness, cost tracking
- **Encryption** (`encryption.ts`) -- AES-256-GCM for API key storage

### Testing

- Tests are co-located with source files (e.g., `chunking-service.test.ts` next to `chunking-service.ts`)
- Run with `npx jest` or `npm test`
- Use `npx jest path/to/test` to run a specific test file
- External APIs (OpenAI, Anthropic) should always be mocked in tests

### UI Components

- **shadcn/ui** primitives in `components/ui/` -- do not edit these directly
- Feature components are organized by domain: `capture/`, `knowledge-base/`, `search/`, `qa/`, `evaluation/`, `onboarding/`
- Shared reusable components in `components/shared/` (empty state, loading state)
- App-level providers in `components/providers/`
- Styling: Tailwind CSS v4 utility classes, responsive breakpoints (`sm`, `md`, `lg`, `xl`)
- Light/dark mode via `next-themes` (ThemeProvider in root layout)

### API Keys & Secrets

- User API keys (OpenAI, Anthropic) are encrypted with AES-256-GCM before storage
- Server-side `ENCRYPTION_KEY` must be set in environment variables
- Keys are configured per-user in the Settings page, not in `.env.local`
- OpenAI key is optional (enables semantic embeddings); without it, retrieval falls back to keyword-only mode
- Never log or expose decrypted API keys

### Rate Limiting

- Ingestion: 50 docs/hour, 200/day
- Search/Q&A: 30/min, 500/day
- Implementation in `lib/rate-limit.ts`

## File Quick Reference

| File | Purpose |
|------|---------|
| `lib/db.ts` | Prisma client singleton (uses `@prisma/adapter-pg`) |
| `lib/auth.ts` | Auth config, session helpers |
| `lib/rate-limit.ts` | Rate limiting middleware |
| `middleware.ts` | Route protection |
| `prisma/schema.prisma` | Database schema |
| `lib/services/embedding/provider-factory.ts` | OpenAI embedding key resolution and optional provider creation |
| `lib/services/processing/processing-queue.ts` | Document processing pipeline entry point |
| `lib/services/search/hybrid-search.ts` | Search orchestration (RRF fusion) |
| `lib/services/search/keyword-search.ts` | Metadata-aware keyword search with loose fallback |
| `app/api/qa/route.ts` | Q&A orchestration (source-level citations + LLM context assembly) |
| `lib/services/llm/provider-factory.ts` | LLM provider instantiation |
| `lib/services/encryption.ts` | API key encrypt/decrypt |

## Common Tasks

### Adding a new API endpoint

1. Create route handler in `app/api/<path>/route.ts`
2. Use `getRequiredAuthSession()` for auth
3. Scope all queries by `userId`
4. Apply rate limiting if user-facing

### Adding a new content extractor

1. Create extractor in `lib/services/extraction/<type>-extractor.ts`
2. Add corresponding test file
3. Register the type in the upload API route (`app/api/ingest/upload/route.ts`)
4. Add the source type to the `SourceType` enum in `prisma/schema.prisma`

### Adding a new LLM provider

1. Implement `LLMProvider` interface in `lib/services/llm/<provider>-provider.ts`
2. Add to the factory in `lib/services/llm/provider-factory.ts`
3. Add to `LLMProvider` enum in Prisma schema
4. Update the Settings page model dropdown
