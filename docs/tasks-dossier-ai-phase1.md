## Relevant Files

### Project Setup & Config
- `package.json` - Project dependencies and scripts
- `next.config.js` - Next.js configuration
- `.env.local` - Environment variables (DB connection string, API keys, NextAuth secret)
- `tailwind.config.ts` - Tailwind CSS configuration with design tokens
- `tsconfig.json` - TypeScript configuration
- `jest.config.ts` - Jest test runner configuration

### Database
- `prisma/schema.prisma` - Database schema (users, sources, chunks, embeddings, settings, evaluations)
- `lib/db.ts` - Database connection singleton
- `prisma/migrations/` - Database migration files

### Authentication
- `app/api/auth/[...nextauth]/route.ts` - NextAuth.js API route handler
- `lib/auth.ts` - Auth configuration, session helpers, and options
- `app/(auth)/login/page.tsx` - Login page
- `app/(auth)/signup/page.tsx` - Sign-up page
- `middleware.ts` - Route protection middleware (redirect unauthenticated users)

### Document Processing Pipeline
- `lib/services/chunking/chunking-service.ts` - Chunking service with strategy interface and recursive character splitter
- `lib/services/chunking/chunking-service.test.ts` - Tests for chunking service
- `lib/services/embedding/embedding-service.ts` - Embedding service with provider abstraction
- `lib/services/embedding/embedding-service.test.ts` - Tests for embedding service
- `lib/services/processing/processing-queue.ts` - Async document processing queue (BullMQ or similar)
- `lib/services/processing/processing-queue.test.ts` - Tests for processing queue

### Content Extraction
- `lib/services/extraction/url-extractor.ts` - URL content extraction (Mozilla Readability)
- `lib/services/extraction/url-extractor.test.ts` - Tests for URL extraction
- `lib/services/extraction/pdf-extractor.ts` - PDF text extraction (pdf-parse)
- `lib/services/extraction/pdf-extractor.test.ts` - Tests for PDF extraction
- `lib/services/extraction/word-extractor.ts` - Word document extraction (mammoth.js)
- `lib/services/extraction/word-extractor.test.ts` - Tests for Word extraction
- `lib/services/extraction/markdown-extractor.ts` - Markdown parsing (remark)
- `lib/services/extraction/text-extractor.ts` - Plain text handling

### Content Capture API & UI
- `app/api/ingest/url/route.ts` - URL ingestion API endpoint
- `app/api/ingest/upload/route.ts` - Document upload API endpoint
- `app/api/ingest/text/route.ts` - Text paste API endpoint
- `app/api/sources/route.ts` - Sources CRUD API (list, create)
- `app/api/sources/[id]/route.ts` - Individual source API (get, delete)
- `components/capture/url-capture-form.tsx` - URL capture form component
- `components/capture/document-upload-form.tsx` - Document upload form component
- `components/capture/text-paste-form.tsx` - Text paste form component

### Knowledge Base
- `app/(main)/knowledge-base/page.tsx` - Knowledge base list page
- `app/(main)/knowledge-base/[id]/page.tsx` - Source detail page
- `components/knowledge-base/source-list.tsx` - Source list component
- `components/knowledge-base/source-card.tsx` - Source card component
- `components/knowledge-base/source-filters.tsx` - Filter and sort controls

### Search
- `app/api/search/route.ts` - Search API endpoint
- `lib/services/search/semantic-search.ts` - Semantic (vector) search implementation
- `lib/services/search/keyword-search.ts` - PostgreSQL full-text keyword search
- `lib/services/search/hybrid-search.ts` - Reciprocal Rank Fusion (RRF) logic
- `lib/services/search/hybrid-search.test.ts` - Tests for hybrid search and RRF
- `app/(main)/search/page.tsx` - Search results page
- `components/search/search-input.tsx` - Search input component
- `components/search/search-results.tsx` - Search results display component

