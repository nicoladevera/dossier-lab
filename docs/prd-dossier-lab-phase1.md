# PRD: Dossier Lab — Phase 1 (Core RAG + Evaluation)

## 1. Introduction/Overview

Dossier Lab is a personal intelligence tool that transforms your reading into a searchable, synthesizable knowledge base. Users capture content from articles, documents (PDFs, Word, Markdown, text files), and raw text, which gets automatically indexed and embedded. They can then search semantically across all their sources, ask questions that synthesize information, and receive source-grounded answers with citations.

**The Problem:** People consume vast amounts of information daily—newsletters, articles, PDFs, documents—but this knowledge disappears into scattered locations. When they need to synthesize insights or make decisions, they start from scratch.

**The Solution:** Dossier Lab automatically indexes everything you read into a personal knowledge base with hybrid search (semantic + keyword), natural language Q&A with citations, and built-in evaluation infrastructure to measure and improve system quality.

This PRD covers **Phase 1**: establishing the core RAG pipeline, hybrid search, Q&A with citations, and the evaluation dashboard.

---

## 2. Goals

1. **Enable content capture** — Users can add URLs, documents (PDF, Word, Markdown, text files), and raw text to their personal knowledge base with minimal friction.
2. **Provide intelligent search** — Users can find relevant sources using hybrid search (semantic + keyword) even when they don't remember exact phrases.
3. **Deliver source-grounded Q&A** — Users can ask natural language questions and receive answers with citations to specific sources.
4. **Build trust through evaluation** — Users can see retrieval accuracy and groundedness metrics, understanding when to trust AI answers.
5. **Establish technical foundation** — Create a production-grade RAG system with evaluation infrastructure that enables iterative improvement.

---

## 3. User Stories

### Content Capture
- **US-1:** As a user, I want to paste a URL so that the article content is automatically extracted and added to my knowledge base.
- **US-2:** As a user, I want to upload documents (PDF, Word, Markdown, text files) so that their contents are extracted and searchable.
- **US-3:** As a user, I want to paste raw text so that I can capture content from any source (social posts, notes, etc.).
- **US-4:** As a user, I want to see my captured sources in a list so that I can browse what's in my knowledge base.
- **US-5:** As a user, I want to view a source's full content and metadata so that I can review what was captured.

### Search
- **US-6:** As a user, I want to search my knowledge base using natural language so that I can find relevant sources by meaning, not just keywords.
- **US-7:** As a user, I want search results ranked by relevance so that the most useful sources appear first.
- **US-8:** As a user, I want to see snippets from matching sources so that I can quickly assess relevance without opening each one.

### Q&A with Citations
- **US-9:** As a user, I want to ask questions about my knowledge base so that I can synthesize information across sources.
- **US-10:** As a user, I want answers to include citations to specific sources so that I can verify the information.
- **US-11:** As a user, I want to click a citation and see the relevant passage in context so that I can read the original source.

### Evaluation Dashboard
- **US-12:** As a user, I want to see retrieval accuracy metrics so that I understand how well the system finds relevant sources.
- **US-13:** As a user, I want to see groundedness scores so that I know when answers are well-supported by my sources.
- **US-14:** As a user, I want to track system performance over time so that I can see if quality is improving or degrading.

### Onboarding
- **US-15:** As a new user, I want a guided first-run experience so that I understand how to use the app and see value immediately.
- **US-16:** As a new user, I want to see a preview of the capture and Q&A features during onboarding so that I understand what the app does before setting up my API key.

### Authentication & Data
- **US-17:** As a user, I want to create an account so that my knowledge base is saved and accessible from any device.
- **US-18:** As a user, I want to log in securely so that only I can access my personal knowledge base.

---

## 4. Functional Requirements

### 4.1 Authentication & User Management
1. The system must allow users to create an account with email and password.
2. The system must allow users to log in and log out.
3. The system must persist user sessions across browser refreshes.
4. The system must isolate each user's knowledge base (users cannot see other users' data).

### 4.2 Content Capture — URL Ingestion
5. The system must accept a URL input from the user.
6. The system must extract the main content from the URL (article text, title, author, publication date).
7. The system must handle common article formats (news sites, blogs, Medium, Substack).
8. The system must display an error message if content extraction fails.
9. The system must show a loading state while content is being extracted.
10. If extraction returns partial content (>200 characters but less than expected), the system must save the content with a visible warning: "Partial content extracted — some content may be behind a paywall."
11. If extraction returns minimal content (<200 characters or only a headline/teaser), the system must display a clear message: "This article appears to be behind a paywall. Try pasting the content directly instead." and surface the text paste option as a fallback.

