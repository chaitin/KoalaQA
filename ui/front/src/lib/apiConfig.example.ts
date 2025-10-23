/**
 * API 配置优化建议
 * 
 * 这个文件展示了如何更好地组织 API 调用层
 * 建议将 httpClient 中的认证逻辑分离到专门的文件中
 */

/**
 * 认证相关配置应该独立管理
 */

// ========== 认证工具 ==========
export const authUtils = {
  /**
   * 获取认证 token（支持 SSR 和 CSR）
   */
  async getAuthToken(): Promise<string | null> {
    if (typeof window === 'undefined') {
      // SSR 环境
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        return cookieStore.get('auth_token')?.value || null;
      } catch (error) {
        console.warn('Failed to get cookies in SSR:', error);
        return null;
      }
    } else {
      // 客户端环境
      try {
        const token = localStorage.getItem('auth_token');
        return token ? JSON.parse(token) : null;
      } catch {
        return localStorage.getItem('auth_token');
      }
    }
  },

  /**
   * 设置认证 token
   */
  setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', JSON.stringify(token));
    }
  },

  /**
   * 清除认证信息
   */
  clearAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('userInfo');

      // 清除 cookies
      const cookiesToClear = ['auth_token', 'session_id', 'csrf_token'];
      cookiesToClear.forEach((cookieName) => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
    }
  },
};

// ========== CSRF Token 管理 ==========
class CsrfTokenManager {
  private token: string | null = null;
  private promise: Promise<string> | null = null;

  async getToken(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    if (this.promise) {
      return this.promise;
    }

    this.promise = this.fetchToken();
    return this.promise;
  }

  private async fetchToken(): Promise<string> {
    try {
      const response = await fetch('/api/csrf', {
        credentials: 'include',
      });
      const data = await response.json();
      const token = data?.data || data;

      if (token) {
        this.token = token;
        return token;
      }

      throw new Error('Failed to get CSRF token');
    } catch (error) {
      console.error('CSRF token fetch error:', error);
      throw error;
    } finally {
      this.promise = null;
    }
  }

  clearToken(): void {
    this.token = null;
    this.promise = null;
  }
}

export const csrfManager = new CsrfTokenManager();

// ========== 请求拦截器建议 ==========
export const createRequestInterceptor = () => {
  return async (config: any) => {
    // 添加认证 token
    const token = await authUtils.getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // 添加 CSRF token（非 GET 请求）
    if (config.method?.toUpperCase() !== 'GET') {
      try {
        const csrfToken = await csrfManager.getToken();
        config.headers['X-CSRF-TOKEN'] = csrfToken;
      } catch (error) {
        console.warn('Failed to add CSRF token:', error);
      }
    }

    return config;
  };
};

// ========== 响应拦截器建议 ==========
export const createResponseInterceptor = () => {
  return {
    onSuccess: (response: any) => {
      if (response.status === 200 && response.data?.success) {
        return response.data.data;
      }
      return Promise.reject(response);
    },
    onError: (error: any) => {
      // 401: 未授权
      if (error.response?.status === 401) {
        if (typeof window !== 'undefined') {
          authUtils.clearAuth();
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/login')) {
            window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
          }
        }
      }

      // 403/419: CSRF token 失效
      if (error.response?.status === 403 || error.response?.status === 419) {
        csrfManager.clearToken();
      }

      return Promise.reject(error);
    },
  };
};

// ========== API 端点类型定义建议 ==========
export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  requiresAuth?: boolean;
}

export const API_ENDPOINTS = {
  // 用户相关
  USER: {
    GET_CURRENT: { method: 'GET', path: '/user', requiresAuth: true } as ApiEndpoint,
    LOGIN: { method: 'POST', path: '/user/login', requiresAuth: false } as ApiEndpoint,
    LOGOUT: { method: 'POST', path: '/user/logout', requiresAuth: true } as ApiEndpoint,
  },
  // 讨论相关
  DISCUSSION: {
    LIST: { method: 'GET', path: '/discussion', requiresAuth: false } as ApiEndpoint,
    GET: (id: number) => ({
      method: 'GET',
      path: `/discussion/${id}`,
      requiresAuth: false,
    }),
    CREATE: { method: 'POST', path: '/discussion', requiresAuth: true } as ApiEndpoint,
  },
  // ... 其他端点
} as const;

