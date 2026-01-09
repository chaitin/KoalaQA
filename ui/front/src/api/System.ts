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

import request, { RequestParams } from "./httpClient";
import {
  ContextResponse,
  ModelListRes,
  ModelMessageNotifySub,
  ModelSystemDiscussion,
  RouterSystemInfoRes,
} from "./types";

/**
 * No description
 *
 * @tags system
 * @name GetSystemDiscussion
 * @summary system discussion detail
 * @request GET:/system/discussion
 * @response `200` `(ContextResponse & {
    data?: ModelSystemDiscussion,

})` OK
 */

export const getSystemDiscussion = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelSystemDiscussion;
    }
  >({
    path: `/system/discussion`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags system
 * @name GetSystemInfo
 * @summary get system info
 * @request GET:/system/info
 * @response `200` `(ContextResponse & {
    data?: RouterSystemInfoRes,

})` OK
 */

export const getSystemInfo = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: RouterSystemInfoRes;
    }
  >({
    path: `/system/info`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags system
 * @name GetSystemNotifySub
 * @summary list notify sub
 * @request GET:/system/notify_sub
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelMessageNotifySub)[],

}),

})` OK
 */

export const getSystemNotifySub = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelMessageNotifySub[];
      };
    }
  >({
    path: `/system/notify_sub`,
    method: "GET",
    format: "json",
    ...params,
  });
