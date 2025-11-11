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
  ModelForumGroups,
  PutAdminForumPayload,
  SvcForumRes,
} from "./types";

/**
 * No description
 *
 * @tags forum
 * @name GetAdminForum
 * @summary list forum
 * @request GET:/admin/forum
 * @response `200` `(ContextResponse & {
    data?: ((SvcForumRes & {
    groups?: (ModelForumGroups)[],

}))[],

})` OK
 */

export const getAdminForum = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: (SvcForumRes & {
        groups?: ModelForumGroups[];
      })[];
    }
  >({
    path: `/admin/forum`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags forum
 * @name PutAdminForum
 * @summary update forum
 * @request PUT:/admin/forum
 * @response `200` `ContextResponse` OK
 */

export const putAdminForum = (
  req: PutAdminForumPayload,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/forum`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags forum
 * @name GetForum
 * @summary list forums
 * @request GET:/forum
 * @response `200` `(ContextResponse & {
    data?: (SvcForumRes)[],

})` OK
 */

export const getForum = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: SvcForumRes[];
    }
  >({
    path: `/forum`,
    method: "GET",
    format: "json",
    ...params,
  });