### 4.3 Content Capture — Document Upload
12. The system must accept document file uploads with the following formats and limits:
    - **PDF:** Max 20MB
    - **Markdown (.md, .markdown):** Max 10MB
    - **Microsoft Word (.doc, .docx):** Max 20MB
    - **Plain text (.txt):** Max 10MB
13. The system must extract text content from uploaded documents, preserving structure where possible (headings, paragraphs, lists).
14. The system must extract metadata when available:
    - **PDF:** Title, author from document properties
    - **Word documents:** Title, author from document properties
    - **Markdown/Text:** Derive title from first heading or filename
15. The system must handle multi-page documents (PDFs, Word docs).
16. The system must display a clear error message if:
    - File format is unsupported
    - File exceeds size limit
    - Document extraction fails (corrupted file, password-protected, etc.)
17. The system must show a loading state during document processing with progress indication for large files.

### 4.4 Content Capture — Text Paste
18. The system must accept raw text input via a text field.
19. The system must allow users to optionally add a title and source URL for pasted text.
20. The system must preserve text formatting (paragraphs, line breaks).

### 4.5 Document Processing Pipeline
21. The system must chunk documents using recursive character splitting (500 characters, 50 character overlap). The chunking strategy should be abstracted behind an interface so it can be swapped (e.g., to semantic/paragraph-based chunking) based on evaluation metrics without architectural changes.
22. The system must generate embeddings for each chunk using OpenAI text-embedding-3-small (1536 dimensions).
23. The system must abstract the embedding provider behind a configurable interface (model name, dimensions, embed function) to support future model switching (e.g., text-embedding-3-large, third-party models).
24. The system must store the embedding model identifier alongside each chunk so that embeddings from different models can coexist during migration.
25. The system must store chunks and embeddings in pgvector (PostgreSQL).
26. The system must store document metadata (title, author, source URL, capture date, document type).
27. The system must process documents asynchronously and show progress to the user.

### 4.6 Knowledge Base View
28. The system must display a list of all captured sources with title, source type, and capture date.
29. The system must allow users to sort sources by date (newest/oldest).
30. The system must allow users to filter sources by type (URL, PDF, Word, Markdown, Text).
31. The system must allow users to view a source's full content and metadata.
32. The system must allow users to delete a source (and its associated chunks/embeddings).

### 4.7 Hybrid Search
33. The system must provide a search input field.
34. The system must perform semantic search using vector similarity (cosine distance).
35. The system must perform keyword search using PostgreSQL full-text search (BM25-style ranking).
36. The system must combine semantic and keyword results using Reciprocal Rank Fusion (RRF) with k=60.
37. The system must return the top 10 most relevant source chunks.
38. The system must display search results with source title, relevance snippet, and match score.
39. The system must link search results to the full source document.

### 4.8 Q&A with Citations
40. The system must provide a question input field.
41. The system must retrieve relevant chunks based on the question (using hybrid search).
42. The system must send retrieved chunks as context to the LLM.
43. The system must support OpenAI (GPT-4o) and Anthropic (Claude 3.5 Sonnet) as LLM providers.
44. The system must allow users to select their preferred LLM provider and model in settings.
45. The system must generate answers that cite specific sources at the chunk level internally for precision.
46. The system must format citations as clickable references (e.g., [1], [2]).
47. The system must display cited sources below the answer at the document level by default, showing the source title.
48. The system must allow users to expand a citation to reveal the specific passage (chunk) that was used, highlighted within the broader document context.
49. The system must allow users to click through from a citation to the full source detail view, scrolled to the relevant passage.
50. The system must stream the LLM response to show progress.