### Q&A with Citations
- `lib/services/llm/provider.ts` - LLM provider abstraction interface
- `lib/services/llm/openai-provider.ts` - OpenAI provider implementation
- `lib/services/llm/anthropic-provider.ts` - Anthropic provider implementation
- `lib/services/llm/provider.test.ts` - Tests for LLM provider abstraction
- `app/api/qa/route.ts` - Q&A API endpoint (retrieval + generation + streaming)
- `app/(main)/qa/page.tsx` - Q&A interface page
- `components/qa/question-input.tsx` - Question input component
- `components/qa/answer-display.tsx` - Streaming answer display with citations
- `components/qa/citation.tsx` - Clickable citation component (expandable passage)

### Evaluation Dashboard
- `app/api/evaluation/metrics/route.ts` - Evaluation metrics API
- `app/api/evaluation/test-suite/route.ts` - Test suite runner API
- `app/api/evaluation/feedback/route.ts` - User feedback API (good/bad answers)
- `lib/services/evaluation/retrieval-accuracy.ts` - Retrieval accuracy scoring (LLM-as-judge)
- `lib/services/evaluation/groundedness.ts` - Groundedness scoring (LLM-as-judge)
- `lib/services/evaluation/cost-tracker.ts` - Cost tracking (parse token usage, per-token pricing)
- `lib/services/evaluation/cost-tracker.test.ts` - Tests for cost tracking
- `app/(main)/evaluation/page.tsx` - Evaluation dashboard page
- `components/evaluation/metrics-chart.tsx` - Metrics history chart (7d/30d)
- `components/evaluation/test-suite-runner.tsx` - Test suite runner UI

### Settings
- `app/(main)/settings/page.tsx` - Settings page
- `app/api/settings/route.ts` - Settings CRUD API
- `app/api/settings/validate-key/route.ts` - API key validation endpoint
- `lib/services/encryption.ts` - API key encryption/decryption utility
- `lib/services/encryption.test.ts` - Tests for encryption utility

### Onboarding
- `components/onboarding/onboarding-flow.tsx` - Main onboarding flow controller
- `components/onboarding/welcome-step.tsx` - Step 1: Welcome
- `components/onboarding/capture-step.tsx` - Step 2: First capture
- `components/onboarding/query-step.tsx` - Step 3: First query
- `components/onboarding/explore-step.tsx` - Step 4: Explore

