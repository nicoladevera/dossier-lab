# Tasks: YouTube Capture + Source Type Filtering (Phase 2)

## Relevant Files

### New Files (to create)
- `lib/services/extraction/youtube-extractor.ts` - YouTube transcript and oEmbed metadata extraction service
- `lib/services/extraction/youtube-extractor.test.ts` - Unit tests for YouTube extractor

### Modified Files
- `prisma/schema.prisma` - Add `YOUTUBE` to `SourceType` enum
- `app/api/ingest/url/route.ts` - Add YouTube URL detection and routing to YouTube extractor
- `lib/services/extraction/url-extractor.ts` - Export YouTube URL detection helper (or keep in route)
- `app/(main)/knowledge-base/[id]/page.tsx` - Add YouTube-specific metadata display and thumbnail
- `components/knowledge-base/source-card.tsx` - Add YouTube icon and color to type mappings
- `components/knowledge-base/source-filters.tsx` - Add YOUTUBE to type filter dropdown
- `components/capture/url-capture-form.tsx` - Add informational note about YouTube support

### Reference Files (no changes needed)
- `lib/services/extraction/pdf-extractor.ts` - Reference for extractor pattern
- `lib/services/extraction/url-extractor.test.ts` - Reference for test patterns
- `lib/services/processing/processing-queue.ts` - No changes needed (source-type-agnostic)

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `youtube-extractor.ts` and `youtube-extractor.test.ts` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout a new branch for this feature (`git checkout -b feature/youtube-capture`)

- [ ] 1.0 Add YOUTUBE to the SourceType enum and run database migration
  - [ ] 1.1 Add `YOUTUBE` to the `SourceType` enum in `prisma/schema.prisma`
  - [ ] 1.2 Generate a new Prisma migration (`npx prisma migrate dev --name add-youtube-source-type`)
  - [ ] 1.3 Verify the migration ran successfully and the `SourceType` enum includes `YOUTUBE`

- [ ] 2.0 Build the YouTube extractor service (transcript + oEmbed metadata)
  - [ ] 2.1 Install the `youtube-transcript` package (`npm install youtube-transcript`)
  - [ ] 2.2 Create `lib/services/extraction/youtube-extractor.ts` following the established extractor interface pattern
  - [ ] 2.3 Implement `isYouTubeUrl(url: string): boolean` — detect YouTube domains (`youtube.com`, `youtu.be`, `youtube.com/shorts/`)
  - [ ] 2.4 Implement `extractVideoId(url: string): string | null` — parse video ID from supported URL formats (`youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID`)
  - [ ] 2.5 Implement transcript fetching using `youtube-transcript` — join transcript segments into flowing text, preferring manual captions over auto-generated
  - [ ] 2.6 Implement oEmbed metadata fetching — call `https://www.youtube.com/oembed?url=...&format=json` to get title, author (channel name), and thumbnail URL
  - [ ] 2.7 Implement the main `extractFromYouTube(url: string): Promise<YouTubeExtractionResult>` function that combines transcript + metadata, returning `{ title, content, author, metadata: { videoId, thumbnailUrl, channel } }`
  - [ ] 2.8 Handle error cases: no transcript available, invalid URL, network failures — return clear error messages in the result object (not thrown exceptions), matching the pattern used by other extractors

- [ ] 3.0 Integrate YouTube detection into the URL ingestion API route
  - [ ] 3.1 Import `isYouTubeUrl` and `extractFromYouTube` into `app/api/ingest/url/route.ts`
  - [ ] 3.2 Add a check before the existing `extractFromUrl()` call: if `isYouTubeUrl(url)`, call `extractFromYouTube(url)` instead
  - [ ] 3.3 Set `sourceType` to `"YOUTUBE"` when a YouTube URL is detected (instead of `"URL"`)
  - [ ] 3.4 Store YouTube-specific metadata (videoId, thumbnailUrl, channel) in the source's `metadata` JSON field
  - [ ] 3.5 Verify the source flows through the existing `processSource()` pipeline (chunking → embedding → storage) without changes

- [ ] 4.0 Update the source detail page to display YouTube-specific metadata and thumbnail
  - [ ] 4.1 In `app/(main)/knowledge-base/[id]/page.tsx`, detect when the source type is `YOUTUBE`
  - [ ] 4.2 Render a clickable video thumbnail that links to the original YouTube URL (use the `thumbnailUrl` from metadata)
  - [ ] 4.3 Display the channel name from metadata in the source header/metadata section
  - [ ] 4.4 Ensure the existing content display (chunks) works correctly for YouTube transcript content

- [ ] 5.0 Update source type filtering and icons in the knowledge base UI
  - [ ] 5.1 In `components/knowledge-base/source-card.tsx`, add a YouTube entry to the `typeIcons` mapping (use a Play/Video icon from lucide-react)
  - [ ] 5.2 Add a YouTube entry to the `typeColors` mapping with a distinct color (e.g., red to match YouTube branding)
  - [ ] 5.3 In `components/knowledge-base/source-filters.tsx`, add `YOUTUBE` as an option in the source type filter dropdown
  - [ ] 5.4 Verify that filtering by YOUTUBE type correctly shows only YouTube sources in the source list

- [ ] 6.0 Add YouTube hint to the URL capture form
  - [ ] 6.1 In `components/capture/url-capture-form.tsx`, add a small informational note below the URL input: "YouTube links are supported — transcripts are extracted automatically."
  - [ ] 6.2 Style the hint as subtle/muted text that doesn't distract from the primary capture flow

- [ ] 7.0 Write tests for YouTube extraction and ingestion flow
  - [ ] 7.1 Create `lib/services/extraction/youtube-extractor.test.ts`
  - [ ] 7.2 Write tests for `isYouTubeUrl()` — valid YouTube URLs (watch, youtu.be, shorts), non-YouTube URLs, edge cases (empty string, malformed URLs)
  - [ ] 7.3 Write tests for `extractVideoId()` — extract IDs from all supported URL formats, return null for invalid formats
  - [ ] 7.4 Write tests for `extractFromYouTube()` — mock the `youtube-transcript` library and oEmbed fetch, test successful extraction, test error handling (no transcript, network failure)
  - [ ] 7.5 Run the full test suite (`npx jest`) to ensure no regressions in existing functionality
