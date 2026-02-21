// Types
export interface YouTubeVideoMetadata {
  videoId: string;
  thumbnailUrl: string;
  channel: string;
}

export interface YouTubeExtractedContent {
  title: string;
  content: string;
  author: string;
  metadata: YouTubeVideoMetadata;
}

export interface YouTubeExtractionResult {
  data?: YouTubeExtractedContent;
  error?: string;
}

// Dependency injection types (following pdf-extractor.ts pattern)
interface TranscriptSegment {
  text: string;
}

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

export interface YouTubeExtractionDeps {
  fetchTranscript?: (videoId: string) => Promise<TranscriptSegment[]>;
  fetchOEmbed?: (url: string) => Promise<OEmbedResponse | null>;
}

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"];

const ANDROID_USER_AGENT = "com.google.android.youtube/20.10.38 (Linux; U; Android 11)";
const BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return YOUTUBE_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);

    // youtu.be/ID
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id || null;
    }

    // youtube.com/watch?v=ID
    if (parsed.pathname === "/watch") {
      return parsed.searchParams.get("v") || null;
    }

    // youtube.com/shorts/ID or youtube.com/embed/ID
    const shortsMatch = parsed.pathname.match(/^\/(shorts|embed)\/([^/?]+)/);
    if (shortsMatch) {
      return shortsMatch[2] || null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse YouTube's timedtext format-3 XML (srv3) into transcript segments.
 * Format uses <p> paragraph tags containing <s> segment children.
 */
function parseTranscriptXml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  const segmentRegex = /<s[^>]*>([^<]*)<\/s>/g;
  const tagRegex = /<[^>]+>/g;

  for (const pMatch of xml.matchAll(paragraphRegex)) {
    const inner = pMatch[1];
    // If paragraph contains <s> tags, concatenate their text
    const sMatches = [...inner.matchAll(segmentRegex)];
    if (sMatches.length > 0) {
      const text = sMatches.map(m => m[1]).join("").trim();
      if (text) segments.push({ text });
    } else {
      // Plain text paragraph (no <s> children)
      const text = inner.replace(tagRegex, "").trim();
      if (text) segments.push({ text });
    }
  }

  return segments;
}

/**
 * Fetch transcript using YouTube's InnerTube player API with the ANDROID client.
 * The ANDROID client does not require a PO (Proof of Origin) token, unlike the
 * WEB client which began requiring them in 2024.
 */
async function defaultFetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
  // Step 1: Get the InnerTube API key from the watch page
  const watchHtml = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { "User-Agent": BROWSER_USER_AGENT },
    signal: AbortSignal.timeout(15000),
  }).then(r => r.text());

  const apiKey = watchHtml.match(/"INNERTUBE_API_KEY":"([a-zA-Z0-9_-]+)"/)?.[1];
  if (!apiKey) {
    throw new Error("Could not extract InnerTube API key from YouTube page");
  }

  // Step 2: Fetch player data using the ANDROID InnerTube client
  const playerResponse = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
        videoId,
      }),
      signal: AbortSignal.timeout(15000),
    }
  ).then(r => r.json()) as Record<string, unknown>;

  // Step 3: Extract the caption track URL
  const captions = (playerResponse?.captions as Record<string, unknown> | undefined)
    ?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
  const captionTracks = captions?.captionTracks as Array<Record<string, string>> | undefined;

  if (!captionTracks?.length) {
    return [];
  }

  // Prefer English, fall back to first available track
  const track = captionTracks.find(t => t.languageCode === "en") ?? captionTracks[0];
  const transcriptUrl = track.baseUrl;

  // Step 4: Fetch the transcript XML with the Android user agent
  const xml = await fetch(transcriptUrl, {
    headers: { "User-Agent": ANDROID_USER_AGENT },
    signal: AbortSignal.timeout(15000),
  }).then(r => r.text());

  if (!xml) return [];

  return parseTranscriptXml(xml);
}

async function defaultFetchOEmbed(url: string): Promise<OEmbedResponse | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    return await response.json() as OEmbedResponse;
  } catch {
    return null;
  }
}

export async function extractFromYouTube(
  url: string,
  deps: YouTubeExtractionDeps = {}
): Promise<YouTubeExtractionResult> {
  if (!isYouTubeUrl(url)) {
    return { error: "Not a valid YouTube URL" };
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return { error: "Could not extract video ID from URL" };
  }

  const fetchTranscript = deps.fetchTranscript ?? defaultFetchTranscript;
  const fetchOEmbed = deps.fetchOEmbed ?? defaultFetchOEmbed;

  // Fetch transcript
  let transcript: string;
  try {
    const segments = await fetchTranscript(videoId);
    if (!segments || segments.length === 0) {
      return { error: "No transcript available for this video. The video may not have captions enabled." };
    }
    transcript = segments.map(s => s.text).join(" ");
  } catch (err) {
    return {
      error: `Failed to fetch transcript: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }

  // Fetch oEmbed metadata (non-fatal)
  const oembed = await fetchOEmbed(url);

  const title = oembed?.title || videoId;
  const author = oembed?.author_name || "Unknown";
  const thumbnailUrl = oembed?.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    data: {
      title,
      content: transcript,
      author,
      metadata: {
        videoId,
        thumbnailUrl,
        channel: author,
      },
    },
  };
}