### Layout & Shared Components
- `app/layout.tsx` - Root layout (providers, theme)
- `app/(main)/layout.tsx` - Authenticated layout with navigation
- `app/(main)/page.tsx` - Dashboard / home page
- `components/ui/` - shadcn/ui component library
- `components/layout/navbar.tsx` - Top navigation bar
- `components/layout/sidebar.tsx` - Sidebar navigation
- `components/shared/empty-state.tsx` - Reusable empty state component
- `components/shared/loading-state.tsx` - Reusable loading/progress component
- `lib/rate-limit.ts` - Rate limiting utility for API endpoints

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `chunking-service.ts` and `chunking-service.test.ts` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- This project uses Next.js App Router (not Pages Router).
- All database queries must be scoped by `user_id` to enforce data isolation.
- API keys (OpenAI, Anthropic) should never be committed to version control; use `.env.local`.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/phase1-core-rag`)

- [x] 1.0 Project setup and infrastructure
  - [x] 1.1 Initialize a new Next.js project with TypeScript and App Router (`npx create-next-app@latest --typescript --app`)
  - [x] 1.2 Install and configure Tailwind CSS (should come with create-next-app; verify setup)
  - [x] 1.3 Install and configure shadcn/ui component library (`npx shadcn-ui@latest init`) and add core components (Button, Input, Card, Dialog, Tabs, etc.)
  - [x] 1.4 Install Prisma ORM and initialize (`npx prisma init`); configure the PostgreSQL connection string in `.env.local`
  - [x] 1.5 Set up a local PostgreSQL database with the pgvector extension enabled (`CREATE EXTENSION vector;`)
  - [x] 1.6 Create the project folder structure: `lib/services/`, `lib/db/`, `components/ui/`, `components/layout/`, `components/shared/`, `app/(auth)/`, `app/(main)/`, `app/api/`
  - [x] 1.7 Configure Jest for unit testing (`npm install --save-dev jest @types/jest ts-jest`) and create `jest.config.ts`
  - [x] 1.8 Create a root layout (`app/layout.tsx`) with theme provider (light/dark mode support) and global styles
  - [x] 1.9 Create the authenticated layout (`app/(main)/layout.tsx`) with a sidebar/navbar shell for navigation between Dashboard, Knowledge Base, Search, Q&A, Evaluation, and Settings
  - [x] 1.10 Set up ESLint and Prettier with consistent rules for the project

- [x] 2.0 Authentication and user management
  - [x] 2.1 Install NextAuth.js (`npm install next-auth`) and the Prisma adapter (`npm install @auth/prisma-adapter`)
  - [x] 2.2 Add the User, Account, Session, and VerificationToken models to `prisma/schema.prisma` as required by NextAuth; run `npx prisma migrate dev`
  - [x] 2.3 Create the NextAuth configuration in `lib/auth.ts` with the Credentials provider (email + password) and Prisma adapter
  - [x] 2.4 Create the NextAuth API route handler at `app/api/auth/[...nextauth]/route.ts`
  - [x] 2.5 Implement the sign-up page (`app/(auth)/signup/page.tsx`) with email and password fields, validation, and a "Create Account" button that creates the user in the database with a hashed password (bcrypt)
  - [x] 2.6 Implement the login page (`app/(auth)/login/page.tsx`) with email and password fields, validation, and error handling
  - [x] 2.7 Implement logout functionality (add a logout button in the authenticated layout navbar/sidebar)
  - [x] 2.8 Configure session persistence so sessions survive browser refreshes (use JWT or database strategy in NextAuth)
  - [x] 2.9 Create `middleware.ts` at the project root to protect all `/(main)` routes — redirect unauthenticated users to `/login`
  - [x] 2.10 Add a `user_id` foreign key to all data-bearing tables (sources, chunks, settings, evaluations) and ensure every database query filters by the authenticated user's ID
  - [x] 2.11 Write tests for sign-up (password hashing, duplicate email handling) and login (correct/incorrect credentials)

- [x] 3.0 Database schema and document processing pipeline
  - [x] 3.1 Define the `Source` model in Prisma schema with fields: `id`, `userId`, `title`, `sourceType` (enum: URL, PDF, WORD, MARKDOWN, TEXT), `sourceUrl`, `author`, `publicationDate`, `captureDate`, `content` (full extracted text), `metadata` (JSON)
  - [x] 3.2 Define the `Chunk` model in Prisma schema with fields: `id`, `sourceId`, `userId`, `content` (chunk text), `chunkIndex`, `embedding` (vector(1536) via pgvector), `embeddingModel` (string to track which model generated it), `tsvector` (for full-text search)
  - [x] 3.3 Run `npx prisma migrate dev` to apply the schema; manually add pgvector column type and GIN/HNSW indexes for vector similarity and full-text search via a raw SQL migration if Prisma doesn't natively support the vector type
  - [x] 3.4 Create the chunking service interface in `lib/services/chunking/chunking-service.ts` with a `ChunkingStrategy` interface (`chunk(text: string): string[]`) and a `RecursiveCharacterSplitter` implementation (500 chars, 50 char overlap)
  - [x] 3.5 Write tests for the chunking service — verify chunk sizes, overlap, edge cases (empty text, text shorter than chunk size, special characters)
  - [x] 3.6 Create the embedding service interface in `lib/services/embedding/embedding-service.ts` with an `EmbeddingProvider` interface (`embed(texts: string[]): Promise<number[][]>`, `modelId: string`, `dimensions: number`)
  - [x] 3.7 Implement the OpenAI embedding provider using `text-embedding-3-small` (1536 dimensions) with batched requests
  - [x] 3.8 Write tests for the embedding service (mock the OpenAI API; verify batching, error handling, model ID storage)
  - [x] 3.9 Create the document processing queue in `lib/services/processing/processing-queue.ts` — accept a source ID, chunk the content, generate embeddings, store chunks with embeddings in the database; update the source status (processing → ready → error)
  - [x] 3.10 Add a `status` field to the `Source` model (enum: PROCESSING, READY, ERROR) and a `processingProgress` field (0-100 integer) so the frontend can poll for progress
  - [x] 3.11 Create an API endpoint (`app/api/sources/[id]/status/route.ts`) that returns the processing status and progress for a given source
  - [x] 3.12 Write tests for the processing queue (mock chunking and embedding; verify chunk storage, status transitions, error handling)

- [x] 4.0 Content capture (URL, document upload, text paste)
  - [x] 4.1 Create the content capture UI component with three tabs: "URL", "Upload", and "Text" (`components/capture/`) using shadcn Tabs
  - [x] 4.2 Implement the URL capture form (`components/capture/url-capture-form.tsx`) with a URL input field, submit button, loading state, and error/warning display
  - [x] 4.3 Implement the URL ingestion API endpoint (`app/api/ingest/url/route.ts`): validate URL, fetch page, extract content using Mozilla Readability (install `@mozilla/readability` and `jsdom`), save source to DB, trigger processing pipeline
  - [x] 4.4 Add paywall detection logic in the URL extractor: if extracted content is >200 chars but less than expected, save with a "partial content" warning; if <200 chars, return an error message suggesting the user paste content directly, and surface the text paste tab as fallback
  - [x] 4.5 Write tests for URL extraction — mock HTTP responses for full articles, partial/paywall content, and failures
  - [x] 4.6 Implement the document upload form (`components/capture/document-upload-form.tsx`) with drag-and-drop or file picker, accepted formats display, file size validation, and progress indicator
  - [x] 4.7 Implement the document upload API endpoint (`app/api/ingest/upload/route.ts`): validate file type and size (PDF/Word ≤20MB, Markdown/Text ≤10MB), save file temporarily, extract text, save source to DB, trigger processing pipeline
  - [x] 4.8 Implement PDF extraction (`lib/services/extraction/pdf-extractor.ts`) using `pdf-parse`: extract text content, title, and author from document properties; handle multi-page documents
  - [x] 4.9 Implement Word extraction (`lib/services/extraction/word-extractor.ts`) using `mammoth`: extract text preserving structure (headings, paragraphs, lists), title, and author from document properties
  - [x] 4.10 Implement Markdown extraction (`lib/services/extraction/markdown-extractor.ts`): parse markdown to extract plain text and derive title from first heading or filename
  - [x] 4.11 Implement plain text extraction (`lib/services/extraction/text-extractor.ts`): read text content, derive title from filename
  - [x] 4.12 Write tests for each document extractor (PDF, Word, Markdown, Text) with sample files
  - [x] 4.13 Implement the text paste form (`components/capture/text-paste-form.tsx`) with a textarea, optional title and source URL fields, and submit button
  - [x] 4.14 Implement the text paste API endpoint (`app/api/ingest/text/route.ts`): accept raw text, optional title/URL, preserve formatting, save source to DB, trigger processing pipeline
  - [x] 4.15 Display appropriate error messages in the UI for unsupported formats, oversized files, extraction failures, and corrupted/password-protected documents
  - [x] 4.16 Show loading states with progress indication while content is being extracted and processed

- [x] 5.0 Knowledge base view
  - [x] 5.1 Create the knowledge base list page (`app/(main)/knowledge-base/page.tsx`) displaying all sources with title, source type icon/badge, and capture date
  - [x] 5.2 Create the source list API endpoint (`app/api/sources/route.ts` GET handler) returning all sources for the authenticated user, with pagination support
  - [x] 5.3 Implement sorting controls — allow sorting by capture date (newest first / oldest first)
  - [x] 5.4 Implement filter controls — allow filtering by source type (URL, PDF, Word, Markdown, Text) using a dropdown or chip selector
  - [x] 5.5 Create the source detail page (`app/(main)/knowledge-base/[id]/page.tsx`) showing the full extracted content, metadata (title, author, source URL, capture date, document type), and a delete button
  - [x] 5.6 Implement source deletion via the API (`app/api/sources/[id]/route.ts` DELETE handler) — cascade delete all associated chunks and embeddings; confirm deletion with a dialog in the UI
  - [x] 5.7 Add anchor IDs to chunk boundaries on the source detail page so that citation click-throughs can scroll to the relevant passage
  - [ ] 5.8 Write tests for the sources API (list with filters/sort, get by ID, delete cascade)

- [x] 6.0 Hybrid search (semantic + keyword with RRF)
  - [x] 6.1 Create the search input component (`components/search/search-input.tsx`) with a text input and search button, usable on the dashboard and search page
  - [x] 6.2 Implement semantic search (`lib/services/search/semantic-search.ts`): embed the query using the embedding service, then query pgvector for the top N chunks by cosine similarity (`<=>` operator), scoped by `user_id`
  - [x] 6.3 Implement keyword search (`lib/services/search/keyword-search.ts`): use PostgreSQL full-text search with `to_tsvector` and `plainto_tsquery`, rank results with `ts_rank`, scoped by `user_id`
  - [x] 6.4 Implement Reciprocal Rank Fusion (`lib/services/search/hybrid-search.ts`): take the ranked lists from semantic and keyword search, combine them using RRF with k=60, return the top 10 unique chunks
  - [x] 6.5 Write tests for RRF fusion logic — verify correct ranking when results overlap, when they don't overlap, and edge cases (empty results from one method)
  - [x] 6.6 Create the search API endpoint (`app/api/search/route.ts`): accept a query string, run hybrid search, return top 10 chunks with source metadata, relevance snippet, and combined score
  - [x] 6.7 Create the search results page (`app/(main)/search/page.tsx`) and results component (`components/search/search-results.tsx`): display each result with source title, relevance snippet (highlighted matching text), match score, and a link to the full source document
  - [x] 6.8 Implement the "no results" empty state on the search page with a helpful message suggesting different keywords or adding more sources

- [x] 7.0 Q&A with citations and LLM integration
  - [x] 7.1 Create the LLM provider abstraction (`lib/services/llm/provider.ts`): define an interface with `generateAnswer(prompt: string, context: string[], options: LLMOptions): AsyncIterable<string>` and `modelId`, `providerName` properties
  - [x] 7.2 Implement the OpenAI provider (`lib/services/llm/openai-provider.ts`): use the OpenAI SDK with streaming (`stream: true`), default to GPT-4o, parse `usage` from the response for token tracking
  - [x] 7.3 Implement the Anthropic provider (`lib/services/llm/anthropic-provider.ts`): use the Anthropic SDK with streaming, default to Claude 3.5 Sonnet, parse `usage` from the response for token tracking
  - [x] 7.4 Create a provider factory function that returns the correct provider based on user settings (selected provider + model + API key)
  - [x] 7.5 Write tests for the LLM provider abstraction (mock API calls; verify streaming, token usage parsing, error handling)
  - [x] 7.6 Create the Q&A API endpoint (`app/api/qa/route.ts`): accept a question, run hybrid search to retrieve relevant chunks, construct a prompt with the question and retrieved chunks as context (instructing the LLM to cite sources using [1], [2] notation), stream the response back
  - [x] 7.7 Create the Q&A interface page (`app/(main)/qa/page.tsx`) with a question input, a streaming answer display area, and a citations section below the answer
  - [x] 7.8 Implement the streaming answer display (`components/qa/answer-display.tsx`): render the streamed response in real-time, parse citation markers ([1], [2]) and render them as clickable elements
  - [x] 7.9 Implement the citations section (`components/qa/citation.tsx`): display cited sources at the document level (source title) by default; allow expanding each citation to reveal the specific chunk/passage that was used
  - [x] 7.10 Implement click-through from a citation to the source detail page (`/knowledge-base/[id]#chunk-[index]`), scrolling to the relevant passage
  - [x] 7.11 Handle the case where no relevant context is retrieved — display: "I couldn't find relevant sources to answer this question. Try adding more sources or rephrasing your question."
  - [x] 7.12 Log each Q&A interaction to the database (query, retrieved chunk IDs, generated answer, token usage, latency) for evaluation tracking

