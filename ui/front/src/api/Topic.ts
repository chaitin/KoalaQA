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
  DomainResponse,
  DomainTopic,
  DomainTopicCreateReq,
  DomainTopicListResp,
  DomainTopicProductListResp,
  DomainTopicUpdateReq,
  DomainTopicVendorListResp,
  GetTopicAssociatedListParams,
  GetTopicInfoParams,
  GetTopicListParams,
  GetTopicProductHotParams,
  GetTopicProductListParams,
  GetTopicVendorListParams,
} from "./types";

/**
 * @description 领域列表
 *
 * @tags Topic
 * @name GetTopicList
 * @summary 领域列表
 * @request GET:/api/v1/cyber/topic
 * @response `200` `(DomainResponse & {
    data?: DomainTopicListResp,

})` OK
 */

export const getTopicList = (query: GetTopicListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopicListResp;
    }
  >({
    path: `/api/v1/cyber/topic`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 创建领域
 *
 * @tags Topic
 * @name PostTopicCreate
 * @summary 创建领域
 * @request POST:/api/v1/cyber/topic
 * @response `200` `(DomainResponse & {
    data?: DomainTopic,

})` OK
 */

export const postTopicCreate = (body: DomainTopicCreateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopic;
    }
  >({
    path: `/api/v1/cyber/topic`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 热门领域
 *
 * @tags Topic
 * @name GetTopicHot
 * @summary 热门领域
 * @request GET:/api/v1/cyber/topic/hot
 * @response `200` `(DomainResponse & {
    data?: DomainTopicListResp,

})` OK
 */

export const getTopicHot = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopicListResp;
    }
  >({
    path: `/api/v1/cyber/topic/hot`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 领域相关的热门产品
 *
 * @tags Topic
 * @name GetTopicProductHot
 * @summary 领域相关的热门产品
 * @request GET:/api/v1/cyber/topic/product/hot
 * @response `200` `(DomainResponse & {
    data?: DomainTopicProductListResp,

})` OK
 */

export const getTopicProductHot = (query: GetTopicProductHotParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopicProductListResp;
    }
  >({
    path: `/api/v1/cyber/topic/product/hot`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 领域详情
 *
 * @tags Topic
 * @name GetTopicInfo
 * @summary 领域详情
 * @request GET:/api/v1/cyber/topic/{name}
 * @response `200` `(DomainResponse & {
    data?: DomainTopic,

})` OK
 */

export const getTopicInfo = ({ name, ...query }: GetTopicInfoParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopic;
    }
  >({
    path: `/api/v1/cyber/topic/${name}`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 更新领域
 *
 * @tags Topic
 * @name PutTopicUpdate
 * @summary 更新领域
 * @request PUT:/api/v1/cyber/topic/{name}
 * @response `200` `(DomainResponse & {
    data?: DomainTopic,

})` OK
 */

export const putTopicUpdate = (name: string, body: DomainTopicUpdateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopic;
    }
  >({
    path: `/api/v1/cyber/topic/${name}`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 领域相关的产品列表
 *
 * @tags Topic
 * @name GetTopicProductList
 * @summary 领域相关的产品列表
 * @request GET:/api/v1/cyber/topic/{name}/product
 * @response `200` `(DomainResponse & {
    data?: DomainTopicProductListResp,

})` OK
 */

export const getTopicProductList = ({ name, ...query }: GetTopicProductListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopicProductListResp;
    }
  >({
    path: `/api/v1/cyber/topic/${name}/product`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 相关的领域
 *
 * @tags Topic
 * @name GetTopicAssociatedList
 * @summary 相关的领域
 * @request GET:/api/v1/cyber/topic/{name}/topic
 * @response `200` `(DomainResponse & {
    data?: (DomainTopic)[],

})` OK
 */

export const getTopicAssociatedList = ({ name, ...query }: GetTopicAssociatedListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopic[];
    }
  >({
    path: `/api/v1/cyber/topic/${name}/topic`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 领域相关的厂商列表
 *
 * @tags Topic
 * @name GetTopicVendorList
 * @summary 领域相关的厂商列表
 * @request GET:/api/v1/cyber/topic/{name}/vendor
 * @response `200` `(DomainResponse & {
    data?: DomainTopicVendorListResp,

})` OK
 */

export const getTopicVendorList = ({ name, ...query }: GetTopicVendorListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopicVendorListResp;
    }
  >({
    path: `/api/v1/cyber/topic/${name}/vendor`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
