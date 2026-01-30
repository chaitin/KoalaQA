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
  GetAdminChatParams,
  ModelSystemChat,
  SvcChatUpdateReq,
} from "./types";

/**
 * No description
 *
 * @tags chat
 * @name GetAdminChat
 * @summary get chat info
 * @request GET:/admin/chat
 * @response `200` `(ContextResponse & {
    data?: ModelSystemChat,

})` OK
 */

export const getAdminChat = (
  query: GetAdminChatParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelSystemChat;
    }
  >({
    path: `/admin/chat`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags chat
 * @name PutAdminChat
 * @summary set chat info
 * @request PUT:/admin/chat
 * @response `200` `ContextResponse` OK
 */

export const putAdminChat = (
  req: SvcChatUpdateReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/chat`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
