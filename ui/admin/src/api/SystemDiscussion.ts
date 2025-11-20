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
import { ContextResponse, ModelSystemDiscussion } from "./types";

/**
 * No description
 *
 * @tags system_discussion
 * @name GetAdminSystemDiscussion
 * @summary system discussion detail
 * @request GET:/admin/system/discussion
 * @response `200` `(ContextResponse & {
    data?: ModelSystemDiscussion,

})` OK
 */

export const getAdminSystemDiscussion = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelSystemDiscussion;
    }
  >({
    path: `/admin/system/discussion`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags system_discussion
 * @name PutAdminSystemDiscussion
 * @summary update system discussion config
 * @request PUT:/admin/system/discussion
 * @response `200` `ContextResponse` OK
 */

export const putAdminSystemDiscussion = (
  req: ModelSystemDiscussion,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/system/discussion`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
