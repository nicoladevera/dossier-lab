import mammoth from "mammoth";

export interface WordExtractionResult {
  title: string;
  content: string;
  author?: string;
}

export async function extractFromWord(
  buffer: Buffer,
  filename: string
): Promise<WordExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();

  // Derive title from first line or filename
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const title =
    lines.length > 0 && lines[0].length < 200
      ? lines[0]
      : filename.replace(/\.(docx?|doc)$/i, "");

  return {
    title,
    content: text,
  };
}
