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
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API ##
 * ## ##
 * ## AUTHOR: acacode ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import { message } from "@ctzhian/ui";
import type {
  AxiosInstance,
  AxiosRequestConfig,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";
import qs from "qs";

export type QueryParamsType = Record<string | number, any>;

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
const translateErrorMessage = (error: any) => {
  switch (error.response?.data.err) {
    case "email already used":
      return "该邮箱已被其他账号绑定";
    default:
      return error.response?.data.err;
  }
};
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

// CSRF Token 管理
let cachedCsrfToken: string | null = null;

// 获取 CSRF Token（登录后获取，登出时清除）
export const getCsrfToken = async (): Promise<string | null> => {
  // 如果已有缓存的token，直接返回
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  // 只在客户端环境中获取token
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // 调用后端API获取CSRF token
    const response = await fetch("/api/csrf", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.success && data.data) {
      // 从后端获取已计算好的CSRF token
      const csrfToken = data.data;
      if (csrfToken) {
        // 缓存token
        cachedCsrfToken = csrfToken;
        return csrfToken;
      }
    }
  } catch (error) {
    console.warn("Failed to get CSRF token:", error);
  }

  return null;
};

// 清除缓存的CSRF token
export const clearCsrfToken = () => {
  cachedCsrfToken = null;
};

// 清除所有认证相关的数据
const clearAuthData = () => {
  if (typeof window !== "undefined") {
    // 清除CSRF token缓存
    clearCsrfToken();

    // 清除所有认证相关的cookie
    const authCookies = ["auth_token", "login_site"];
    authCookies.forEach((cookieName) => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });

    // 使用 setTimeout 避免在清理过程中立即刷新
    setTimeout(() => {
      // 触发自定义事件，通知所有组件认证状态已清除
      window.dispatchEvent(new CustomEvent("auth:cleared"));
    }, 100);
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
      withCredentials: true,
      timeout: 0, // 禁用超时（默认即为0，这里显式声明）
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "/api",
      paramsSerializer: {
        serialize: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
      },
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
    this.instance.interceptors.response.use(
      (response) => {
        if (response.status === 200) {
          const res = response.data;
          if (res.success) {
            return res.data;
          }

          // 检查是否是CSRF错误
          if (
            res.data === "csrf token mismatch" &&
            typeof window !== "undefined"
          ) {
            // 清除缓存的CSRF token
            clearCsrfToken();
            // 返回特殊错误，让调用者可以重试
            return Promise.reject({ ...res, _csrfError: true });
          }

          if (true) {
            message.error(res.message || "网络异常");
          }
          return Promise.reject(res);
        }
        message.error(response.statusText);
        return Promise.reject(response);
      },
      (error) => {
        if (error.response?.status === 401) {
          window.location.href = `/login?redirect=${window.location.pathname}`;
        }

        // 如果是CSRF token错误且已经重试过，或者不是CSRF错误，才显示错误提示
        if (true) {
          message.error(translateErrorMessage(error));
        }
        return Promise.reject(error.response);
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
    const headers = {
      ...(requestParams.headers || {}),
      ...(type && type !== ContentType.FormData
        ? { "Content-Type": type }
        : {}),
    };
    const method = params.method?.toUpperCase() || "GET";

    // 为非安全方法（非GET/OPTIONS/HEAD）添加CSRF token
    const needsCsrf = !["GET", "OPTIONS", "HEAD"].includes(method);
    if (needsCsrf && typeof window !== "undefined") {
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        headers["X-CSRF-TOKEN"] = csrfToken;
      }
    }

    return this.instance
      .request({
        ...requestParams,
        headers,
        params: query,
        responseType: responseFormat,
        data: body,
        url: path,
      })
      .catch(async (error) => {
        // 如果是CSRF错误，重新获取token并重试一次
        if (error?._csrfError && typeof window !== "undefined") {
          console.log(
            "[HttpClient] CSRF token mismatch, retrying with new token",
          );

          // 重新获取CSRF token
          const newCsrfToken = await getCsrfToken();
          if (newCsrfToken) {
            // 更新headers中的CSRF token
            headers["X-CSRF-TOKEN"] = newCsrfToken;

            // 重试请求
            return this.instance
              .request({
                ...requestParams,
                headers,
                params: query,
                responseType: responseFormat,
                data: body,
                url: path,
              })
              .catch((retryError) => {
                // 重试失败，抛出原始错误（但移除特殊标记）
                const { _csrfError, ...cleanError } = retryError;
                throw cleanError;
              });
          }
        }

        // 不是CSRF错误或重试失败，直接抛出
        throw error;
      });
  };
}
export default new HttpClient({ format: "json" }).request;
