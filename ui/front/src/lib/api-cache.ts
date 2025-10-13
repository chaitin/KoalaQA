/**
 * API 缓存工具
 * 提供内存缓存、请求去重、自动重试等功能
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

interface RequestCache {
  promise: Promise<any>;
  timestamp: number;
}

// 内存缓存存储
const memoryCache = new Map<string, CacheEntry<any>>();

// 正在进行的请求缓存（防止重复请求）
const pendingRequests = new Map<string, RequestCache>();

// 默认缓存时间（毫秒）
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5分钟

/**
 * 生成缓存键
 */
export function generateCacheKey(url: string, params?: any): string {
  const paramStr = params ? JSON.stringify(params) : '';
  return `${url}:${paramStr}`;
}

/**
 * 从缓存获取数据
 */
export function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  
  if (!entry) {
    return null;
  }
  
  const now = Date.now();
  const isExpired = now - entry.timestamp > entry.expiresIn;
  
  if (isExpired) {
    memoryCache.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * 设置缓存数据
 */
export function setCache<T>(
  key: string,
  data: T,
  expiresIn: number = DEFAULT_CACHE_TIME
): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    expiresIn,
  });
}

/**
 * 清除缓存
 */
export function clearCache(key?: string): void {
  if (key) {
    memoryCache.delete(key);
  } else {
    memoryCache.clear();
  }
}

/**
 * 清除所有过期缓存
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  
  for (const [key, entry] of memoryCache.entries()) {
    if (now - entry.timestamp > entry.expiresIn) {
      memoryCache.delete(key);
    }
  }
}

/**
 * 请求去重装饰器
 * 如果相同的请求正在进行中，则返回正在进行的请求
 */
export function dedupeRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl: number = 1000 // 请求去重的时间窗口
): Promise<T> {
  const pending = pendingRequests.get(key);
  
  // 如果有正在进行的请求且未过期，返回现有请求
  if (pending && Date.now() - pending.timestamp < ttl) {
    return pending.promise;
  }
  
  // 创建新请求
  const promise = requestFn()
    .finally(() => {
      // 请求完成后清除
      pendingRequests.delete(key);
    });
  
  pendingRequests.set(key, {
    promise,
    timestamp: Date.now(),
  });
  
  return promise;
}

/**
 * 带缓存的请求包装器
 */
export async function cachedRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  options: {
    cacheTime?: number;
    forceRefresh?: boolean;
    enableDedup?: boolean;
  } = {}
): Promise<T> {
  const {
    cacheTime = DEFAULT_CACHE_TIME,
    forceRefresh = false,
    enableDedup = true,
  } = options;
  
  // 检查缓存
  if (!forceRefresh) {
    const cached = getFromCache<T>(key);
    if (cached !== null) {
      return cached;
    }
  }
  
  // 执行请求（可能带去重）
  const request = enableDedup
    ? dedupeRequest(key, requestFn)
    : requestFn();
  
  const data = await request;
  
  // 缓存结果
  setCache(key, data, cacheTime);
  
  return data;
}

/**
 * 请求重试工具
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = (error: any) => {
      // 默认只重试网络错误和 5xx 错误
      return (
        !error.response ||
        (error.response.status >= 500 && error.response.status < 600)
      );
    },
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // 如果不应该重试或已达到最大重试次数，抛出错误
      if (!shouldRetry(error) || attempt === maxRetries) {
        throw error;
      }
      
      // 等待后重试（指数退避）
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// 定期清理过期缓存（每5分钟）
if (typeof window !== 'undefined') {
  setInterval(clearExpiredCache, 5 * 60 * 1000);
}

