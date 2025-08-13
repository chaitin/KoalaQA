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
import { ContextResponse, ModelAuth, SvcLoginMethodGetRes } from "./types";

/**
 * No description
 *
 * @tags login_method
 * @name GetAdminSystemLoginMethod
 * @summary login_method detail
 * @request GET:/admin/system/login_method
 * @response `200` `(ContextResponse & {
    data?: SvcLoginMethodGetRes,

})` OK
 */

export const getAdminSystemLoginMethod = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: SvcLoginMethodGetRes;
    }
  >({
    path: `/admin/system/login_method`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags login_method
 * @name PutAdminSystemLoginMethod
 * @summary update login_method config
 * @request PUT:/admin/system/login_method
 * @response `200` `ContextResponse` OK
 */

export const putAdminSystemLoginMethod = (
  req: ModelAuth,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/system/login_method`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
