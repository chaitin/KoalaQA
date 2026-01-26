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
import { ContextResponse, ModelSystemChat } from "./types";

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

export const getAdminChat = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelSystemChat;
    }
  >({
    path: `/admin/chat`,
    method: "GET",
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
  req: ModelSystemChat,
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
