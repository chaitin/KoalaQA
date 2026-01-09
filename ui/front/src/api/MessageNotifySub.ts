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
  ModelMessageNotifySub,
  ModelMessageNotifySubInfo,
  SvcMessageNotifySubCreateReq,
} from "./types";

/**
 * No description
 *
 * @tags message_notify_sub
 * @name GetAdminSystemNotifySub
 * @summary list message notify sub
 * @request GET:/admin/system/notify_sub
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: ((ModelMessageNotifySub & {
    info?: ModelMessageNotifySubInfo,

}))[],

}),

})` OK
 */

export const getAdminSystemNotifySub = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: (ModelMessageNotifySub & {
          info?: ModelMessageNotifySubInfo;
        })[];
      };
    }
  >({
    path: `/admin/system/notify_sub`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags message_notify_sub
 * @name PostAdminSystemNotifySub
 * @summary upsert message notify sub
 * @request POST:/admin/system/notify_sub
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postAdminSystemNotifySub = (
  req: SvcMessageNotifySubCreateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/system/notify_sub`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
