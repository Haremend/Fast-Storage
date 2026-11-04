/**
 * Fast Storage Configuration & Environment Management
 * Handles environment variables with clean dynamic getters and Vercel Serverless detection.
 */

export const envConfig = {
  // Single-User Admin Credentials (configured in Vercel environment variables)
  get adminUsername(): string {
    return process.env.ADMIN_USERNAME || 'admin';
  },
  get adminPassword(): string {
    return process.env.ADMIN_PASSWORD || 'admin123456';
  },

  // Upstash Blob
  get upstashBlobToken(): string {
    return process.env.UPSTASH_BLOB_TOKEN || '';
  },
  get hasUpstashBlob(): boolean {
    const token = process.env.UPSTASH_BLOB_TOKEN || '';
    return Boolean(
      token &&
      token.length > 8 &&
      !token.includes('your_upstash_blob') &&
      !token.includes('MY_UPSTASH')
    );
  },

  // Upstash Redis
  get upstashRedisUrl(): string {
    return process.env.UPSTASH_REDIS_REST_URL || '';
  },
  get upstashRedisToken(): string {
    return process.env.UPSTASH_REDIS_REST_TOKEN || '';
  },
  get hasUpstashRedis(): boolean {
    const url = process.env.UPSTASH_REDIS_REST_URL || '';
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || '';
    return Boolean(
      url &&
      token &&
      url.startsWith('http') &&
      !url.includes('your-database')
    );
  },

  // Upstash Vector
  get upstashVectorUrl(): string {
    return process.env.UPSTASH_VECTOR_REST_URL || '';
  },
  get upstashVectorToken(): string {
    return process.env.UPSTASH_VECTOR_REST_TOKEN || '';
  },
  get hasUpstashVector(): boolean {
    const url = process.env.UPSTASH_VECTOR_REST_URL || '';
    const token = process.env.UPSTASH_VECTOR_REST_TOKEN || '';
    return Boolean(
      url &&
      token &&
      url.startsWith('http') &&
      !url.includes('your-vector-index')
    );
  },

  // Upstash QStash
  get qstashToken(): string {
    return process.env.QSTASH_TOKEN || '';
  },
  get qstashSigningKey(): string {
    return process.env.QSTASH_CURRENT_SIGNING_KEY || '';
  },
  get hasQStash(): boolean {
    const token = process.env.QSTASH_TOKEN || '';
    return Boolean(
      token &&
      token.length > 8 &&
      !token.includes('your_qstash_token')
    );
  },

  // Runtime environment
  get isVercel(): boolean {
    return Boolean(process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL_ENV);
  },
  get appUrl(): string {
    return (
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    );
  },
};
