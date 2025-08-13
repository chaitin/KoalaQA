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
  ModelGroupItem,
  ModelListRes,
  SvcGICreateReq,
  SvcGIUpdateIndexReq,
  SvcGIUpdateReq,
} from "./types";

/**
 * No description
 *
 * @tags group_item
 * @name GetAdminGroupGroupIdItem
 * @summary list group item
 * @request GET:/admin/group/{group_id}/item
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelGroupItem)[],

}),

})` OK
 */

export const getAdminGroupGroupIdItem = (
  groupId: number,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelGroupItem[];
      };
    }
  >({
    path: `/admin/group/${groupId}/item`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags group_item
 * @name PostAdminGroupGroupIdItem
 * @summary create group item
 * @request POST:/admin/group/{group_id}/item
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postAdminGroupGroupIdItem = (
  groupId: number,
  req: SvcGICreateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/group/${groupId}/item`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags group_item
 * @name PutAdminGroupGroupIdItemItemId
 * @summary update group_item
 * @request PUT:/admin/group/{group_id}/item/{item_id}
 * @response `200` `ContextResponse` OK
 */

export const putAdminGroupGroupIdItemItemId = (
  groupId: number,
  itemId: number,
  req: SvcGIUpdateReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/group/${groupId}/item/${itemId}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags group_item
 * @name DeleteAdminGroupGroupIdItemItemId
 * @summary delete group_item
 * @request DELETE:/admin/group/{group_id}/item/{item_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminGroupGroupIdItemItemId = (
  groupId: number,
  itemId: number,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/group/${groupId}/item/${itemId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags group_item
 * @name PutAdminGroupGroupIdItemItemIdIndex
 * @summary update group_item index
 * @request PUT:/admin/group/{group_id}/item/{item_id}/index
 * @response `200` `ContextResponse` OK
 */

export const putAdminGroupGroupIdItemItemIdIndex = (
  groupId: number,
  itemId: number,
  req: SvcGIUpdateIndexReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/group/${groupId}/item/${itemId}/index`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
