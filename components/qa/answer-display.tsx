"use client";

import { Fragment, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { CitationInline } from "./citation";

interface AnswerDisplayProps {
  answer: string;
  streaming?: boolean;
  onCitationClick?: (index: number) => void;
}

function getSafeLinkHref(url: string): string | null {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function renderInline(
  text: string,
  keyPrefix: string,
  onCitationClick?: (index: number) => void
): ReactNode[] {
  const tokenRegex =
    /(`[^`\n]+`|\[[^\]\n]+\]\([^)]+\)|\[\d+\]|\*\*\*[^*\n]+\*\*\*|___[^_\n]+___|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let tokenCount = 0;

  for (const match of text.matchAll(tokenRegex)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    const citationMatch = token.match(/^\[(\d+)\]$/);
    if (citationMatch) {
      const citationIndex = parseInt(citationMatch[1], 10);
      nodes.push(
        <CitationInline
          key={`${keyPrefix}-citation-${tokenCount}`}
          index={citationIndex}
          onClick={() => onCitationClick?.(citationIndex)}
        />
      );
      tokenCount++;
      lastIndex = index + token.length;
      continue;
    }

    const inlineCodeMatch = token.match(/^`([^`\n]+)`$/);
    if (inlineCodeMatch) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${tokenCount}`}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]"
        >
          {inlineCodeMatch[1]}
        </code>
      );
      tokenCount++;
      lastIndex = index + token.length;
      continue;
    }

    const markdownLinkMatch = token.match(/^\[([^\]\n]+)\]\(([^)]+)\)$/);
    if (markdownLinkMatch) {
      const linkText = markdownLinkMatch[1];
      const href = getSafeLinkHref(markdownLinkMatch[2]);

      if (href) {
        nodes.push(
          <a
            key={`${keyPrefix}-link-${tokenCount}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {renderInline(linkText, `${keyPrefix}-link-text-${tokenCount}`, onCitationClick)}
          </a>
        );
        tokenCount++;
        lastIndex = index + token.length;
        continue;
      }
    }

    const tripleMatch =
      token.match(/^\*\*\*([^*\n]+)\*\*\*$/) ||
      token.match(/^___([^_\n]+)___$/);
    if (tripleMatch) {
      nodes.push(
        <strong key={`${keyPrefix}-bolditalic-${tokenCount}`}>
          <em>{renderInline(tripleMatch[1], `${keyPrefix}-bi-${tokenCount}`, onCitationClick)}</em>
        </strong>
      );
      tokenCount++;
      lastIndex = index + token.length;
      continue;
    }

    const boldMatch =
      token.match(/^\*\*([^*\n]+)\*\*$/) || token.match(/^__([^_\n]+)__$/);
    if (boldMatch) {
      nodes.push(
        <strong key={`${keyPrefix}-bold-${tokenCount}`}>
          {renderInline(boldMatch[1], `${keyPrefix}-b-${tokenCount}`, onCitationClick)}
        </strong>
      );
      tokenCount++;
      lastIndex = index + token.length;
      continue;
    }

    const italicMatch =
      token.match(/^\*([^*\n]+)\*$/) || token.match(/^_([^_\n]+)_$/);
    if (italicMatch) {
      nodes.push(
        <em key={`${keyPrefix}-italic-${tokenCount}`}>
          {renderInline(italicMatch[1], `${keyPrefix}-i-${tokenCount}`, onCitationClick)}
        </em>
      );
      tokenCount++;
      lastIndex = index + token.length;
      continue;
    }

    nodes.push(token);
    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function isUnorderedListLine(line: string): boolean {
  return /^[-*]\s+/.test(line);
}

function isOrderedListLine(line: string): boolean {
  return /^\d+\.\s+/.test(line);
}

function splitInlineOrderedList(paragraph: string): string[] {
  const matches = paragraph.match(/(?:^|\s)(\d+\.\s.*?)(?=\s\d+\.\s|$)/g);
  if (!matches || matches.length < 2 || !paragraph.trim().startsWith("1.")) {
    return [];
  }
  return matches.map((m) => m.trim().replace(/^\d+\.\s+/, ""));
}

export function AnswerDisplay({ answer, streaming, onCitationClick }: AnswerDisplayProps) {
  if (!answer && !streaming) return null;

  const blocks = answer.split("\n");
  const renderedBlocks: ReactNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const rawLine = blocks[i];
    const line = rawLine.trim();

    if (!line) {
      i++;
      continue;
    }

    const codeFenceStartMatch = rawLine.match(/^```([a-zA-Z0-9_-]+)?\s*$/);
    if (codeFenceStartMatch) {
      const language = codeFenceStartMatch[1] || "";
      i++;
      const codeLines: string[] = [];

      while (i < blocks.length && !blocks[i].trim().startsWith("```")) {
        codeLines.push(blocks[i]);
        i++;
      }

      if (i < blocks.length && blocks[i].trim().startsWith("```")) {
        i++;
      }

      renderedBlocks.push(
        <div key={`code-${i}`} className="not-prose">
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
            <code className="font-mono">{codeLines.join("\n")}</code>
          </pre>
          {language ? (
            <div className="mt-1 text-xs text-muted-foreground">{language}</div>
          ) : null}
        </div>
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const headingClasses = {
        1: "text-lg font-semibold",
        2: "text-base font-semibold",
        3: "text-sm font-semibold",
        4: "text-sm font-medium",
        5: "text-sm font-medium",
        6: "text-sm font-medium",
      }[level as 1 | 2 | 3 | 4 | 5 | 6];

      renderedBlocks.push(
        <div key={`heading-${i}`} className={headingClasses}>
          {renderInline(text, `heading-${i}`, onCitationClick)}
        </div>
      );
      i++;
      continue;
    }

    if (isUnorderedListLine(line)) {
      const items: string[] = [];
      while (i < blocks.length && isUnorderedListLine(blocks[i].trim())) {
        items.push(blocks[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      renderedBlocks.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 space-y-1">
          {items.map((item, itemIndex) => (
            <li key={`ul-${i}-${itemIndex}`}>
              {renderInline(item, `ul-${i}-${itemIndex}`, onCitationClick)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (isOrderedListLine(line)) {
      const items: string[] = [];
      while (i < blocks.length && isOrderedListLine(blocks[i].trim())) {
        items.push(blocks[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      renderedBlocks.push(
        <ol key={`ol-${i}`} className="list-decimal pl-5 space-y-1">
          {items.map((item, itemIndex) => (
            <li key={`ol-${i}-${itemIndex}`}>
              {renderInline(item, `ol-${i}-${itemIndex}`, onCitationClick)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < blocks.length) {
      const current = blocks[i].trim();
      if (
        !current ||
        current.startsWith("```") ||
        current.match(/^(#{1,6})\s+/) ||
        isUnorderedListLine(current) ||
        isOrderedListLine(current)
      ) {
        break;
      }
      paragraphLines.push(current);
      i++;
    }

    const paragraphText = paragraphLines.join(" ");
    const numberedItems = splitInlineOrderedList(paragraphText);

    if (numberedItems.length > 0) {
      renderedBlocks.push(
        <ol key={`inline-ol-${i}`} className="list-decimal pl-5 space-y-1">
          {numberedItems.map((item, itemIndex) => (
            <li key={`inline-ol-${i}-${itemIndex}`}>
              {renderInline(item, `inline-ol-${i}-${itemIndex}`, onCitationClick)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    renderedBlocks.push(
      <p key={`p-${i}`}>{renderInline(paragraphText, `p-${i}`, onCitationClick)}</p>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-3">
        {renderedBlocks.length > 0 ? renderedBlocks : <Fragment>{answer}</Fragment>}
        {streaming && (
          <Loader2 className="inline-block ml-1 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
