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
import { ContextResponse, ModelSystemBrand } from "./types";

/**
 * No description
 *
 * @tags brand
 * @name GetAdminSystemBrand
 * @summary brand detail
 * @request GET:/admin/system/brand
 * @response `200` `(ContextResponse & {
    data?: ModelSystemBrand,

})` OK
 */

export const getAdminSystemBrand = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelSystemBrand;
    }
  >({
    path: `/admin/system/brand`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags brand
 * @name PutAdminSystemBrand
 * @summary update brand config
 * @request PUT:/admin/system/brand
 * @response `200` `ContextResponse` OK
 */

export const putAdminSystemBrand = (
  req: ModelSystemBrand,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/system/brand`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags brand
 * @name GetSystemBrand
 * @summary brand detail
 * @request GET:/system/brand
 * @response `200` `(ContextResponse & {
    data?: ModelSystemBrand,

})` OK
 */

export const getSystemBrand = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelSystemBrand;
    }
  >({
    path: `/system/brand`,
    method: "GET",
    format: "json",
    ...params,
  });
