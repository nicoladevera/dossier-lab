# PRD: YouTube Capture + Source Type Filtering (Phase 2)

---

## 1. Introduction / Overview

Phase 2 expands Dossier Lab's ingestion pipeline to support **YouTube videos** — one of the highest-friction content sources for daily use. Today, users must manually paste article URLs or upload files. A large portion of real-world knowledge consumption happens through YouTube, but there's no way to capture that content without copy-pasting transcript text.

This phase adds:

- **YouTube URL ingestion** — paste a YouTube link, automatically extract the transcript and video metadata
- **Source type filtering** — filter the knowledge base by source type (article, PDF, video, etc.)

---

## 2. Goals

1. **Reduce capture friction** for YouTube content so users can build their knowledge base from daily video consumption
2. **Maintain parity** with existing ingestion quality — YouTube sources should be chunked, embedded, and searchable just like URLs and PDFs
3. **Add source type awareness** to the UI so users can browse and filter their growing, multi-format knowledge base
4. **Follow existing architecture patterns** — the new extractor plugs into the established pipeline (extract → chunk → embed → store)

---

## 3. User Stories

### YouTube Capture

- **As a user**, I want to paste a YouTube URL and have the video's transcript automatically extracted and indexed, so I can search and ask questions about video content alongside my other sources.
- **As a user**, I want to see video metadata (title, channel name, description, duration) stored with the source, so I have context when reviewing citations.
- **As a user**, I want to see a thumbnail or video preview on the source detail page, so I can visually identify which video a source refers to.

### Source Type Filtering

- **As a user**, I want to filter my knowledge base by source type (URL, PDF, Video, etc.), so I can quickly find sources from a specific medium.
- **As a user**, I want each source to display a type icon/badge, so I can visually distinguish source types at a glance.

---

## 4. Functional Requirements

### 4.1 YouTube Transcript Extraction

1. The system must accept YouTube URLs (youtube.com and youtu.be formats) via the existing URL capture form.
2. The system must detect YouTube URLs and route them to a dedicated YouTube extractor instead of the generic URL extractor.
3. The YouTube extractor must fetch the video transcript (captions/subtitles). Prefer manually-uploaded captions over auto-generated ones when available.
4. The extractor must retrieve video metadata: title, channel name, and thumbnail URL via the YouTube oEmbed endpoint.
5. Extracted transcripts must be stored as the source `content`, with metadata (channel, thumbnail URL, video ID) stored in the `metadata` JSON field.
6. A new `YOUTUBE` value must be added to the `SourceType` enum.
7. The source detail page must display the video thumbnail (or embedded player) and video-specific metadata (channel name).
8. If no transcript is available (e.g., disabled by uploader), the system must return a clear error message to the user.
9. YouTube sources must flow through the existing processing pipeline (chunking → embedding → storage) without modification.

### 4.2 Source Type Filtering

10. The source type filter dropdown must include the new `YOUTUBE` type in addition to existing types.
11. The YouTube source type must have a distinct icon (Play icon).
12. Source cards must display the type badge with the appropriate icon and color.
13. The source detail page must render YouTube-specific metadata sections (channel name, thumbnail).

---

## 5. Non-Goals (Out of Scope)

- **YouTube playlist or watch history import** — only individual URL paste is supported in this phase.
- **Email ingestion** — deferred to a later phase (Gmail label sync or forwarding address approach TBD).
- **Audio/video file upload and transcription** (e.g., Whisper) — deferred to a later phase.
- **Timestamp-linked citations** — video citations will reference chunk text, not specific video timestamps.
- **Rich media rendering in Q&A answers** — citations from video sources display as text, same as other types.

---

## 6. Design Considerations

### Capture UI Changes

- The existing **Capture Tabs** component (`/components/capture/capture-tabs.tsx`) should remain as-is. YouTube URLs are entered through the existing URL tab — no new tab needed since detection is automatic.
- Add a small informational note on the URL tab: "YouTube links are supported — transcripts are extracted automatically."

### Source Detail Page

- YouTube sources should show a clickable thumbnail that links to the original video, plus the channel name.

### Knowledge Base Filters

- Extend the existing `SourceFilters` component to include YouTube in the type dropdown.
- Use a visually distinct icon and color for the YouTube type to maintain scannability.

---

## 7. Technical Considerations

### YouTube Extraction

- **Transcript fetching**: Use the `youtube-transcript` library to fetch transcripts without requiring a YouTube Data API key. Lightweight, no configuration needed.
- **Metadata fetching**: Use the YouTube oEmbed endpoint (`https://www.youtube.com/oembed?url=...`) for title, channel name (author), and thumbnail URL. This is free, unauthenticated, and returns JSON. Duration and description are not needed for Phase 2.
- **URL detection**: Parse URLs to detect YouTube domains and extract video IDs. Handle formats: `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID`.
- **Extractor pattern**: Create `lib/services/extraction/youtube-extractor.ts` following the established extractor interface (`extractFromYouTube(url: string): Promise<YouTubeExtractionResult>`).
- **Transcript formatting**: Join transcript segments into flowing text paragraphs. Avoid storing raw timestamp-text pairs since chunking handles segmentation.

### Database Changes

- Add `YOUTUBE` to the `SourceType` Prisma enum.
- No changes to the `Chunk` model or embedding pipeline — the new source type uses the same chunking and embedding flow.

### Existing Architecture Hooks

- `processSource()` in `processing-queue.ts` is source-type-agnostic — it operates on `source.content` regardless of type. No changes needed.
- Search (semantic + hybrid) operates on chunks, which are type-agnostic. No changes needed.
- Q&A citation rendering may need minor updates to display video metadata in citations.

---

## 8. Success Metrics

1. **YouTube ingestion success rate** ≥ 90% — measured as successful transcript extraction / total YouTube URLs submitted (failures = no transcript available, network errors).
2. **Content quality** — extracted YouTube transcripts should produce relevant search results comparable to URL-ingested articles (validated via evaluation framework).
3. **Adoption** — within 2 weeks of launch, ≥ 30% of new sources should come from YouTube (indicating reduced friction is driving usage).
4. **Latency** — YouTube ingestion should complete (source status = READY) within 30 seconds.

---

## 9. Open Questions

None — all questions resolved.
