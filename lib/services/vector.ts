import { Index } from '@upstash/vector';
import { envConfig } from '../config';
import { DocumentItem } from '../types';

export interface VectorMetadata {
  docId: string;
  name: string;
  type: string;
  snippet: string;
  tags: string[];
  blobUrl?: string;
  size?: number;
  summary?: string;
  uploadedAt?: string;
  [key: string]: unknown;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: VectorMetadata;
}

// In-memory semantic vector store for local preview/development
interface LocalVectorEntry {
  id: string;
  text: string;
  metadata: VectorMetadata;
  tokens: Map<string, number>;
  magnitude: number;
}

const globalForVector = global as unknown as {
  localVectorStore?: Map<string, LocalVectorEntry>;
  liveVectorIndex?: Index;
};

const localIndex = globalForVector.localVectorStore ?? new Map<string, LocalVectorEntry>();
if (process.env.NODE_ENV !== 'production') {
  globalForVector.localVectorStore = localIndex;
}

function getVectorIndex(): Index | null {
  if (!envConfig.hasUpstashVector) return null;
  if (!globalForVector.liveVectorIndex) {
    try {
      globalForVector.liveVectorIndex = new Index({
        url: envConfig.upstashVectorUrl,
        token: envConfig.upstashVectorToken,
      });
    } catch (err) {
      console.warn('[Vector] Failed to init live index:', err);
      return null;
    }
  }
  return globalForVector.liveVectorIndex;
}

// Tokenize and build frequency vector for cosine similarity fallback
function vectorizeText(text: string): { tokens: Map<string, number>; magnitude: number } {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ');
  const words = normalized.split(/\s+/).filter((w) => w.length >= 1);
  const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'were', 'which', 'your', '的', '了', '与', '在', '是', '和']);
  
  const tokens = new Map<string, number>();
  for (const w of words) {
    if (stopWords.has(w)) continue;
    tokens.set(w, (tokens.get(w) || 0) + 1);
  }

  let sumSq = 0;
  tokens.forEach((count) => {
    sumSq += count * count;
  });
  const magnitude = Math.sqrt(sumSq) || 1;

  return { tokens, magnitude };
}

function calculateCosineSimilarity(
  v1: { tokens: Map<string, number>; magnitude: number },
  v2: { tokens: Map<string, number>; magnitude: number }
): number {
  let dotProduct = 0;
  v1.tokens.forEach((count1, term) => {
    const count2 = v2.tokens.get(term);
    if (count2) {
      dotProduct += count1 * count2;
    }
  });
  return dotProduct / (v1.magnitude * v2.magnitude);
}

export const VectorService = {
  isLive(): boolean {
    return Boolean(envConfig.hasUpstashVector && getVectorIndex());
  },

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; message: string }> {
    const index = getVectorIndex();
    if (!index) {
      return {
        connected: false,
        latencyMs: 0,
        message: '未检测到 UPSTASH_VECTOR_REST_URL 与 TOKEN，使用本地余弦向量引擎',
      };
    }
    const start = Date.now();
    try {
      const info = await index.info();
      return {
        connected: true,
        latencyMs: Date.now() - start,
        message: `Upstash Vector 云端索引就绪 (已存向量: ${info.vectorCount ?? 0}, 维度: ${info.dimension ?? '内置'})`,
      };
    } catch (err) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : '连接失败',
      };
    }
  },

  async upsertDocument(doc: DocumentItem, fullText?: string): Promise<string> {
    const textToEmbed = fullText || `${doc.name}. ${doc.summary}. Tags: ${doc.tags.join(', ')}`;
    const snippet = textToEmbed.slice(0, 220);
    const vectorId = `vec_${doc.id}`;

    const metadata: VectorMetadata = {
      docId: doc.id,
      name: doc.name,
      type: doc.type,
      snippet,
      tags: doc.tags,
      blobUrl: doc.blobUrl,
      size: doc.size,
      summary: doc.summary,
      uploadedAt: doc.uploadedAt,
    };

    // Live Upstash Vector with built-in embeddings
    const index = getVectorIndex();
    if (index) {
      try {
        await index.upsert({
          id: vectorId,
          data: textToEmbed,
          metadata,
        });
        return vectorId;
      } catch (err) {
        console.warn('[Vector] Upsert to live index failed, falling back to local:', err);
      }
    }

    // Local semantic vector fallback
    const { tokens, magnitude } = vectorizeText(textToEmbed);
    localIndex.set(vectorId, {
      id: vectorId,
      text: textToEmbed,
      metadata,
      tokens,
      magnitude,
    });

    return vectorId;
  },

  async query(queryText: string, topK = 6): Promise<VectorSearchResult[]> {
    const index = getVectorIndex();
    if (index) {
      try {
        const response = await index.query<VectorMetadata>({
          data: queryText,
          topK,
          includeMetadata: true,
        });
        return response.map((item) => ({
          id: String(item.id),
          score: item.score ?? 0,
          metadata: item.metadata,
        }));
      } catch (err) {
        console.warn('[Vector] Live query failed, falling back to local:', err);
      }
    }

    // Local semantic cosine similarity search
    const queryVec = vectorizeText(queryText);
    const results: VectorSearchResult[] = [];

    localIndex.forEach((entry) => {
      let score = calculateCosineSimilarity(queryVec, entry);
      
      // Boost if query tokens match in document tags or name
      const queryLower = queryText.toLowerCase();
      if (entry.metadata.name.toLowerCase().includes(queryLower)) {
        score = Math.min(1, score + 0.35);
      }
      for (const tag of entry.metadata.tags) {
        if (queryLower.includes(tag.toLowerCase())) {
          score = Math.min(1, score + 0.2);
        }
      }

      if (score > 0.05) {
        results.push({
          id: entry.id,
          score: Math.min(1, Number(score.toFixed(3))),
          metadata: entry.metadata,
        });
      }
    });

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  },

  async getRecommendations(docId: string, topK = 3): Promise<VectorSearchResult[]> {
    const targetId = `vec_${docId}`;
    const targetEntry = localIndex.get(targetId);

    if (!targetEntry) {
      const all: VectorSearchResult[] = [];
      localIndex.forEach((entry) => {
        if (entry.metadata.docId !== docId) {
          all.push({
            id: entry.id,
            score: 0.85,
            metadata: entry.metadata,
          });
        }
      });
      return all.slice(0, topK);
    }

    const recommendations: VectorSearchResult[] = [];
    localIndex.forEach((entry) => {
      if (entry.id === targetId || entry.metadata.docId === docId) return;
      const score = calculateCosineSimilarity(targetEntry, entry);
      recommendations.push({
        id: entry.id,
        score: Math.min(1, Number(Math.max(0.4, score).toFixed(3))),
        metadata: entry.metadata,
      });
    });

    return recommendations.sort((a, b) => b.score - a.score).slice(0, topK);
  },

  async delete(vectorId: string): Promise<void> {
    const index = getVectorIndex();
    if (index) {
      try {
        await index.delete(vectorId);
      } catch (err) {
        console.warn(`[Vector] Error deleting vector ${vectorId}:`, err);
      }
    }
    localIndex.delete(vectorId);
  },

  getCount(): number {
    return localIndex.size;
  },
};
