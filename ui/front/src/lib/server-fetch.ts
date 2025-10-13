/**
 * 服务端数据获取工具
 * 优化的 SSR 数据获取，支持缓存、错误处理
 */

import { cache } from 'react';
import { cookies } from 'next/headers';

/**
 * 创建服务端 API 请求
 * 使用 React cache 来避免重复请求
 */
export const createServerFetch = <T = any>(
  url: string,
  options: RequestInit & {
    cache?: RequestCache;
    next?: NextFetchRequestConfig;
    timeout?: number;
  } = {}
) => {
  return cache(async (): Promise<T> => {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;
      
      // 转发所有 cookies
      const allCookies = cookieStore.toString();
      
      const {
        timeout = 10000,
        headers = {},
        next,
        cache: cacheOption,
        ...restOptions
      } = options;
      
      // 创建超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const baseUrl = process.env.TARGET || process.env.NEXT_PUBLIC_API_URL || '';
        const fullUrl = baseUrl + url;
        
        const response = await fetch(fullUrl, {
          ...restOptions,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(allCookies ? { Cookie: allCookies } : {}),
            ...headers,
          },
          signal: controller.signal,
          cache: cacheOption,
          next,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 处理业务层错误
        if (data.success === false) {
          throw new Error(data.message || 'API request failed');
        }
        
        return data.data as T;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      console.error(`Server fetch error for ${url}:`, error);
      throw error;
    }
  });
};

/**
 * 并行获取多个数据
 */
export async function fetchParallel<T extends Record<string, () => Promise<any>>>(
  fetchers: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const keys = Object.keys(fetchers) as Array<keyof T>;
  const promises = keys.map(key => fetchers[key]());
  
  const results = await Promise.all(promises);
  
  return keys.reduce((acc, key, index) => {
    acc[key] = results[index];
    return acc;
  }, {} as any);
}

/**
 * 带错误处理的数据获取
 */
export async function fetchWithFallback<T>(
  fetchFn: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  try {
    return await fetchFn();
  } catch (error) {
    console.error('Fetch failed, using fallback:', error);
    return fallbackValue;
  }
}

/**
 * 预定义的缓存配置
 */
export const CACHE_CONFIG = {
  // 静态数据 - 长时间缓存
  STATIC: {
    next: { revalidate: 3600 }, // 1小时
  },
  // 动态数据 - 短时间缓存
  DYNAMIC: {
    next: { revalidate: 60 }, // 1分钟
  },
  // 实时数据 - 不缓存
  REALTIME: {
    cache: 'no-store' as RequestCache,
  },
  // 仅缓存在构建时
  BUILD_TIME: {
    cache: 'force-cache' as RequestCache,
  },
} as const;

