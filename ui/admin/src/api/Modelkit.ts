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

import request, { ContentType, RequestParams } from "./httpClient";
import {
  ContextResponse,
  ModelLLM,
  PutAdminModelIdParams,
  SvcCheckModelRes,
  SvcMKCreateReq,
  SvcMKSupportedReq,
  SvcMKSupportedRes,
  SvcMKUpdateReq,
  SvcModelKitCheckReq,
} from "./types";

/**
 * No description
 *
 * @tags modelkit
 * @name PostAdminModel
 * @summary create model
 * @request POST:/admin/model
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postAdminModel = (
  req: SvcMKCreateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/model`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags modelkit
 * @name PostAdminModelCheck
 * @summary check model
 * @request POST:/admin/model/check
 * @response `200` `(ContextResponse & {
    data?: SvcCheckModelRes,

})` OK
 */

export const postAdminModelCheck = (
  req: SvcModelKitCheckReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcCheckModelRes;
    }
  >({
    path: `/admin/model/check`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags modelkit
 * @name GetAdminModelList
 * @summary list model
 * @request GET:/admin/model/list
 * @response `200` `(ContextResponse & {
    data?: (ModelLLM)[],

})` OK
 */

export const getAdminModelList = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelLLM[];
    }
  >({
    path: `/admin/model/list`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags modelkit
 * @name PostAdminModelProviderSupported
 * @summary list model provider supported
 * @request POST:/admin/model/provider/supported
 * @response `200` `(ContextResponse & {
    data?: SvcMKSupportedRes,

})` OK
 */

export const postAdminModelProviderSupported = (
  req: SvcMKSupportedReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcMKSupportedRes;
    }
  >({
    path: `/admin/model/provider/supported`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags modelkit
 * @name PutAdminModelId
 * @summary update model
 * @request PUT:/admin/model/{id}
 * @response `200` `(ContextResponse & {
    data?: Record<string, any>,

})` OK
 */

export const putAdminModelId = (
  { id, ...query }: PutAdminModelIdParams,
  req: SvcMKUpdateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: Record<string, any>;
    }
  >({
    path: `/admin/model/${id}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
