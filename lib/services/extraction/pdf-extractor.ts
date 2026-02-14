// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export interface PdfExtractionResult {
  title: string;
  content: string;
  author?: string;
  pageCount: number;
}

export async function extractFromPdf(
  buffer: Buffer,
  filename: string
): Promise<PdfExtractionResult> {
  const data = await pdfParse(buffer);

  const title =
    data.info?.Title ||
    filename.replace(/\.pdf$/i, "");

  const author = data.info?.Author || undefined;

  return {
    title,
    content: data.text.trim(),
    author,
    pageCount: data.numpages,
  };
}
