import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export interface ExtractedContent {
  title: string;
  content: string;
  author?: string;
  publicationDate?: string;
  excerpt?: string;
  siteName?: string;
}

export interface UrlExtractionResult {
  data?: ExtractedContent;
  warning?: string;
  error?: string;
}

const PARTIAL_CONTENT_THRESHOLD = 200;

function normalizeTextContent(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractFromUrl(url: string): Promise<UrlExtractionResult> {
  let html: string;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DossierAI/1.0; +https://dossier.ai)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { error: `Failed to fetch URL: HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { error: "URL does not point to an HTML page" };
    }

    html = await response.text();
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return { error: "Request timed out while fetching the URL" };
    }
    return {
      error: `Failed to fetch URL: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }

  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      return {
        error:
          "Could not extract content from this URL. The page may require JavaScript or be behind a paywall. Try pasting the content directly instead.",
      };
    }

    const textContent = normalizeTextContent(article.textContent);

    if (textContent.length < PARTIAL_CONTENT_THRESHOLD) {
      return {
        error:
          "This article appears to be behind a paywall or requires login. Try pasting the content directly instead.",
      };
    }

    const data: ExtractedContent = {
      title: article.title || new URL(url).hostname,
      content: textContent,
      author: article.byline || undefined,
      excerpt: article.excerpt || undefined,
      siteName: article.siteName || undefined,
    };

    // Check for partial content (possible paywall)
    // Heuristic: if text is relatively short compared to what we'd expect from a full article
    const isLikelyPartial =
      textContent.length >= PARTIAL_CONTENT_THRESHOLD && textContent.length < 500;

    if (isLikelyPartial) {
      return {
        data,
        warning:
          "Partial content extracted — some content may be behind a paywall.",
      };
    }

    return { data };
  } catch (err) {
    return {
      error: `Content extraction failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
