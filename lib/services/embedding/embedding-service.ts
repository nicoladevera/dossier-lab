export interface EmbeddingProvider {
  modelId: string;
  dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

const BATCH_SIZE = 100;

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly modelId = "text-embedding-3-small";
  readonly dimensions = 1536;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchResults = await this.embedBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: texts,
        model: this.modelId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.data
      .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
      .map((item: { embedding: number[] }) => item.embedding);
  }
}
