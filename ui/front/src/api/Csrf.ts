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
import { ContextResponse } from "./types";

/**
 * @description get csrf
 *
 * @tags csrf
 * @name GetCsrf
 * @summary get csrf
 * @request GET:/csrf
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const getCsrf = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/csrf`,
    method: "GET",
    format: "json",
    ...params,
  });
