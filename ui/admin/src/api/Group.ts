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
  ModelListRes,
  SvcGroupCreateReq,
  SvcGroupItemInfo,
  SvcGroupUpdateReq,
  SvcGroupWithItem,
} from "./types";

/**
 * No description
 *
 * @tags group
 * @name GetAdminGroup
 * @summary list group
 * @request GET:/admin/group
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: ((SvcGroupWithItem & {
    items?: (SvcGroupItemInfo)[],

}))[],

}),

})` OK
 */

export const getAdminGroup = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: (SvcGroupWithItem & {
          items?: SvcGroupItemInfo[];
        })[];
      };
    }
  >({
    path: `/admin/group`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags group
 * @name PostAdminGroup
 * @summary create group
 * @request POST:/admin/group
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postAdminGroup = (
  req: SvcGroupCreateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/group`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags group
 * @name PutAdminGroupGroupId
 * @summary update group
 * @request PUT:/admin/group/{group_id}
 * @response `200` `ContextResponse` OK
 */

export const putAdminGroupGroupId = (
  groupId: number,
  req: SvcGroupUpdateReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/group/${groupId}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags group
 * @name DeleteAdminGroupGroupId
 * @summary delete group
 * @request DELETE:/admin/group/{group_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminGroupGroupId = (
  groupId: number,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/group/${groupId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });
