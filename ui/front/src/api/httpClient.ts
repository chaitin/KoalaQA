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

// 公共访问状态缓存
let publicAccessCache: boolean | null = null;
let publicAccessPromise: Promise<boolean> | null = null;

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

// 获取公共访问状态的函数
const getPublicAccessStatus = async (): Promise<boolean> => {
  // 如果已经有缓存的状态，直接返回
  if (publicAccessCache !== null) {
    return publicAccessCache;
  }

  // 如果正在获取状态，等待现有的请求
  if (publicAccessPromise) {
    return publicAccessPromise;
  }

  // 创建新的获取状态的Promise
  publicAccessPromise = new Promise(async (resolve) => {
    try {
      const response = await axios.get("/api/user/login_method", {
        withCredentials: true,
      });

      const publicAccess = response.data?.data?.public_access ?? false;
      publicAccessCache = publicAccess;
      resolve(publicAccess);
    } catch (error) {
      console.error("Failed to fetch public access status:", error);
      // 默认返回false，要求登录
      publicAccessCache = false;
      resolve(false);
    } finally {
      // 清除Promise缓存，允许重试
      publicAccessPromise = null;
    }
  });

  return publicAccessPromise;
};

// 清除公共访问状态缓存的函数
export const clearPublicAccessCache = () => {
  publicAccessCache = null;
  publicAccessPromise = null;
};

// 导出公共访问状态获取函数，供其他组件使用
export const checkPublicAccess = getPublicAccessStatus;

// 清除所有认证信息的函数
export const clearAuthData = () => {
  if (typeof window !== "undefined") {
    // 清除本地存储的认证信息
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    localStorage.removeItem("userInfo");

    // 清除所有相关的cookie
    const cookiesToClear = [
      "auth_token",
      "session_id",
      "csrf_token",
      "_vercel_jwt",
    ];
    cookiesToClear.forEach((cookieName) => {
      // 清除根路径的cookie
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
      // 清除当前路径的cookie
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${window.location.pathname}; SameSite=Lax`;
      // 清除域名级别的cookie
      if (window.location.hostname !== "localhost") {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}; SameSite=Lax`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}; SameSite=Lax`;
      }
    });

    // 清除CSRF token缓存和公共访问状态缓存
    clearCsrfTokenCache();
    clearPublicAccessCache();
  }
};
export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

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
          // 标准化后端错误
          const backendError: any = new Error(res.message || "网络异常");
          backendError.isBackend = true;
          backendError.status = response.status;
          backendError.code = res.code;
          backendError.data = res;
          backendError.url = requestUrl;
          return Promise.reject(backendError);
        }

        if (alert.error && shouldShowError) {
          alert.error(response.statusText);
        }
        // 非200响应同样标准化
        const httpError: any = new Error(response.statusText || "HTTP错误");
        httpError.isBackend = true;
        httpError.status = response.status;
        httpError.code = undefined;
        httpError.data = response.data;
        httpError.url = requestUrl;
        return Promise.reject(httpError);
      },
      (error) => {
        // 如果是CSRF token相关错误，清除缓存
        if (error.response?.status === 403 || error.response?.status === 419) {
          clearCsrfTokenCache();
        }

        // 处理401未授权错误 - 根据public_access状态决定是否重定向到登录页
        if (error.response?.status === 401) {
          // 只在客户端环境下进行重定向
          if (typeof window !== "undefined") {
            // 检查当前是否已经在登录相关页面，避免死循环
            const currentPath = window.location.pathname;
            const isAuthPage =
              currentPath.startsWith("/login") ||
              currentPath.startsWith("/register");

            if (!isAuthPage) {
              // 检查是否启用了公共访问
              getPublicAccessStatus().then((publicAccess) => {
                if (!publicAccess) {
                  console.log(error.response);

                  // 清除所有认证信息
                  clearAuthData();

                  // 获取当前页面路径作为重定向参数
                  const fullPath =
                    window.location.pathname + window.location.search;
                  const loginUrl = `/login?redirect=${encodeURIComponent(fullPath)}`;

                  // 重定向到登录页
                  window.location.href = loginUrl;
                }
                // 如果public_access为true，不进行重定向，允许匿名访问
              }).catch(() => {
                // 如果获取public_access状态失败，默认跳转到登录页
                console.log(error.response);
                clearAuthData();
                const fullPath =
                  window.location.pathname + window.location.search;
                const loginUrl = `/login?redirect=${encodeURIComponent(fullPath)}`;
                window.location.href = loginUrl;
              });
            }
            return Promise.reject(error.response);
          }
        }

        // 检查请求路径，如果是 api/user 则不展示报错信息
        const requestUrl = error.config?.url || "";
        const shouldShowError = requestUrl !== "/user";

        if (alert.error && shouldShowError) {
          const backendMsg = error?.response?.data?.message;
          alert.error(backendMsg || error.message || "网络异常");
        }
        // 统一抛出标准化的 Error
        const normalized: any = new Error(
          (error?.response?.data?.err || error.message || "请求失败") + `(trace_id: ${error?.response?.data?.trace_id})` || '',
        );
        normalized.isBackend = Boolean(error?.response);
        normalized.status = error?.response?.status;
        normalized.code = error?.response?.data?.code;
        normalized.data = error?.response?.data;
        normalized.url = error?.config?.url || "";
        return Promise.reject(normalized);
      },
    );
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
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
    const method = params.method?.toUpperCase() || "GET";
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

        // 方法1: 转发所有cookie（推荐用于开发环境）
        const allCookies = cookieStore.toString();
        if (allCookies) {
          requestConfig.headers.Cookie = allCookies;
        }

        // 方法2: 如果需要选择性转发，可以使用下面的代码
        // const cookiesToForward = ['auth_token', 'session_id', 'csrf_token', '_vercel_jwt'];
        // const cookieValues = cookiesToForward
        //   .map(name => {
        //     const value = cookieStore.get(name)?.value;
        //     return value ? `${name}=${value}` : null;
        //   })
        //   .filter(Boolean);
        //
        // if (cookieValues.length > 0) {
        //   requestConfig.headers.Cookie = cookieValues.join('; ');
        // }

        // 调试信息（生产环境可以移除）
        if (process.env.NODE_ENV === "development") {
          console.log(`[SSR] API Request to ${path}`);
          console.log(`[SSR] Cookies available:`, !!allCookies);
          console.log(`[SSR] Authorization token:`, !!Authorization);
          if (allCookies) {
            console.log(
              `[SSR] Cookie header:`,
              allCookies.substring(0, 100) + "...",
            );
          }
        }
      } catch (error) {
        // 在某些情况下cookies可能不可用，忽略错误
        console.warn("Failed to get cookies in SSR:", error);
      }
    }

    return this.instance.request(requestConfig);
  };
}
export default new HttpClient({
  format: "json",
  baseURL: (process.env.TARGET || "") + "/api",
}).request;
