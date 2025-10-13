/**
 * API 辅助函数
 * 为 API 调用提供统一的封装和优化
 */

import { cache } from 'react';
import httpClient from '@/api/httpClient';
import type { FullRequestParams } from '@/api/httpClient';

/**
 * 创建缓存的 API 调用
 * 使用 React cache 在同一次渲染中避免重复请求
 */
export function createCachedApiCall<T>(
  apiCall: (params?: any) => Promise<T>
) {
  return cache(apiCall);
}

/**
 * 安全的 API 调用 - 带错误处理和降级
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  fallback: T | null = null
): Promise<T | null> {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    return fallback;
  }
}

/**
 * 批量 API 调用
 */
export async function batchApiCalls<T extends Record<string, () => Promise<any>>>(
  calls: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> | null }> {
  const entries = Object.entries(calls);
  
  const results = await Promise.allSettled(
    entries.map(([_, fn]) => fn())
  );
  
  return entries.reduce((acc, [key], index) => {
    const result = results[index];
    acc[key as keyof T] = result.status === 'fulfilled' ? result.value : null;
    return acc;
  }, {} as any);
}

/**
 * 条件 API 调用 - 只在条件满足时调用
 */
export async function conditionalApiCall<T>(
  condition: boolean | (() => boolean),
  apiCall: () => Promise<T>,
  fallback: T | null = null
): Promise<T | null> {
  const shouldCall = typeof condition === 'function' ? condition() : condition;
  
  if (!shouldCall) {
    return fallback;
  }
  
  return apiCall();
}

/**
 * 分页数据获取辅助
 */
export function createPaginationHelper(baseParams: URLSearchParams = new URLSearchParams()) {
  return {
    setPage(page: number) {
      baseParams.set('page', String(page));
      return this;
    },
    setPageSize(size: number) {
      baseParams.set('size', String(size));
      return this;
    },
    setSort(sort: string) {
      if (sort) baseParams.set('filter', sort);
      return this;
    },
    setSearch(keyword: string) {
      if (keyword) baseParams.set('keyword', keyword);
      return this;
    },
    addFilter(key: string, value: string | string[]) {
      if (Array.isArray(value)) {
        value.forEach(v => baseParams.append(key, v));
      } else {
        baseParams.set(key, value);
      }
      return this;
    },
    build() {
      return baseParams;
    }
  };
}

/**
 * URL 参数构建器
 */
export class ApiParamsBuilder {
  private params = new URLSearchParams();
  
  add(key: string, value: string | number | boolean | undefined | null) {
    if (value !== undefined && value !== null && value !== '') {
      this.params.set(key, String(value));
    }
    return this;
  }
  
  addMultiple(key: string, values: Array<string | number>) {
    values.forEach(value => {
      if (value !== undefined && value !== null && value !== '') {
        this.params.append(key, String(value));
      }
    });
    return this;
  }
  
  addObject(obj: Record<string, any>) {
    Object.entries(obj).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        this.addMultiple(key, value);
      } else {
        this.add(key, value);
      }
    });
    return this;
  }
  
  build() {
    return this.params;
  }
  
  toString() {
    return this.params.toString();
  }
}

/**
 * API 响应类型定义
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 错误处理辅助
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: any): never {
  if (error instanceof ApiError) {
    throw error;
  }
  
  const message = error?.message || error?.data?.message || 'Unknown API error';
  const code = error?.code || error?.status || error?.response?.status;
  
  throw new ApiError(message, code, error);
}

/**
 * 带超时的 API 调用
 */
export async function apiCallWithTimeout<T>(
  apiCall: () => Promise<T>,
  timeout = 30000
): Promise<T> {
  return Promise.race([
    apiCall(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    ),
  ]);
}

/**
 * 重试 API 调用
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
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
      const status = error?.response?.status || error?.status;
      return !status || status >= 500;
    },
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt === maxRetries) {
        throw error;
      }

      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 轮询 API 直到条件满足
 */
export async function pollUntil<T>(
  apiCall: () => Promise<T>,
  condition: (data: T) => boolean,
  options: {
    interval?: number;
    maxAttempts?: number;
    timeout?: number;
  } = {}
): Promise<T> {
  const { interval = 1000, maxAttempts = 30, timeout = 30000 } = options;

  const startTime = Date.now();
  let attempts = 0;

  while (attempts < maxAttempts && Date.now() - startTime < timeout) {
    const data = await apiCall();

    if (condition(data)) {
      return data;
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Polling timeout or max attempts reached');
}

/**
 * 串行执行 API 调用
 */
export async function sequentialApiCalls<T>(
  calls: Array<() => Promise<T>>
): Promise<T[]> {
  const results: T[] = [];

  for (const call of calls) {
    const result = await call();
    results.push(result);
  }

  return results;
}

/**
 * 限流 API 调用（控制并发数）
 */
export async function throttledApiCalls<T>(
  calls: Array<() => Promise<T>>,
  concurrency = 3
): Promise<T[]> {
  const results: T[] = new Array(calls.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < calls.length; i++) {
    const promise = calls[i]().then(result => {
      results[i] = result;
    });

    const executing_promise = promise.then(() => {
      executing.splice(executing.indexOf(executing_promise), 1);
    });

    executing.push(executing_promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 转换 API 响应
 */
export function transformResponse<T, R>(
  apiCall: () => Promise<T>,
  transformer: (data: T) => R
): Promise<R> {
  return apiCall().then(transformer);
}

/**
 * 缓存包装器（简单版本，用于客户端）
 */
export function withCache<T>(
  key: string,
  apiCall: () => Promise<T>,
  ttl = 300000 // 5分钟
): Promise<T> {
  if (typeof window === 'undefined') {
    return apiCall();
  }

  const cached = sessionStorage.getItem(key);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttl) {
        return Promise.resolve(data);
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  return apiCall().then(data => {
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch (e) {
      // 忽略存储错误
    }
    return data;
  });
}

/**
 * 构建查询字符串
 */
export function buildQueryString(params: Record<string, any>): string {
  const builder = new ApiParamsBuilder();
  builder.addObject(params);
  const query = builder.toString();
  return query ? `?${query}` : '';
}

/**
 * 从 URL 解析查询参数
 */
export function parseQueryString(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url, window.location.origin);
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

/**
 * 合并 API 参数
 */
export function mergeParams(
  ...paramsList: (URLSearchParams | Record<string, any>)[]
): URLSearchParams {
  const result = new URLSearchParams();

  paramsList.forEach(params => {
    if (params instanceof URLSearchParams) {
      params.forEach((value, key) => {
        result.append(key, value);
      });
    } else {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          result.append(key, String(value));
        }
      });
    }
  });

  return result;
}