### 4.9 Evaluation Dashboard
51. The system must track retrieval accuracy for each query using an LLM-as-judge approach: send the query and retrieved chunks to an LLM asking "Are these sources relevant to the query?" and score relevance 0-1 for each chunk.
52. The system must allow users to manually override relevance scores by marking retrieved sources as relevant/irrelevant for a query.
53. The system must calculate groundedness scores using an LLM-as-judge approach: send the generated answer and cited passages to an LLM asking "Is each claim in the answer supported by the provided sources?" and return a 0-1 groundedness score.
54. The system must display current retrieval accuracy as a percentage (average relevance across recent queries).
55. The system must display current groundedness score as a percentage (average across recent answers).
56. The system must show a history chart of metrics over time (last 7 days, 30 days).
56a. The system should show evaluation health coverage over time (percentage of queries with retrieval/groundedness scoring populated), including missing-score visibility.
56b. The system should support one-time backfilling of historical evaluation rows missing retrieval or groundedness scores.
56c. The system should show operational trends over time (daily query volume, average latency, and daily cost).
57. The system must track query latency (time from question to answer).
58. The system must track actual cost per query by parsing token usage from API responses (prompt_tokens, completion_tokens) and multiplying by configurable per-token pricing for each provider.
59. The system must allow users to mark answers as "good" or "bad" for feedback.
60. The system must support a curated test set of 20-30 queries with golden source documents for regression testing. The test set should be developer-created from real ingested sources and cover a mix of query types:
    - **Factual retrieval** (5-8 queries): Single-source lookups for specific facts.
    - **Cross-source synthesis** (8-10 queries): Questions requiring information from multiple sources.
    - **Specific source recall** (5-7 queries): Questions targeting a known article/document.
    - **Negative/boundary cases** (3-5 queries): Questions where the knowledge base has no relevant answer.
    - Each query should have 2-5 manually tagged golden source documents.
61. The system must allow running the test set and displaying pass/fail results (comparing retrieved sources against golden sources).

### 4.10 Settings
62. The system must allow users to configure their OpenAI API key.
63. The system must allow users to configure their Anthropic API key.
64. The system must validate API keys on save by making a test request to verify they work, displaying success or error messages.
65. The system must allow users to select their default LLM provider (OpenAI or Anthropic).
66. The system must allow users to select their preferred model within each provider (e.g., GPT-4o, GPT-4-turbo for OpenAI; Claude 3.5 Sonnet, Claude 3 Opus for Anthropic).
67. The system must securely store API keys (encrypted at rest).

### 4.11 Onboarding Flow
68. The system must detect first-time users and present a minimal guided onboarding tour (4 steps).
69. **Step 1 — Welcome:** Display a one-sentence value prop and invite the user to take a tour of the features.
70. **Step 2 — Capture Preview:** Show a visual preview of the content capture feature with a mock URL example, explaining how content is extracted and indexed. No actual API calls are made.
71. **Step 3 — Q&A Preview:** Show a visual preview of the Q&A feature with a mock question and AI-generated answer example. No actual API calls are made.
72. **Step 4 — Get Started:** Direct the user to configure their API key in Settings as the first step, then highlight the Knowledge Base and Evaluation Dashboard features.
73. The system must allow users to skip the onboarding tour at any step.
74. The system must not show onboarding again once completed or skipped.
75. The onboarding tour must be non-interactive (preview-only) since users have not yet configured their API keys.

### 4.12 Responsive Design
75. The system must be usable on desktop browsers (Chrome, Firefox, Safari, Edge).
76. The system must be responsive and usable on tablet and mobile devices.
77. The system must adapt layout for different screen sizes (mobile-first approach).

### 4.13 Empty State Handling
78. The system must display a helpful empty state when the knowledge base contains zero sources, prompting the user to add their first source with clear call-to-action.
79. The system must display an appropriate message when search returns no results, suggesting the user try different keywords or add more sources.
80. The system must handle Q&A queries where no relevant context is retrieved by displaying: "I couldn't find relevant sources to answer this question. Try adding more sources or rephrasing your question."

---

## 5. Non-Goals (Out of Scope)

The following are explicitly **not** included in Phase 1:

1. **Conversational memory for Q&A** — Context-aware follow-up reasoning across prior turns remains out of scope. (Persistent thread/message history is implemented, but each turn is answered independently.)
2. **Password reset/forgot password flow** — Users must contact support or recreate account if password is lost. Full password reset via email will be added post-launch.
3. **YouTube video transcripts** — Planned for Phase 4.
4. **Email forwarding ingestion** — Planned for Phase 3.
5. **Browser extension** — Planned for Phase 3.
6. **Research brief generation** — Planned for Phase 2 (Intelligence Workbench).
7. **Topic summaries and comparative analyses** — Planned for Phase 2.
8. **Dossier organization (topic collections)** — Future enhancement.
9. **Source tagging** — Future enhancement.
10. **Multi-user collaboration/sharing** — Future consideration.
11. **Audio transcription** — Planned for Phase 4.
12. **Offline mode** — Not planned.
13. **Native mobile apps** — Web responsive only for v1.