- [x] 8.0 Evaluation dashboard and metrics
  - [x] 8.1 Add an `Evaluation` model to Prisma schema with fields: `id`, `userId`, `queryId`, `query`, `retrievedChunkIds`, `answer`, `retrievalScores` (JSON array of per-chunk relevance 0-1), `groundednessScore` (0-1), `userFeedback` (enum: GOOD, BAD, null), `latencyMs`, `tokenUsage` (JSON: prompt_tokens, completion_tokens), `costUsd`, `createdAt`
  - [x] 8.2 Add a `QueryTestCase` model to Prisma schema with fields: `id`, `userId`, `query`, `queryType` (enum: FACTUAL, CROSS_SOURCE, SPECIFIC_RECALL, NEGATIVE), `goldenSourceIds` (array of source IDs), `createdAt`
  - [x] 8.3 Run `npx prisma migrate dev` to apply evaluation schema changes
  - [x] 8.4 Implement retrieval accuracy scoring (`lib/services/evaluation/retrieval-accuracy.ts`): send the query and retrieved chunks to an LLM asking "Are these sources relevant to the query?" — return a 0-1 relevance score for each chunk
  - [x] 8.5 Implement groundedness scoring (`lib/services/evaluation/groundedness.ts`): send the generated answer and cited passages to an LLM asking "Is each claim in the answer supported by the provided sources?" — return a 0-1 groundedness score
  - [x] 8.6 Integrate evaluation scoring into the Q&A flow — after generating an answer, asynchronously run retrieval accuracy and groundedness scoring and save to the Evaluation record
  - [x] 8.7 Implement cost tracking (`lib/services/evaluation/cost-tracker.ts`): parse `prompt_tokens` and `completion_tokens` from LLM API responses, multiply by configurable per-token pricing for each provider/model, and save to the Evaluation record
  - [x] 8.8 Write tests for cost tracking calculations (verify correct cost per provider/model, edge cases)
  - [x] 8.9 Create the evaluation metrics API (`app/api/evaluation/metrics/route.ts`): return average retrieval accuracy, average groundedness, average latency, total cost, and trend data for the last 7 and 30 days
  - [x] 8.10 Create the evaluation dashboard page (`app/(main)/evaluation/page.tsx`): display current retrieval accuracy %, groundedness %, average latency, and cost metrics as summary cards
  - [x] 8.11 Implement the metrics history chart (`components/evaluation/metrics-chart.tsx`): show retrieval accuracy and groundedness trends over time with 7-day and 30-day toggles (use a charting library like Recharts)
  - [x] 8.12 Implement user feedback on answers — add "Good" / "Bad" buttons on the Q&A answer display, save feedback via `app/api/evaluation/feedback/route.ts`
  - [x] 8.13 Implement manual relevance override — on the evaluation dashboard or Q&A results, allow users to mark individual retrieved sources as relevant/irrelevant, updating the retrieval scores
  - [x] 8.14 Create the test suite management UI (`components/evaluation/test-suite-runner.tsx`): allow viewing the curated test set (20-30 queries with golden sources), running the test set, and displaying pass/fail results
  - [x] 8.15 Implement the test suite runner API (`app/api/evaluation/test-suite/route.ts`): iterate through test queries, run hybrid search for each, compare retrieved sources against golden sources, return pass/fail per query and overall metrics
  - [x] 8.16 Seed an initial test set of 20-30 queries covering factual retrieval (5-8), cross-source synthesis (8-10), specific source recall (5-7), and negative/boundary cases (3-5), each with 2-5 golden source IDs (to be populated once real sources are ingested)

