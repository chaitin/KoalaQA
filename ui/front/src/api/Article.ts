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
  DomainAdvertisement,
  DomainArticle,
  DomainArticleCheckResp,
  DomainArticleListResp,
  DomainDiscoverReq,
  DomainDiscoverResp,
  DomainResponse,
  GetArticleCheckParams,
  GetArticleListParams,
} from "./types";

/**
 * @description 信息流列表
 *
 * @tags Article
 * @name GetArticleList
 * @summary 信息流列表
 * @request GET:/api/v1/cyber/article
 * @response `200` `(DomainResponse & {
    data?: DomainArticleListResp,

})` OK
 */

export const getArticleList = (query: GetArticleListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainArticleListResp;
    }
  >({
    path: `/api/v1/cyber/article`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 广告列表
 *
 * @tags Article
 * @name GetArticleAdList
 * @summary 广告列表
 * @request GET:/api/v1/cyber/article/ad
 * @response `200` `(DomainResponse & {
    data?: (DomainAdvertisement)[],

})` OK
 */

export const getArticleAdList = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainAdvertisement[];
    }
  >({
    path: `/api/v1/cyber/article/ad`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 文章检查
 *
 * @tags Article
 * @name GetArticleCheck
 * @summary 文章检查
 * @request GET:/api/v1/cyber/article/check
 * @response `200` `(DomainResponse & {
    data?: DomainArticleCheckResp,

})` OK
 */

export const getArticleCheck = (query: GetArticleCheckParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainArticleCheckResp;
    }
  >({
    path: `/api/v1/cyber/article/check`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 链接发现
 *
 * @tags Article
 * @name PostArticleDiscover
 * @summary 链接发现
 * @request POST:/api/v1/cyber/article/discover
 * @response `200` `(DomainResponse & {
    data?: DomainDiscoverResp,

})` OK
 */

export const postArticleDiscover = (body: DomainDiscoverReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainDiscoverResp;
    }
  >({
    path: `/api/v1/cyber/article/discover`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 热门文章列表
 *
 * @tags Article
 * @name GetArticleHotList
 * @summary 热门文章列表
 * @request GET:/api/v1/cyber/article/hot
 * @response `200` `(DomainResponse & {
    data?: (DomainArticle)[],

})` OK
 */

export const getArticleHotList = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainArticle[];
    }
  >({
    path: `/api/v1/cyber/article/hot`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 资讯详情
 *
 * @tags Article
 * @name GetArticleInfo
 * @summary 资讯详情
 * @request GET:/api/v1/cyber/article/{id}
 * @response `200` `(DomainResponse & {
    data?: DomainArticle,

})` OK
 */

export const getArticleInfo = (id: string, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainArticle;
    }
  >({
    path: `/api/v1/cyber/article/${id}`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });
