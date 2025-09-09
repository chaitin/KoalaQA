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
  ModelGroupItemInfo,
  ModelGroupWithItem,
  ModelListRes,
  SvcGroupUpdateReq,
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
    items?: ((ModelGroupWithItem & {
    items?: (ModelGroupItemInfo)[],

}))[],

}),

})` OK
 */

export const getAdminGroup = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: (ModelGroupWithItem & {
          items?: ModelGroupItemInfo[];
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
 * @name PutAdminGroup
 * @summary update group
 * @request PUT:/admin/group
 * @response `200` `ContextResponse` OK
 */

export const putAdminGroup = (
  req: SvcGroupUpdateReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/group`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
