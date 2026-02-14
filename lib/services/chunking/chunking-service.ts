export interface ChunkingStrategy {
  chunk(text: string): string[];
}

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export class RecursiveCharacterSplitter implements ChunkingStrategy {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  private readonly separators = ["\n\n", "\n", ". ", " ", ""];

  constructor(options?: Partial<ChunkingOptions>) {
    this.chunkSize = options?.chunkSize ?? 500;
    this.chunkOverlap = options?.chunkOverlap ?? 50;
  }

  chunk(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    if (text.length <= this.chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const rawChunks = this.splitText(text, this.separators);

    let currentChunk = "";

    for (const segment of rawChunks) {
      if (currentChunk.length + segment.length <= this.chunkSize) {
        currentChunk += segment;
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          // Apply overlap: take the last chunkOverlap characters
          const overlapText = currentChunk.slice(-this.chunkOverlap);
          currentChunk = overlapText + segment;
        } else {
          // Segment itself is larger than chunkSize, force split
          let remaining = segment;
          while (remaining.length > this.chunkSize) {
            chunks.push(remaining.slice(0, this.chunkSize));
            const overlap = remaining.slice(
              this.chunkSize - this.chunkOverlap,
              this.chunkSize
            );
            remaining = overlap + remaining.slice(this.chunkSize);
          }
          currentChunk = remaining;
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private splitText(text: string, separators: string[]): string[] {
    if (separators.length === 0 || text.length <= this.chunkSize) {
      return [text];
    }

    const separator = separators[0];
    const remainingSeparators = separators.slice(1);

    if (separator === "") {
      // Character-level split as last resort
      return [text];
    }

    const parts = text.split(separator);
    const result: string[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = i < parts.length - 1 ? parts[i] + separator : parts[i];

      if (part.length > this.chunkSize && remainingSeparators.length > 0) {
        result.push(...this.splitText(part, remainingSeparators));
      } else {
        result.push(part);
      }
    }

    return result;
  }
}
