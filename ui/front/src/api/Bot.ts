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
import { ContextResponse, PutAdminBotPayload, SvcBotGetRes } from "./types";

/**
 * No description
 *
 * @tags bot
 * @name GetAdminBot
 * @summary get bot info
 * @request GET:/admin/bot
 * @response `200` `(ContextResponse & {
    data?: SvcBotGetRes,

})` OK
 */

export const getAdminBot = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: SvcBotGetRes;
    }
  >({
    path: `/admin/bot`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags bot
 * @name PutAdminBot
 * @summary set bot info
 * @request PUT:/admin/bot
 * @response `200` `ContextResponse` OK
 */

export const putAdminBot = (
  data: PutAdminBotPayload,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/bot`,
    method: "PUT",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags bot
 * @name GetBot
 * @summary get bot info
 * @request GET:/bot
 * @response `200` `(ContextResponse & {
    data?: SvcBotGetRes,

})` OK
 */

export const getBot = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: SvcBotGetRes;
    }
  >({
    path: `/bot`,
    method: "GET",
    format: "json",
    ...params,
  });
