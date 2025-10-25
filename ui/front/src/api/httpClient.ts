/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import alert from "@/components/alert";
import { clearCache, generateCacheKey, retryRequest } from "@/lib/api-cache";
import { API_CONSTANTS } from "@/lib/constants";
import { clearAllAuthCookies } from "@/utils/cookie";
import type {
  AxiosInstance,
  AxiosRequestConfig,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

const pathnameWhiteList = ["/login"];
export interface FullRequestParams
  extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

type ExtractDataProp<T> = T extends { data?: infer U } ? U : T;

// CSRF token 缓存
let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

// 获取CSRF token的函数
const getCsrfToken = async (): Promise<string> => {
  // 如果已经有缓存的token，直接返回
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  // 如果正在获取token，等待现有的请求
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // 创建新的获取token的Promise
  csrfTokenPromise = new Promise(async (resolve, reject) => {
    try {
      const response = await axios.get("/api/csrf", {
        withCredentials: true,
      });

      let token = "";
      if (response.data && response.data.success && response.data.data) {
        token = response.data.data;
      } else if (response.data && typeof response.data === "string") {
        token = response.data;
      }

      if (token) {
        csrfTokenCache = token;
        resolve(token);
      } else {
        reject(new Error("Failed to get CSRF token"));
      }
    } catch (error) {
      console.error("Failed to fetch CSRF token:", error);
      reject(error);
    } finally {
      // 清除Promise缓存，允许重试
      csrfTokenPromise = null;
    }
  });

  return csrfTokenPromise;
};

// 清除CSRF token缓存的函数（在token失效时调用）
export const clearCsrfTokenCache = () => {
  csrfTokenCache = null;
  csrfTokenPromise = null;
};

// 导出公共访问状态获取函数，供其他组件使用

// 清除所有认证信息的函数
export const clearAuthData = async (callLogoutAPI: boolean = true) => {
  if (typeof window !== "undefined") {
    // 清除本地存储的认证信息
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    localStorage.removeItem("userInfo");
    
    // 设置明确的空值，避免后续检查时误判
    localStorage.setItem("auth_token", "");
    localStorage.setItem("user", "");
    localStorage.setItem("userInfo", "");

    // 使用工具函数清除所有认证相关的cookie，包括auth_token
    clearAllAuthCookies();

    // 清除CSRF token缓存
    clearCsrfTokenCache();

    // 根据参数决定是否调用服务端登出API
    if (callLogoutAPI) {
      try {
        await fetch('/api/user/logout', {
          method: 'POST',
          credentials: 'include', // 确保发送 cookie
        });
      } catch (error) {
        console.warn("Failed to clear server-side cookies:", error);
        // 即使服务端清理失败，客户端清理仍然有效
      }
    }

    // 清除所有待处理的用户相关请求
    if (typeof window !== 'undefined' && window.httpClientInstance) {
      window.httpClientInstance.clearPendingRequestsByPath('/user');
    }

    // 强制刷新页面状态，确保所有组件重新初始化
    // 使用 setTimeout 避免在清理过程中立即刷新
    setTimeout(() => {
      // 触发自定义事件，通知所有组件认证状态已清除
      window.dispatchEvent(new CustomEvent('auth:cleared'));
    }, 100);
  }
};

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;
  private pendingRequests = new Map<string, Promise<any>>();

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      withCredentials: true, // 确保客户端请求自动发送cookie
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "/api",
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
    this.instance.interceptors.response.use(
      (response) => {
        const requestUrl = response.config?.url || "";
        const shouldShowError = requestUrl !== "/user";
        if (response.status === 200) {
          const res = response.data;
          if (res.success) {
            return res.data;
          }

          if (alert.error && shouldShowError) {
            alert.error(res.message || "网络异常");
          }
          return Promise.reject(res);
        }

        if (alert.error && shouldShowError) {
          alert.error(response.statusText);
        }
        return Promise.reject(response);
      },
      (error) => {
        // 如果是CSRF token相关错误，清除缓存
        if (error.response?.status === 403 || error.response?.status === 419) {
          clearCsrfTokenCache();
        }

        // 处理401未授权错误 - 清除认证信息并重定向到登录页
        if (error.response?.status === 401) {
          // 只在客户端环境下进行处理
          if (typeof window !== "undefined") {
            console.log(
              "401 Unauthorized error detected, clearing auth data:",
              error.response,
            );

            // 异步清除所有认证信息，包括cookie中的auth_token
            clearAuthData().then(() => {
              const currentPath = window.location.pathname;
              const isAuthPage =
                currentPath.startsWith("/login") ||
                currentPath.startsWith("/register");

              // 如果不在认证页面，直接重定向到登录页
              // middleware已经处理了public_access的检查，这里不需要重复检查
              if (!isAuthPage) {
                const fullPath =
                  window.location.pathname + window.location.search;
                const loginUrl = `/login?redirect=${encodeURIComponent(fullPath)}`;
                window.location.href = loginUrl;
              }
            }).catch((clearError) => {
              console.error("Failed to clear auth data on 401:", clearError);
              // 即使清理失败，也要重定向到登录页
              const currentPath = window.location.pathname;
              const isAuthPage =
                currentPath.startsWith("/login") ||
                currentPath.startsWith("/register");

              if (!isAuthPage) {
                const fullPath =
                  window.location.pathname + window.location.search;
                const loginUrl = `/login?redirect=${encodeURIComponent(fullPath)}`;
                window.location.href = loginUrl;
              }
            });
            
            return Promise.reject(error.response);
          }
        }

        // 检查请求路径，如果是 api/user 则不展示报错信息
        const requestUrl = error.config?.url || "";
        const shouldShowError = requestUrl !== "/user";

        if (alert.error && shouldShowError) {
          alert.error(error.message || "网络异常");
        }
        return Promise.reject(error.response);
      },
    );
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  // 清除缓存的方法
  public clearCache = (key?: string) => {
    if (key) {
      clearCache(key);
    } else {
      clearCache(); // 清除所有缓存
    }
  };

  // 清除所有待处理的请求
  public clearPendingRequests = () => {
    console.log(`[HttpClient] Clearing ${this.pendingRequests.size} pending requests`);
    this.pendingRequests.clear();
  };

  // 清除特定类型的待处理请求
  public clearPendingRequestsByPath = (pathPattern: string) => {
    const keysToDelete: string[] = [];
    for (const [key] of this.pendingRequests) {
      if (key.includes(pathPattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.pendingRequests.delete(key);
    });
    
    if (keysToDelete.length > 0) {
      console.log(`[HttpClient] Cleared ${keysToDelete.length} pending requests for path: ${pathPattern}`);
    }
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<ExtractDataProp<T>> => {
    // 生成缓存键和请求键
    const cacheKey = generateCacheKey(path, { query, body, ...params });
    const method = params.method?.toUpperCase() || "GET";
    const requestKey = `${method}:${cacheKey}`;

    // 检查是否有相同的请求正在进行中（请求去重）
    if (this.pendingRequests.has(requestKey)) {
      console.log(`[HttpClient] Request already pending: ${requestKey}`);
      return this.pendingRequests.get(requestKey);
    }

    // 对于 /api/user 请求，添加额外的去重逻辑
    if (path === '/user' && method === 'GET') {
      const userRequestKey = 'GET:/user';
      if (this.pendingRequests.has(userRequestKey)) {
        console.log('[HttpClient] User request already pending, reusing result');
        return this.pendingRequests.get(userRequestKey);
      }
    }

    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (
      type === ContentType.FormData &&
      body &&
      body !== null &&
      typeof body === "object"
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === ContentType.Text &&
      body &&
      body !== null &&
      typeof body !== "string"
    ) {
      body = JSON.stringify(body);
    }

    // 获取Authorization token
    const Authorization = await new Promise(async (resolve) => {
      if (typeof window === "undefined") {
        // SSR环境：从cookies中获取token
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          const token = cookieStore.get("auth_token")?.value || null;
          resolve(token);
        } catch (error) {
          console.warn("Failed to get cookies in SSR:", error);
          resolve(null);
        }
      } else {
        // 客户端环境：从localStorage获取token
        let token = "";
        try {
          token = JSON.parse(localStorage.getItem("auth_token") || '""');
        } catch (e) {
          // 如果解析失败，尝试直接获取字符串值
          token = localStorage.getItem("auth_token") || "";
        }
        resolve(token);
      }
    });

    // 准备headers
    const headers: Record<string, string> = {
      ...(requestParams.headers || {}),
      ...(type && type !== ContentType.FormData
        ? { "Content-Type": type }
        : {}),
      ...(Authorization ? { Authorization: `Bearer ${Authorization}` } : {}),
    };

    // 对于非GET请求，添加CSRF token
    if (method !== "GET") {
      try {
        const csrfToken = await getCsrfToken();
        headers["X-CSRF-TOKEN"] = csrfToken;
      } catch (error) {
        console.error("Failed to get CSRF token for request:", error);
        // 继续执行请求，让服务器处理CSRF验证失败
      }
    }

    // 在SSR环境中，需要手动转发cookie
    const requestConfig: any = {
      ...requestParams,
      headers,
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    };

    // 如果是SSR环境，转发所有cookie到API请求
    if (typeof window === "undefined") {
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();

        // 转发所有cookie（推荐用于开发环境）
        const allCookies = cookieStore.toString();
        if (allCookies) {
          requestConfig.headers.Cookie = allCookies;
        }

        // if (process.env.NODE_ENV === "development") {
        //   console.log(`[SSR] API Request to ${path}`);
        //   console.log(`[SSR] Cookies available:`, !!allCookies);
        //   console.log(`[SSR] Authorization token:`, !!Authorization);
        //   if (allCookies) {
        //     console.log(
        //       `[SSR] Cookie header:`,
        //       allCookies.substring(0, 100) + "...",
        //     );
        //   }
        // }
      } catch (error) {
        // 在某些情况下cookies可能不可用，忽略错误
        console.warn("Failed to get cookies in SSR:", error);
      }
    }

    // 创建请求 Promise 并添加到待处理请求中
    const requestPromise = retryRequest(
      () => this.instance.request(requestConfig),
      {
        maxRetries: API_CONSTANTS.RETRY_ATTEMPTS,
        retryDelay: API_CONSTANTS.RETRY_DELAY,
        shouldRetry: (error) => {
          const status = error?.response?.status;
          return !status || status >= 500;
        },
      },
    )
      .then((result) => {
        return result;
      })
      .finally(() => {
        // 请求完成后从待处理列表中移除
        this.pendingRequests.delete(requestKey);
      });

    // 将请求添加到待处理列表中
    this.pendingRequests.set(requestKey, requestPromise);

    return requestPromise;
  };
}

// 创建全局 httpClient 实例
const httpClientInstance = new HttpClient({
  format: "json",
  baseURL: (process.env.TARGET || "") + "/api",
});

// 在客户端环境中将实例挂载到 window 对象上，方便全局访问
if (typeof window !== "undefined") {
  (window as any).httpClientInstance = httpClientInstance;
}

export default httpClientInstance.request;
