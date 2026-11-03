export interface UserSession {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  createdAt: string;
  lastActive: string;
}

export interface AuthUser {
  username: string;
  role: string;
  isAuthenticated: boolean;
  loginTime: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  blobUrl: string;
  storageSource: 'upstash-blob' | 'simulated-blob';
  uploadedAt: string;
  status: 'indexed' | 'processing' | 'pending' | 'failed';
  summary: string;
  tags: string[];
  vectorId?: string;
  contentSnippet?: string;
  fullText?: string;
}

export interface SearchResultItem {
  document: DocumentItem;
  score: number;
  matchedSnippet: string;
  matchedConcepts: string[];
}

export interface QueueTaskItem {
  id: string;
  taskType: 'extract_and_embed' | 'generate_summary' | 'avatar_sync' | 'purge_cache' | 'batch_benchmark';
  docId?: string;
  docName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  durationMs?: number;
  retryCount: number;
  source: 'upstash-qstash' | 'simulated-queue';
  error?: string;
}

export interface RedisKeyItem {
  key: string;
  type: 'string' | 'hash' | 'list' | 'set' | 'zset' | 'unknown';
  ttl: number; // in seconds, -1 if no TTL, -2 if expired
  valuePreview: string;
  sizeBytes?: number;
  updatedAt?: string;
}

export interface SystemStatus {
  redisConnected: boolean;
  redisType: 'live' | 'mock';
  blobConnected: boolean;
  blobType: 'live' | 'mock';
  vectorConnected: boolean;
  vectorType: 'live' | 'mock';
  qstashConnected: boolean;
  qstashType: 'live' | 'mock';
  isVercel: boolean;
  cacheStats: {
    keysCount: number;
    hitCount: number;
    missCount: number;
    hitRatio: string;
    lastPurgedAt: string | null;
  };
}
