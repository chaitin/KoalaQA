/**
 * 错误处理工具函数
 * 用于安全地处理错误对象，避免序列化问题
 */

/**
 * 创建一个可序列化的错误对象
 * 移除不可序列化的属性，如函数、循环引用等
 */
export function createSerializableError(error: any): Error {
  if (!error) {
    return new Error('Unknown error');
  }

  // 如果是 Error 对象，提取基本信息
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'An error occurred',
      stack: error.stack || undefined,
    } as Error;
  }

  // 如果是普通对象，尝试提取错误信息
  if (typeof error === 'object') {
    const message = error.message || error.error || error.msg || 'An error occurred';
    return {
      name: error.name || 'Error',
      message: String(message),
      stack: error.stack || undefined,
    } as Error;
  }

  // 如果是字符串或其他类型
  return {
    name: 'Error',
    message: String(error),
    stack: undefined,
  } as Error;
}

/**
 * 安全地记录错误信息
 * 避免在服务端渲染时出现序列化问题
 */
export function safeLogError(context: string, error: any): void {
  if (process.env.NODE_ENV === 'development') {
    const serializableError = createSerializableError(error);
    console.error(`${context}:`, {
      message: serializableError.message,
      name: serializableError.name,
      stack: serializableError.stack,
    });
  }
}

/**
 * 安全地获取错误消息
 * 确保返回的字符串是可序列化的
 */
export function getErrorMessage(error: any): string {
  if (!error) {
    return 'Unknown error';
  }

  if (error instanceof Error) {
    return error.message || 'An error occurred';
  }

  if (typeof error === 'object') {
    return error.message || error.error || error.msg || 'An error occurred';
  }

  return String(error);
}

/**
 * 包装 API 调用，提供安全的错误处理
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  fallback: T | null = null,
  context: string = 'API call'
): Promise<T | null> {
  try {
    return await apiCall();
  } catch (error) {
    safeLogError(context, error);
    return fallback;
  }
}

/**
 * 包装多个 API 调用，提供安全的错误处理
 */
export async function safeBatchApiCalls<T extends Record<string, () => Promise<any>>>(
  calls: T,
  context: string = 'Batch API calls'
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> | null }> {
  const results = {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> | null };

  await Promise.all(
    Object.entries(calls).map(async ([key, apiCall]) => {
      try {
        results[key as keyof T] = await apiCall();
      } catch (error) {
        safeLogError(`${context} - ${key}`, error);
        results[key as keyof T] = null;
      }
    })
  );

  return results;
}
