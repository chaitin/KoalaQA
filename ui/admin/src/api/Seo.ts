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
import { ContextResponse, ModelSystemSEO } from "./types";

/**
 * No description
 *
 * @tags seo
 * @name GetAdminSystemSeo
 * @summary set config detail
 * @request GET:/admin/system/seo
 * @response `200` `(ContextResponse & {
    data?: ModelSystemSEO,

})` OK
 */

export const getAdminSystemSeo = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelSystemSEO;
    }
  >({
    path: `/admin/system/seo`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags seo
 * @name PutAdminSystemSeo
 * @summary update seo config
 * @request PUT:/admin/system/seo
 * @response `200` `ContextResponse` OK
 */

export const putAdminSystemSeo = (
  req: ModelSystemSEO,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/system/seo`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags seo
 * @name GetSystemSeo
 * @summary set config detail
 * @request GET:/system/seo
 * @response `200` `(ContextResponse & {
    data?: ModelSystemSEO,

})` OK
 */

export const getSystemSeo = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelSystemSEO;
    }
  >({
    path: `/system/seo`,
    method: "GET",
    format: "json",
    ...params,
  });
