# DOSSIER LAB — Project Brief

---

## Executive Summary

Dossier Lab helps you build personal intelligence from everything you read.

It automatically indexes articles, PDFs, and videos into a searchable knowledge base, then helps you synthesize insights, generate research briefs, and answer questions—all grounded in citations from YOUR sources.

This is both a daily-use productivity tool and a portfolio-quality RAG system with built-in evaluation infrastructure.

---

## The Problem

You read constantly—newsletters, articles, PDFs, videos, social posts—and consume valuable information every day.

But that knowledge disappears into scattered inboxes, bookmarks, and browser tabs.

When you need to synthesize information, compare viewpoints, or make decisions based on what you've learned, you're starting from scratch every time.

You don't lack information. You lack a system that turns your reading into usable personal intelligence.

---

## The Solution

Dossier Lab transforms your reading into personal intelligence.

Everything you read gets automatically indexed into your knowledge base. You can search across all your sources semantically, ask questions that synthesize across them, and generate intelligence briefs—with every answer grounded in citations you can verify.

You build dossiers—collections of sources on topics you care about—and Dossier Lab helps you search them, analyze them, and synthesize them into actionable insights.

---

## Core User Workflow

### 1. Capture sources
- Paste article URLs
- Upload PDFs  
- Paste text from anywhere
- (Later: YouTube videos, email forwarding)

### 2. Automatic indexing
Every source gets chunked, embedded, and added to your personal knowledge base. No manual organization required.

### 3. Search your intelligence
Semantic + keyword hybrid search finds relevant sources instantly, even when you don't remember exact phrases. Filter by date, author, or topic.

### 4. Ask questions
"What have I learned about RAG evaluation methods?"
"What patterns exist across these sources on AI adoption?"
"Compare the viewpoints in my reading this month."

Every answer cites specific sources from YOUR knowledge base.

### 5. Generate intelligence outputs
- Research briefs
- Comparative analyses  
- Decision memos
- Weekly intelligence summaries

Your reading becomes reusable intelligence.

---

## The Technical Differentiator: Evaluation

Most RAG systems feel like they work. Dossier Lab measures whether they actually work.

Built-in evaluation infrastructure tracks:

**Retrieval accuracy:** Did we fetch the right sources for this query?

**Groundedness:** Does the answer cite only real evidence from retrieved documents?

**Regression testing:** Did system changes improve or degrade performance?

This transforms the app from a productivity tool into an AI experimentation lab. You can see exactly how well the system is working and optimize it over time.

---

## Core Features

### Intelligence Capture
- URL paste
- PDF upload
- Text paste
- (Phase 2: YouTube transcripts, email forwarding)

### Personal Knowledge Base
- Document viewer with metadata
- Hybrid search (semantic + keyword)
- Source filtering and tagging
- Dossier organization by topic

### Intelligence Synthesis
- Natural language queries across your knowledge base
- Source-grounded responses with citations
- Cross-source pattern discovery
- Evidence extraction

### Intelligence Workbench
- Generate research briefs from source collections
- Create comparative analyses across viewpoints
- Produce topic summaries
- Generate weekly intelligence digests

### Evaluation Dashboard
- Retrieval accuracy metrics
- Groundedness scoring
- Regression test suite
- Cost and latency tracking
- Citation quality analysis

---

## Value Proposition

**Build personal intelligence**
Transform your reading into a growing knowledge base that becomes more valuable over time.

**Search semantically**
Find relevant sources by meaning, not just keywords—across everything you've ever read.

**Synthesize faster**
Generate intelligence briefs and comparative analyses in minutes instead of hours.

**Trust through evaluation**
Built-in metrics show you exactly how well the system is working, so you know when to trust the AI and when to read the sources yourself.

---

## Target User

Product managers, builders, researchers, writers, and lifelong learners who consume large amounts of information and need to synthesize it into actionable insights.

Early version: Personal tool for individual knowledge management, potentially shareable later.

---

## Positioning Statement

For people who read and research constantly, Dossier Lab transforms everything you learn into personal intelligence—a searchable, synthesizable knowledge base with built-in evaluation so you can trust the insights it generates.

---

## Tagline Options

- Build personal intelligence from everything you read
- Your knowledge base, intelligently synthesized
- Turn reading into intelligence
- Evidence-backed insights from your knowledge

---

## Why This Is a Strong Portfolio Project

Demonstrates real technical depth:
- **RAG architecture:** Chunking strategies, embedding models, hybrid search implementation
- **Evaluation infrastructure:** The hardest part to get right—retrieval metrics, groundedness scoring, regression testing
- **Production AI systems:** Cost/quality tradeoffs, latency optimization, real-world deployment
- **AI product thinking:** Building for trust, not just functionality

This shows you can build production-grade AI systems with measurable quality, not just prototype demos.

---

## Development Timeline
(with AI coding agents)

### Phase 1 (3-4 weeks): Core RAG + Evaluation
- URL/PDF ingestion pipeline
- Chunking and embedding infrastructure
- Hybrid search (semantic + keyword)
- Q&A with source citations
- Basic evaluation framework with test dataset

### Phase 2 (2 weeks): Intelligence Workbench  
- Research brief generation
- Topic summaries
- Cross-source synthesis
- Comparative analysis outputs

### Phase 3 (2-3 weeks): Capture Friction Reduction
- Email forwarding
- Browser extension (optional)
- Batch upload improvements

### Phase 4 (2-3 weeks): Media Expansion
- YouTube transcript integration
- Audio transcription
- Video content indexing

**Total: 9-12 weeks to full v1**

---

## Technical Architecture Decisions

**Vector Database:** pgvector (Postgres extension) for unified storage and hybrid search

**Chunking Strategy:** Start with recursive character splitting (500 chars, 50 char overlap), iterate based on retrieval metrics

**Embedding Model:** OpenAI text-embedding-3-small (balance of cost and quality)

**Evaluation Approach:** Hand-curated test set of 20-30 queries with golden source documents, measure retrieval precision and answer groundedness

**Hybrid Search:** BM25 keyword search + vector semantic search with reciprocal rank fusion

---