- [x] 9.0 Settings page (API keys, LLM provider selection)
  - [x] 9.1 Add a `UserSettings` model to Prisma schema with fields: `id`, `userId`, `openaiApiKey` (encrypted string), `anthropicApiKey` (encrypted string), `defaultProvider` (enum: OPENAI, ANTHROPIC), `defaultModel` (string), `dailyCostThreshold` (decimal, default 2.00); run migration
  - [x] 9.2 Implement the encryption utility (`lib/services/encryption.ts`): encrypt and decrypt API keys using AES-256-GCM with a server-side secret from environment variables
  - [x] 9.3 Write tests for the encryption utility (encrypt → decrypt roundtrip, different keys produce different ciphertext)
  - [x] 9.4 Create the settings page (`app/(main)/settings/page.tsx`) with sections for: OpenAI API key, Anthropic API key, default LLM provider, preferred model selection, and daily cost threshold
  - [x] 9.5 Implement the API key validation endpoint (`app/api/settings/validate-key/route.ts`): make a minimal test request to the OpenAI or Anthropic API to verify the key works; return success or descriptive error message
  - [x] 9.6 Implement the settings CRUD API (`app/api/settings/route.ts`): GET (return settings with masked API keys), PUT (validate keys, encrypt, and save)
  - [x] 9.7 Wire the settings form to validate API keys on save (show inline success/error messages), save encrypted keys, and update provider/model selection
  - [x] 9.8 Implement model selection dropdown that shows available models per provider (e.g., GPT-4o, GPT-4-turbo for OpenAI; Claude 3.5 Sonnet, Claude 3 Opus for Anthropic)
  - [x] 9.9 Write tests for the settings API (save, retrieve with masked keys, validation)

