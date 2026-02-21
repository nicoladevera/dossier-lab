import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import dns from "dns/promises";
import type { LookupAddress } from "dns";

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

/**
 * Checks if an IPv4 address string is in a private/reserved range.
 * Returns an error message if blocked, null if allowed.
 */
export function isPrivateIPv4(ip: string): string | null {
  const match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return null;
  const [, a, b] = match.map(Number);
  if (
    a === 127 ||                          // 127.0.0.0/8 (loopback)
    a === 10 ||                           // 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12
    (a === 192 && b === 168) ||           // 192.168.0.0/16
    (a === 169 && b === 254) ||           // 169.254.0.0/16 (link-local / cloud metadata)
    a === 0                               // 0.0.0.0/8
  ) {
    return "URLs targeting private or internal networks are not allowed";
  }
  return null;
}

/**
 * Checks if an IPv6 address string (without brackets) is private/reserved,
 * including IPv4-mapped IPv6 in both dotted-quad and hex-normalized forms.
 * Returns an error message if blocked, null if allowed.
 */
export function isPrivateIPv6(addr: string): string | null {
  const lower = addr.toLowerCase();

  if (
    /^fe[89ab][0-9a-f]:/.test(lower) || // link-local (fe80::/10)
    lower.startsWith("fc") ||           // unique local (fc00::/7 — fc00::-fcff::)
    lower.startsWith("fd") ||           // unique local (fc00::/7 — fd00::-fdff::)
    lower === "::1"                     // loopback
  ) {
    return "URLs targeting private or internal networks are not allowed";
  }

  // IPv4-mapped IPv6 in dotted-quad form: ::ffff:A.B.C.D
  const v4DottedMatch = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4DottedMatch) {
    return isPrivateIPv4(v4DottedMatch[1]);
  }

  // IPv4-mapped IPv6 in hex-normalized form: ::ffff:XXYY:ZZWW
  // (URL parser and some resolvers normalize dotted-quad to this form)
  const v4HexMatch = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (v4HexMatch) {
    const hi = parseInt(v4HexMatch[1], 16);
    const lo = parseInt(v4HexMatch[2], 16);
    const a = (hi >> 8) & 0xff;
    const b = hi & 0xff;
    const c = (lo >> 8) & 0xff;
    const d = lo & 0xff;
    return isPrivateIPv4(`${a}.${b}.${c}.${d}`);
  }

  return null;
}

/**
 * Checks if a URL targets a blocked destination (private/internal networks, non-HTTP protocols).
 * Returns an error message if blocked, null if allowed.
 */
export function isBlockedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Invalid URL";
  }

  // Block non-HTTP(S) protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return `Blocked protocol: ${parsed.protocol} — only HTTP and HTTPS are allowed`;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost variants
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return "URLs targeting localhost are not allowed";
  }

  // Block private/reserved IPv4 addresses
  const ipv4Blocked = isPrivateIPv4(hostname);
  if (ipv4Blocked) return ipv4Blocked;

  // Block IPv6 private/link-local — only check bracketed IPv6 literals to avoid
  // false-positives on regular hostnames (e.g. fda.gov)
  if (hostname.startsWith("[")) {
    const bare = hostname.replace(/^\[|\]$/g, "");
    const ipv6Blocked = isPrivateIPv6(bare);
    if (ipv6Blocked) return ipv6Blocked;
  }

  return null;
}

/**
 * Resolves a hostname using the OS resolver (same path as fetch/libc) and
 * checks whether any resolved address falls in a private/reserved range.
 * This closes the DNS rebinding SSRF vector where an attacker-controlled
 * domain points to an internal IP.
 *
 * Uses dns.lookup (getaddrinfo) rather than dns.resolve to match the actual
 * resolution path used by fetch, including /etc/hosts and OS-level overrides.
 *
 * Note: There is an inherent TOCTOU gap (DNS could change between resolution
 * and connect). For full protection, use a network-level firewall or proxy
 * that blocks outbound connections to private ranges.
 */
async function checkResolvedIPs(hostname: string): Promise<string | null> {
  // Skip DNS check for raw IP addresses — already validated by isBlockedUrl
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || hostname.startsWith("[")) {
    return null;
  }

  let results: LookupAddress[];
  try {
    results = await dns.lookup(hostname, { all: true });
  } catch {
    // If OS resolution fails, let fetch handle the error naturally
    return null;
  }

  for (const { address, family } of results) {
    if (family === 4) {
      const blocked = isPrivateIPv4(address);
      if (blocked) {
        return `DNS resolved to blocked address: ${address}`;
      }
    } else if (family === 6) {
      const blocked = isPrivateIPv6(address);
      if (blocked) {
        return `DNS resolved to blocked address: ${address}`;
      }
    }
  }

  return null;
}

const MAX_REDIRECTS = 5;

export async function extractFromUrl(
  url: string,
  _redirectCount = 0,
): Promise<UrlExtractionResult> {
  const blocked = isBlockedUrl(url);
  if (blocked) {
    return { error: blocked };
  }

  if (_redirectCount > MAX_REDIRECTS) {
    return { error: "Too many redirects" };
  }

  // Resolve DNS and validate the actual IP addresses before connecting
  const parsed = new URL(url);
  const dnsBlocked = await checkResolvedIPs(parsed.hostname);
  if (dnsBlocked) {
    return { error: dnsBlocked };
  }

  let html: string;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DossierLab/1.0; +https://dossier.lab)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });

    // Handle redirects manually to validate each target against SSRF blocklist
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return { error: "Redirect with no Location header" };
      }
      const resolvedLocation = new URL(location, url).toString();
      const redirectBlocked = isBlockedUrl(resolvedLocation);
      if (redirectBlocked) {
        return { error: `Redirect blocked: ${redirectBlocked}` };
      }
      return extractFromUrl(resolvedLocation, _redirectCount + 1);
    }

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
