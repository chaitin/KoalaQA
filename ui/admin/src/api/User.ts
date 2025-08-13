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
  GetUserLoginThirdParams,
  ModelListRes,
  ModelUserInfo,
  SvcUserCreateReq,
  SvcUserListItem,
  SvcUserLoginReq,
  SvcUserRegisterReq,
  SvcUserUpdateReq,
} from "./types";

/**
 * No description
 *
 * @tags user
 * @name GetAdminUser
 * @summary list user
 * @request GET:/admin/user
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcUserListItem)[],

}),

})` OK
 */

export const getAdminUser = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcUserListItem[];
      };
    }
  >({
    path: `/admin/user`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name PostAdminUser
 * @summary create user
 * @request POST:/admin/user
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postAdminUser = (
  req: SvcUserCreateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/user`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name GetAdminUserUserId
 * @summary user detail
 * @request GET:/admin/user/{user_id}
 * @response `200` `(ContextResponse & {
    data?: SvcUserListItem,

})` OK
 */

export const getAdminUserUserId = (
  userId: number,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcUserListItem;
    }
  >({
    path: `/admin/user/${userId}`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name PutAdminUserUserId
 * @summary update user
 * @request PUT:/admin/user/{user_id}
 * @response `200` `ContextResponse` OK
 */

export const putAdminUserUserId = (
  userId: number,
  req: SvcUserUpdateReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/user/${userId}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name DeleteAdminUserUserId
 * @summary delete user
 * @request DELETE:/admin/user/{user_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminUserUserId = (
  userId: number,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/user/${userId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name GetUser
 * @summary user detail
 * @request GET:/user
 * @response `200` `(ContextResponse & {
    data?: ModelUserInfo,

})` OK
 */

export const getUser = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelUserInfo;
    }
  >({
    path: `/user`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name PostUserLogin
 * @summary user login
 * @request POST:/user/login
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const postUserLogin = (
  req: SvcUserLoginReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/user/login`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name GetUserLoginThird
 * @summary get user third login url
 * @request GET:/user/login/third
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const getUserLoginThird = (
  query: GetUserLoginThirdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/user/login/third`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name PostUserLogout
 * @summary user logout
 * @request POST:/user/logout
 * @response `200` `ContextResponse` OK
 */

export const postUserLogout = (params: RequestParams = {}) =>
  request<ContextResponse>({
    path: `/user/logout`,
    method: "POST",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name PostUserRegister
 * @summary register user
 * @request POST:/user/register
 * @response `200` `ContextResponse` OK
 */

export const postUserRegister = (
  req: SvcUserRegisterReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/user/register`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