---

## 6. Design Considerations

### 6.1 UI/UX Principles
- **Clean, minimal interface** — Focus on content, reduce visual clutter.
- **Progressive disclosure** — Show advanced features (evaluation dashboard) to users who want them, don't overwhelm new users.
- **Mobile-first responsive** — Design for mobile, enhance for desktop.
- **Fast feedback** — Show loading states, stream responses, provide progress indicators.

### 6.2 Key Screens
1. **Onboarding (first-run only)** — 3-4 step guided flow: welcome, first capture, first query, explore.
2. **Dashboard/Home** — Quick capture input, recent sources, search bar.
3. **Knowledge Base** — List of all sources with filtering/sorting.
4. **Source Detail** — Full content view with metadata. Citations link here, scrolled to the relevant passage.
5. **Search Results** — Ranked results with snippets.
6. **Q&A Interface** — Question input, streaming answer with citations, thread history sidebar, and per-thread deletion. Citations show document-level by default, expandable to reveal the specific passage used.
7. **Evaluation Dashboard** — Metrics charts, test suite results, cost tracking.
8. **Settings** — API keys, LLM provider selection, daily cost threshold.

### 6.3 Design System
- Use a modern component library (e.g., shadcn/ui, Radix) for consistency.
- Support light and dark mode.
- Use clear typography hierarchy for readability.

---

## 7. Technical Considerations

### 7.1 Architecture Overview
- **Frontend:** Next.js (React) with TypeScript
- **Backend:** Next.js API routes or separate Node.js service
- **Database:** PostgreSQL with pgvector extension
- **Authentication:** NextAuth.js or similar
- **Deployment:** Vercel (frontend) + managed PostgreSQL (Supabase, Neon, or Railway)

### 7.2 Key Technical Decisions
- **Vector Database:** pgvector for unified storage (documents, embeddings, metadata in one place).
- **Chunking:** Recursive character splitting, 500 chars with 50 char overlap. Abstracted behind an interface for future strategy swaps (e.g., semantic/paragraph chunking) driven by evaluation metrics.
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions) as default. Abstracted behind a provider interface with model identifier stored per chunk, enabling incremental model migration.
- **Hybrid Search:** Combine pgvector cosine similarity with PostgreSQL ts_rank. Use RRF (k=60) to merge results.
- **LLM Integration:** Abstract LLM calls behind a provider interface to support OpenAI (default: GPT-4o) and Anthropic (default: Claude 3.5 Sonnet).
- **Evaluation:** LLM-as-judge approach for both retrieval accuracy and groundedness scoring, with manual user override capability.
- **Cost Tracking:** Parse actual token usage from API responses (not estimates) with configurable per-token pricing per provider.

### 7.3 Dependencies
- **Content extraction:** 
  - URLs: Mozilla Readability or similar article extraction library
  - PDFs: pdfjs-dist (pdf.js)
  - Word documents (.doc, .docx): mammoth.js or docx library
  - Markdown (.md): markdown-it or remark for parsing
  - Text files (.txt): Native Node.js fs module
- **LLM SDKs:** OpenAI SDK, Anthropic SDK.
- **Vector search:** pgvector PostgreSQL extension.

### 7.4 Security & Rate Limiting
- API keys stored encrypted (use environment variables + encryption at rest).
- User data isolated by user_id on all queries.
- Input sanitization for all user-provided content.
- Rate limiting on ingestion and query endpoints:
  - **Ingestion:** 50 documents per hour, 200 per day.
  - **Search/Q&A:** 30 queries per minute, 500 per day.
  - **LLM calls:** Match query rate; display a soft budget warning when estimated daily costs exceed a configurable threshold (default $2/day).
- These limits are designed to protect against bugs and runaway costs rather than abuse, since the system is single-user with authentication. Tighten as needed post-launch based on usage data.

### 7.5 Performance Considerations
- Async document processing with job queue (consider BullMQ or similar).
- Embedding generation batched where possible.
- Search queries should return in <500ms for typical knowledge base sizes (<10,000 chunks).
- LLM responses streamed for perceived performance.

---

## 8. Success Metrics

### 8.1 Functional Success (Launch Criteria)
- [ ] Users can capture URLs, documents (PDF, Word, Markdown, text), and raw text successfully (>95% success rate for common formats).
- [ ] Hybrid search returns relevant results (subjective testing with 20+ queries).
- [ ] Q&A generates answers with accurate citations (citations link to correct source passages).
- [ ] Evaluation dashboard displays meaningful metrics.
- [ ] System handles 1,000+ documents per user without degradation.

### 8.2 Quality Metrics (Ongoing)
- **Retrieval Precision@5:** >70% of top 5 results are relevant to the query.
- **Groundedness Score:** >85% of claims in answers are supported by cited sources.
- **Query Latency:** <3 seconds for search, <10 seconds for Q&A (excluding LLM streaming).
- **Ingestion Success Rate:** >95% for URLs from major publishers, >99% for PDFs.

### 8.3 User Engagement (Post-Launch)
- Users add at least 10 sources in their first week.
- Users perform at least 5 searches or questions per week.
- Users return to the app at least 3 times per week.

---

## 9. Resolved Decisions

The following questions were raised during PRD review and have been resolved. Decisions are reflected in the relevant sections above.

| # | Question | Decision | PRD Section |
|---|----------|----------|-------------|
| 1 | **Chunking strategy** — Semantic vs. fixed character splitting? | Start with fixed recursive character splitting (500 chars, 50 overlap). Abstract behind an interface so it can be swapped based on evaluation metrics. Let data drive the decision. | 4.5 (Req 21) |
| 2 | **Embedding model upgrade path** — Plan for model switching? | Yes. Abstract embedding provider behind a configurable interface. Store model identifier alongside each chunk for incremental migration. | 4.5 (Reqs 23-24) |
| 3 | **Rate limiting** — Specific limits? | Ingestion: 50 docs/hr, 200/day. Search/Q&A: 30/min, 500/day. Soft cost budget warning at configurable daily threshold (default $2/day). | 7.4 |
| 4 | **Test set creation** — Who creates it and what topics? | Developer-created from real ingested sources. Mix of factual retrieval (5-8), cross-source synthesis (8-10), specific source recall (5-7), and negative/boundary cases (3-5). 2-5 golden docs per query. | 4.9 (Req 60) |
| 5 | **Paywalled content** — How to handle? | Extract what's available. >200 chars: save with "partial content" warning. <200 chars: clear paywall error with text paste fallback surfaced. No paywall circumvention. | 4.2 (Reqs 10-11) |
| 6 | **Citation granularity** — Chunk vs. document level? | Chunk-level internally for precision and evaluation. Document-level in the UI by default, expandable to show the specific passage. Click-through to full source scrolled to relevant passage. | 4.8 (Reqs 45-49) |
| 7 | **Cost tracking** — Actual vs. estimated? | Actual costs parsed from API response token usage (prompt_tokens, completion_tokens) multiplied by configurable per-token pricing. | 4.9 (Req 58) |
| 8 | **Onboarding flow** — Include one? | Yes, minimal 3-4 step first-run: welcome, first capture (guided URL paste), first query, explore. Skippable. Not shown again once completed. | 4.11 (Reqs 68-74) |
| 9 | **Retrieval accuracy calculation** — How to measure? | LLM-as-judge approach: send query + retrieved chunks to LLM for relevance scoring. Allow manual user overrides. | 4.9 (Reqs 51-52) |
| 10 | **Groundedness calculation** — How to measure? | LLM-as-judge approach: send answer + cited passages to LLM asking if claims are supported by sources. Returns 0-1 score. | 4.9 (Req 53) |
| 11 | **Which LLM models** — Specific model versions? | OpenAI: GPT-4o (default). Anthropic: Claude 3.5 Sonnet (default). Users can select alternative models in settings. | 4.8 (Reqs 43-44), 4.10 (Req 66) |
| 12 | **API key validation** — Validate on save? | Yes. Make test request to verify key works before saving. Display success/error message. | 4.10 (Req 64) |
| 13 | **RRF parameters** — What k value? | k=60 (standard RRF parameter). | 4.7 (Req 36) |

---

## Appendix: Glossary

- **Chunk:** A segment of a document, typically 500 characters, used for embedding and retrieval.
- **Embedding:** A vector representation of text that captures semantic meaning.
- **Hybrid Search:** Combining semantic (vector) search with keyword (BM25) search for better results.
- **RRF (Reciprocal Rank Fusion):** A method to combine multiple ranked lists into a single ranking.
- **Groundedness:** A measure of whether an AI-generated answer is supported by the provided source documents.
- **RAG (Retrieval-Augmented Generation):** An AI architecture that retrieves relevant documents and uses them as context for generating answers.
- **pgvector:** A PostgreSQL extension that enables vector similarity search.
