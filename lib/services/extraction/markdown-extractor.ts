export interface MarkdownExtractionResult {
  title: string;
  content: string;
}

export function extractFromMarkdown(
  text: string,
  filename: string
): MarkdownExtractionResult {
  // Derive title from first heading or filename
  const headingMatch = text.match(/^#{1,6}\s+(.+)$/m);
  const title = headingMatch
    ? headingMatch[1].trim()
    : filename.replace(/\.(md|markdown)$/i, "");

  // Strip markdown syntax to get plain text for indexing
  const plainText = text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, (match) =>
      match.replace(/`/g, "")
    ) // inline code
    .replace(/```[\s\S]*?```/g, (match) =>
      match.replace(/```\w*\n?/g, "").replace(/```/g, "")
    ) // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // images
    .replace(/^[-*+]\s+/gm, "") // unordered lists
    .replace(/^\d+\.\s+/gm, "") // ordered lists
    .replace(/^>\s+/gm, "") // blockquotes
    .replace(/---+/g, "") // horizontal rules
    .trim();

  return {
    title,
    content: plainText,
  };
}
