export interface TextExtractionResult {
  title: string;
  content: string;
}

export function extractFromText(
  text: string,
  filename: string
): TextExtractionResult {
  const trimmed = text.trim();

  // Derive title from first non-empty line or filename
  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
  const title =
    lines.length > 0 && lines[0].length < 200
      ? lines[0]
      : filename.replace(/\.txt$/i, "");

  return {
    title,
    content: trimmed,
  };
}
