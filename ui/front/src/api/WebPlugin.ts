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
import { ContextResponse, ModelSystemWebPlugin } from "./types";

/**
 * No description
 *
 * @tags web_plugin
 * @name GetAdminSystemWebPlugin
 * @summary web plugin detail
 * @request GET:/admin/system/web_plugin
 * @response `200` `(ContextResponse & {
    data?: ModelSystemWebPlugin,

})` OK
 */

export const getAdminSystemWebPlugin = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelSystemWebPlugin;
    }
  >({
    path: `/admin/system/web_plugin`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags web_plugin
 * @name PutAdminSystemWebPlugin
 * @summary update web plugin config
 * @request PUT:/admin/system/web_plugin
 * @response `200` `ContextResponse` OK
 */

export const putAdminSystemWebPlugin = (
  req: ModelSystemWebPlugin,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/system/web_plugin`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags web_plugin
 * @name GetSystemWebPlugin
 * @summary web plugin detail
 * @request GET:/system/web_plugin
 * @response `200` `(ContextResponse & {
    data?: ModelSystemWebPlugin,

})` OK
 */

export const getSystemWebPlugin = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelSystemWebPlugin;
    }
  >({
    path: `/system/web_plugin`,
    method: "GET",
    format: "json",
    ...params,
  });
