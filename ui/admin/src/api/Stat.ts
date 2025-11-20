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
  GetAdminStatDiscussionParams,
  GetAdminStatSearchParams,
  GetAdminStatTrendParams,
  GetAdminStatVisitParams,
  ModelListRes,
  ModelStatTrend,
  ModelStatTrendItem,
  SvcStatDiscussionItem,
  SvcStatDiscussionRes,
  SvcStatVisitRes,
} from "./types";

/**
 * No description
 *
 * @tags stat
 * @name GetAdminStatDiscussion
 * @summary stat discussion
 * @request GET:/admin/stat/discussion
 * @response `200` `(ContextResponse & {
    data?: (SvcStatDiscussionRes & {
    discussions?: (SvcStatDiscussionItem)[],

}),

})` OK
 */

export const getAdminStatDiscussion = (
  query: GetAdminStatDiscussionParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcStatDiscussionRes & {
        discussions?: SvcStatDiscussionItem[];
      };
    }
  >({
    path: `/admin/stat/discussion`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags stat
 * @name GetAdminStatSearch
 * @summary stat search count
 * @request GET:/admin/stat/search
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const getAdminStatSearch = (
  query: GetAdminStatSearchParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/stat/search`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags stat
 * @name GetAdminStatTrend
 * @summary stat trend
 * @request GET:/admin/stat/trend
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: ((ModelStatTrend & {
    items?: (ModelStatTrendItem)[],

}))[],

}),

})` OK
 */

export const getAdminStatTrend = (
  query: GetAdminStatTrendParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: (ModelStatTrend & {
          items?: ModelStatTrendItem[];
        })[];
      };
    }
  >({
    path: `/admin/stat/trend`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags stat
 * @name GetAdminStatVisit
 * @summary stat visit
 * @request GET:/admin/stat/visit
 * @response `200` `(ContextResponse & {
    data?: SvcStatVisitRes,

})` OK
 */

export const getAdminStatVisit = (
  query: GetAdminStatVisitParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcStatVisitRes;
    }
  >({
    path: `/admin/stat/visit`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags stat
 * @name PostStat
 * @summary stat
 * @request POST:/stat
 * @response `200` `ContextResponse` OK
 */

export const postStat = (params: RequestParams = {}) =>
  request<ContextResponse>({
    path: `/stat`,
    method: "POST",
    format: "json",
    ...params,
  });
