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
  DomainCategoryListResp,
  DomainProductListResp,
  DomainResponse,
  DomainTopicListResp,
  GetCategoryProductListParams,
} from "./types";

/**
 * @description 所有分类
 *
 * @tags Category
 * @name GetCategoryList
 * @summary 所有分类
 * @request GET:/api/v1/cyber/category
 * @response `200` `(DomainResponse & {
    data?: DomainCategoryListResp,

})` OK
 */

export const getCategoryList = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainCategoryListResp;
    }
  >({
    path: `/api/v1/cyber/category`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 产品列表
 *
 * @tags Category
 * @name GetCategoryProductList
 * @summary 产品列表
 * @request GET:/api/v1/cyber/category/product
 * @response `200` `(DomainResponse & {
    data?: DomainProductListResp,

})` OK
 */

export const getCategoryProductList = (query: GetCategoryProductListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainProductListResp;
    }
  >({
    path: `/api/v1/cyber/category/product`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 领域列表
 *
 * @tags Category
 * @name GetCategoryTopicList
 * @summary 领域列表
 * @request GET:/api/v1/cyber/category/topic
 * @response `200` `(DomainResponse & {
    data?: DomainTopicListResp,

})` OK
 */

export const getCategoryTopicList = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopicListResp;
    }
  >({
    path: `/api/v1/cyber/category/topic`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });
