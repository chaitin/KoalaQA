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
  DomainArticle,
  DomainProduct,
  DomainResponse,
  DomainTopic,
  DomainVendor,
  DomainVendorCreateReq,
  DomainVendorListResp,
  DomainVendorUpdateReq,
  GetVendorInfoParams,
  GetVendorListParams,
  GetVendorProductListParams,
  PostVendorLikeParams,
} from "./types";

/**
 * @description 厂商列表
 *
 * @tags Vendor
 * @name GetVendorList
 * @summary 厂商列表
 * @request GET:/api/v1/cyber/vendor
 * @response `200` `(DomainResponse & {
    data?: DomainVendorListResp,

})` OK
 */

export const getVendorList = (query: GetVendorListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainVendorListResp;
    }
  >({
    path: `/api/v1/cyber/vendor`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 创建厂商
 *
 * @tags Vendor
 * @name PostVendorCreate
 * @summary 创建厂商
 * @request POST:/api/v1/cyber/vendor
 * @response `200` `(DomainResponse & {
    data?: DomainVendor,

})` OK
 */

export const postVendorCreate = (body: DomainVendorCreateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainVendor;
    }
  >({
    path: `/api/v1/cyber/vendor`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 热门厂商列表
 *
 * @tags Vendor
 * @name GetVendorHotList
 * @summary 热门厂商列表
 * @request GET:/api/v1/cyber/vendor/hot
 * @response `200` `(DomainResponse & {
    data?: (DomainVendor)[],

})` OK
 */

export const getVendorHotList = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainVendor[];
    }
  >({
    path: `/api/v1/cyber/vendor/hot`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 厂商详情
 *
 * @tags Vendor
 * @name GetVendorInfo
 * @summary 厂商详情
 * @request GET:/api/v1/cyber/vendor/{id}
 * @response `200` `(DomainResponse & {
    data?: DomainVendor,

})` OK
 */

export const getVendorInfo = ({ id, ...query }: GetVendorInfoParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainVendor;
    }
  >({
    path: `/api/v1/cyber/vendor/${id}`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 更新厂商
 *
 * @tags Vendor
 * @name PutVendorUpdate
 * @summary 更新厂商
 * @request PUT:/api/v1/cyber/vendor/{id}
 * @response `200` `(DomainResponse & {
    data?: DomainVendor,

})` OK
 */

export const putVendorUpdate = (id: string, body: DomainVendorUpdateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainVendor;
    }
  >({
    path: `/api/v1/cyber/vendor/${id}`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 厂商资讯
 *
 * @tags Vendor
 * @name GetVendorArticleList
 * @summary 厂商资讯
 * @request GET:/api/v1/cyber/vendor/{id}/article
 * @response `200` `(DomainResponse & {
    data?: (DomainArticle)[],

})` OK
 */

export const getVendorArticleList = (id: string, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainArticle[];
    }
  >({
    path: `/api/v1/cyber/vendor/${id}/article`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 厂商点赞/取消点赞
 *
 * @tags Vendor
 * @name PostVendorLike
 * @summary 厂商点赞/取消点赞
 * @request POST:/api/v1/cyber/vendor/{id}/like
 * @response `200` `DomainResponse` OK
 */

export const postVendorLike = ({ id, ...query }: PostVendorLikeParams, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/cyber/vendor/${id}/like`,
    method: "POST",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 厂商相关的产品列表
 *
 * @tags Vendor
 * @name GetVendorProductList
 * @summary 厂商相关的产品列表
 * @request GET:/api/v1/cyber/vendor/{id}/product
 * @response `200` `(DomainResponse & {
    data?: (DomainProduct)[],

})` OK
 */

export const getVendorProductList = ({ id, ...query }: GetVendorProductListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainProduct[];
    }
  >({
    path: `/api/v1/cyber/vendor/${id}/product`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 厂商相关的领域列表
 *
 * @tags Vendor
 * @name GetVendorTopicList
 * @summary 厂商相关的领域列表
 * @request GET:/api/v1/cyber/vendor/{id}/topic
 * @response `200` `(DomainResponse & {
    data?: (DomainTopic)[],

})` OK
 */

export const getVendorTopicList = (id: string, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopic[];
    }
  >({
    path: `/api/v1/cyber/vendor/${id}/topic`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 相关厂商列表
 *
 * @tags Vendor
 * @name GetVendorAssociatedList
 * @summary 相关厂商列表
 * @request GET:/api/v1/cyber/vendor/{id}/vendor
 * @response `200` `(DomainResponse & {
    data?: (DomainVendor)[],

})` OK
 */

export const getVendorAssociatedList = (id: string, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainVendor[];
    }
  >({
    path: `/api/v1/cyber/vendor/${id}/vendor`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });
