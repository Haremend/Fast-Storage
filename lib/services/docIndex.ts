import { RedisService } from './redis';
import { DocumentItem } from '../types';

/** Redis 中 Blob 文件元数据索引的键 */
export const REDIS_BLOB_INDEX_KEY = 'blob:documents:index';

/** 读取整个 Blob 文件元数据索引（key → DocumentItem 的部分字段） */
export async function getDocIndex(): Promise<Record<string, Partial<DocumentItem>>> {
  const index = await RedisService.get<Record<string, Partial<DocumentItem>>>(REDIS_BLOB_INDEX_KEY);
  return index && typeof index === 'object' ? index : {};
}

/** 写回整个索引（TTL 30 天） */
export async function setDocIndex(map: Record<string, Partial<DocumentItem>>): Promise<void> {
  await RedisService.set(REDIS_BLOB_INDEX_KEY, map, 86400 * 30);
}