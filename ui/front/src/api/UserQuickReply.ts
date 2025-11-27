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
  DeleteUserQuickReplyQuickReplyIdParams,
  ModelListRes,
  ModelUserQuickReply,
  PutUserQuickReplyQuickReplyIdParams,
  SvcQuickReplyReindexReq,
  SvcUserQuickReplyReq,
} from "./types";

/**
 * No description
 *
 * @tags user_quick_reply
 * @name GetUserQuickReply
 * @summary list user quick reply
 * @request GET:/user/quick_reply
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelUserQuickReply)[],

}),

})` OK
 */

export const getUserQuickReply = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelUserQuickReply[];
      };
    }
  >({
    path: `/user/quick_reply`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user_quick_reply
 * @name PostUserQuickReply
 * @summary create user quick reply
 * @request POST:/user/quick_reply
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postUserQuickReply = (
  req: SvcUserQuickReplyReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/user/quick_reply`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user_quick_reply
 * @name PutUserQuickReplyReindex
 * @summary reindex user quick reply
 * @request PUT:/user/quick_reply/reindex
 * @response `200` `ContextResponse` OK
 */

export const putUserQuickReplyReindex = (
  req: SvcQuickReplyReindexReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/user/quick_reply/reindex`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user_quick_reply
 * @name PutUserQuickReplyQuickReplyId
 * @summary update user quick reply
 * @request PUT:/user/quick_reply/{quick_reply_id}
 * @response `200` `ContextResponse` OK
 */

export const putUserQuickReplyQuickReplyId = (
  { quickReplyId, ...query }: PutUserQuickReplyQuickReplyIdParams,
  req: SvcUserQuickReplyReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/user/quick_reply/${quickReplyId}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user_quick_reply
 * @name DeleteUserQuickReplyQuickReplyId
 * @summary delete user quick reply
 * @request DELETE:/user/quick_reply/{quick_reply_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteUserQuickReplyQuickReplyId = (
  { quickReplyId, ...query }: DeleteUserQuickReplyQuickReplyIdParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/user/quick_reply/${quickReplyId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });
