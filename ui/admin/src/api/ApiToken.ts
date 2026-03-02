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
  DeleteAdminTokenTokenIdParams,
  ModelAPIToken,
  ModelListRes,
  SvcAPITokenCreateReq,
} from "./types";

/**
 * @description backend list api token
 *
 * @tags api_token
 * @name GetAdminToken
 * @summary backend list api token
 * @request GET:/admin/token
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelAPIToken)[],

}),

})` OK
 */

export const getAdminToken = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelAPIToken[];
      };
    }
  >({
    path: `/admin/token`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags api_token
 * @name PostAdminToken
 * @summary create api token
 * @request POST:/admin/token
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postAdminToken = (
  req: SvcAPITokenCreateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/token`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags api_token
 * @name DeleteAdminTokenTokenId
 * @summary delete api token
 * @request DELETE:/admin/token/{token_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminTokenTokenId = (
  { tokenId, ...query }: DeleteAdminTokenTokenIdParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/token/${tokenId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });
