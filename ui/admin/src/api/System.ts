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
import { ContextResponse, RouterSystemInfoRes } from "./types";

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
