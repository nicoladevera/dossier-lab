type PdfMetadataInfo = {
  Title?: string;
  Author?: string;
};

type PdfTextItem = {
  str?: string;
};

type PdfTextContent = {
  items: PdfTextItem[];
};

type PdfPage = {
  getTextContent: () => Promise<PdfTextContent>;
  cleanup?: () => void;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  getMetadata?: () => Promise<{ info?: PdfMetadataInfo }>;
  destroy?: () => Promise<void> | void;
};

type PdfLoadingTask = {
  promise: Promise<PdfDocument>;
};

type PdfJsModule = {
  GlobalWorkerOptions?: {
    workerSrc?: string;
  };
  getDocument: (options: { data: Uint8Array }) => PdfLoadingTask;
};

type PdfExtractionDependencies = {
  loadPdfJsModule?: () => Promise<PdfJsModule>;
};

export async function loadPdfJsModule(): Promise<PdfJsModule> {
  try {
    return (await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    )) as unknown as PdfJsModule;
  } catch {
    throw new Error(
      "PDF extraction is unavailable because the PDF parser failed to load"
    );
  }
}

export interface PdfExtractionResult {
  title: string;
  content: string;
  author?: string;
  pageCount: number;
}

export async function extractFromPdf(
  buffer: Buffer,
  filename: string,
  dependencies: PdfExtractionDependencies = {}
): Promise<PdfExtractionResult> {
  const loadModule = dependencies.loadPdfJsModule ?? loadPdfJsModule;
  const pdfjs = await loadModule();

  // In Node runtimes, pdfjs uses a "fake worker" and dynamically imports workerSrc.
  // Next.js chunk paths break the default relative worker path, so pin it explicitly.
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc =
      "pdfjs-dist/legacy/build/pdf.worker.mjs";
  }

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const document = await loadingTask.promise;
  const pageTexts: string[] = [];
  let info: PdfMetadataInfo | undefined;

  try {
    if (document.getMetadata) {
      try {
        const metadata = await document.getMetadata();
        info = metadata.info;
      } catch {
        info = undefined;
      }
    }

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str ?? "")
        .join(" ")
        .trim();

      if (pageText.length > 0) {
        pageTexts.push(pageText);
      }

      page.cleanup?.();
    }
  } finally {
    await document.destroy?.();
  }

  const title =
    info?.Title ||
    filename.replace(/\.pdf$/i, "");

  const author = info?.Author || undefined;

  return {
    title,
    content: pageTexts.join("\n\n").trim(),
    author,
    pageCount: document.numPages,
  };
}
