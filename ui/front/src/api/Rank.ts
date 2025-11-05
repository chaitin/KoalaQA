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
import { ContextResponse, ModelListRes, SvcRankContributeItem } from "./types";

/**
 * No description
 *
 * @tags rank
 * @name GetRankContribute
 * @summary contribyte rank
 * @request GET:/rank/contribute
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcRankContributeItem)[],

}),

})` OK
 */

export const getRankContribute = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcRankContributeItem[];
      };
    }
  >({
    path: `/rank/contribute`,
    method: "GET",
    format: "json",
    ...params,
  });
