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
  DeleteAdminUserUserIdParams,
  GetAdminUserParams,
  GetAdminUserUserIdParams,
  GetUserLoginThirdParams,
  GetUserNotifyListParams,
  GetUserTrendParams,
  GetUserUserIdParams,
  ModelListRes,
  ModelMessageNotify,
  ModelTrend,
  ModelUser,
  ModelUserInfo,
  PutAdminUserUserIdParams,
  PutUserPayload,
  SvcAuthFrontendGetRes,
  SvcNotifyReadReq,
  SvcUpdateWebNotifyReq,
  SvcUserJoinOrgReq,
  SvcUserListItem,
  SvcUserLoginReq,
  SvcUserRegisterReq,
  SvcUserStatisticsRes,
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

export const getAdminUser = (
  query: GetAdminUserParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcUserListItem[];
      };
    }
  >({
    path: `/admin/user`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name PostAdminUserJoinOrg
 * @summary user join org
 * @request POST:/admin/user/join_org
 * @response `200` `ContextResponse` OK
 */

export const postAdminUserJoinOrg = (
  req: SvcUserJoinOrgReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/user/join_org`,
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
    data?: ModelUser,

})` OK
 */

export const getAdminUserUserId = (
  { userId, ...query }: GetAdminUserUserIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelUser;
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
  { userId, ...query }: PutAdminUserUserIdParams,
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
  { userId, ...query }: DeleteAdminUserUserIdParams,
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
 * @name PutUser
 * @summary update user
 * @request PUT:/user
 * @response `200` `ContextResponse` OK
 */

export const putUser = (data: PutUserPayload, params: RequestParams = {}) =>
  request<ContextResponse>({
    path: `/user`,
    method: "PUT",
    body: data,
    type: ContentType.FormData,
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
 * @name GetUserLoginMethod
 * @summary login_method detail
 * @request GET:/user/login_method
 * @response `200` `(ContextResponse & {
    data?: SvcAuthFrontendGetRes,

})` OK
 */

export const getUserLoginMethod = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: SvcAuthFrontendGetRes;
    }
  >({
    path: `/user/login_method`,
    method: "GET",
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
 * @name GetUserNotifyList
 * @summary list notify message
 * @request GET:/user/notify/list
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelMessageNotify)[],

}),

})` OK
 */

export const getUserNotifyList = (
  query: GetUserNotifyListParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelMessageNotify[];
      };
    }
  >({
    path: `/user/notify/list`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name PostUserNotifyRead
 * @summary read notify message
 * @request POST:/user/notify/read
 * @response `200` `ContextResponse` OK
 */

export const postUserNotifyRead = (
  req: SvcNotifyReadReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/user/notify/read`,
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
 * @name GetUserNotifyUnread
 * @summary get notify message unread num
 * @request GET:/user/notify/unread
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const getUserNotifyUnread = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/user/notify/unread`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name PostUserNotifyWeb
 * @summary update notify web switch
 * @request POST:/user/notify/web
 * @response `200` `ContextResponse` OK
 */

export const postUserNotifyWeb = (
  req: SvcUpdateWebNotifyReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/user/notify/web`,
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

/**
 * No description
 *
 * @tags user
 * @name GetUserTrend
 * @summary list user trend
 * @request GET:/user/trend
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelTrend)[],

}),

})` OK
 */

export const getUserTrend = (
  query: GetUserTrendParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelTrend[];
      };
    }
  >({
    path: `/user/trend`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user
 * @name GetUserUserId
 * @summary stat user info
 * @request GET:/user/{user_id}
 * @response `200` `(ContextResponse & {
    data?: SvcUserStatisticsRes,

})` OK
 */

export const getUserUserId = (
  { userId, ...query }: GetUserUserIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcUserStatisticsRes;
    }
  >({
    path: `/user/${userId}`,
    method: "GET",
    format: "json",
    ...params,
  });
