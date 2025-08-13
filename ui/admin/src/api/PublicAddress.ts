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
import { ContextResponse, ModelPublicAddress } from "./types";

/**
 * No description
 *
 * @tags public_address
 * @name GetAdminSystemPublicAddress
 * @summary public_address detail
 * @request GET:/admin/system/public_address
 * @response `200` `(ContextResponse & {
    data?: ModelPublicAddress,

})` OK
 */

export const getAdminSystemPublicAddress = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelPublicAddress;
    }
  >({
    path: `/admin/system/public_address`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags public_address
 * @name PutAdminSystemPublicAddress
 * @summary update public_address config
 * @request PUT:/admin/system/public_address
 * @response `200` `ContextResponse` OK
 */

export const putAdminSystemPublicAddress = (
  req: ModelPublicAddress,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/system/public_address`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