- [x] 10.0 Onboarding flow
  - [x] 10.1 Add an `onboardingCompleted` boolean field to the User model (default `false`); run migration
  - [x] 10.2 Implement first-time user detection: check `onboardingCompleted` on login/dashboard load; if `false`, display the onboarding overlay/modal
  - [x] 10.3 Create the onboarding flow controller (`components/onboarding/onboarding-flow.tsx`): manage step progression (1→2→3→4), skip button on every step, and progress indicator
  - [x] 10.4 Create Step 1 — Welcome (`components/onboarding/welcome-step.tsx`): display a one-sentence value prop ("Transform your reading into a searchable, synthesizable knowledge base") and a "Get Started" button
  - [x] 10.5 Create Step 2 — First Capture (`components/onboarding/capture-step.tsx`): guide the user to paste a URL (provide a suggested article URL as a placeholder/default), show the ingestion pipeline working in real-time with loading state
  - [x] 10.6 Create Step 3 — First Query (`components/onboarding/query-step.tsx`): after ingestion completes, prompt the user to ask a question about the article (suggest an example question), show the Q&A response with citations
  - [x] 10.7 Create Step 4 — Explore (`components/onboarding/explore-step.tsx`): highlight the Knowledge Base and Evaluation Dashboard in the navigation, provide brief descriptions, and a "Finish" button
  - [x] 10.8 On completion or skip, set `onboardingCompleted = true` via an API call and dismiss the onboarding UI; never show again
  - [x] 10.9 Write tests for onboarding flow logic (step progression, skip behavior, completion persistence)

- [x] 11.0 UI polish, responsive design, and empty states
  - [x] 11.1 Implement light and dark mode toggle using shadcn/ui theme provider (next-themes); persist preference in localStorage
  - [x] 11.2 Define a consistent design system: typography scale, color tokens, spacing scale, and component styles using Tailwind CSS config
  - [x] 11.3 Create the reusable empty state component (`components/shared/empty-state.tsx`): icon, title, description, and call-to-action button
  - [x] 11.4 Implement the knowledge base empty state: "No sources yet. Add your first article, document, or text to get started." with a CTA linking to the capture UI
  - [x] 11.5 Implement the search empty state: "No results found. Try different keywords or add more sources to your knowledge base."
  - [x] 11.6 Implement the Q&A empty state (no relevant context): "I couldn't find relevant sources to answer this question. Try adding more sources or rephrasing your question."
  - [x] 11.7 Implement mobile-first responsive layouts for all pages — use Tailwind responsive breakpoints (`sm`, `md`, `lg`, `xl`); ensure sidebar collapses to a hamburger menu on mobile
  - [x] 11.8 Test responsive layouts on major desktop browsers (Chrome, Firefox, Safari, Edge) and at tablet/mobile viewport sizes
  - [x] 11.9 Implement rate limiting middleware (`lib/rate-limit.ts`): ingestion — 50 docs/hour, 200/day; search/Q&A — 30/min, 500/day; display clear rate limit error messages in the UI
  - [x] 11.10 Implement soft budget warning: when estimated daily costs exceed the configurable threshold (default $2/day), display a non-blocking warning banner on the Q&A page
  - [x] 11.11 Create the Dashboard/Home page (`app/(main)/page.tsx`) with quick capture input, recent sources list, and search bar
  - [x] 11.12 Final end-to-end testing pass: capture a URL, upload a PDF, paste text, search across all sources, ask a Q&A question with citations, check evaluation metrics, verify settings, and run through onboarding flow
