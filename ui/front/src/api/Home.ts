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
import { DomainAdvertisement, DomainResponse, DomainSearchResp, GetSearchParams } from "./types";

/**
 * @description 首页 Banner
 *
 * @tags Home
 * @name GetBannerList
 * @summary 首页 Banner
 * @request GET:/api/v1/cyber/banner
 * @response `200` `(DomainResponse & {
    data?: (DomainAdvertisement)[],

})` OK
 */

export const getBannerList = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainAdvertisement[];
    }
  >({
    path: `/api/v1/cyber/banner`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 搜索
 *
 * @tags Home
 * @name GetSearch
 * @summary 搜索
 * @request GET:/api/v1/cyber/search
 * @response `200` `(DomainResponse & {
    data?: DomainSearchResp,

})` OK
 */

export const getSearch = (query: GetSearchParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainSearchResp;
    }
  >({
    path: `/api/v1/cyber/search`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
