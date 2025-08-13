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
  DomainProductCreateReq,
  DomainProductUpdateReq,
  DomainResponse,
  DomainTopic,
  GetProductInfoParams,
  GetProductTopicListParams,
  PostProductLikeParams,
} from "./types";

/**
 * @description 创建产品
 *
 * @tags Product
 * @name PostProductCreate
 * @summary 创建产品
 * @request POST:/api/v1/cyber/product
 * @response `200` `(DomainResponse & {
    data?: DomainProduct,

})` OK
 */

export const postProductCreate = (body: DomainProductCreateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainProduct;
    }
  >({
    path: `/api/v1/cyber/product`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 产品详情
 *
 * @tags Product
 * @name GetProductInfo
 * @summary 产品详情
 * @request GET:/api/v1/cyber/product/{id}
 * @response `200` `(DomainResponse & {
    data?: DomainProduct,

})` OK
 */

export const getProductInfo = ({ id, ...query }: GetProductInfoParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainProduct;
    }
  >({
    path: `/api/v1/cyber/product/${id}`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 更新产品
 *
 * @tags Product
 * @name PutProductUpdate
 * @summary 更新产品
 * @request PUT:/api/v1/cyber/product/{id}
 * @response `200` `(DomainResponse & {
    data?: DomainProduct,

})` OK
 */

export const putProductUpdate = (id: string, body: DomainProductUpdateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainProduct;
    }
  >({
    path: `/api/v1/cyber/product/${id}`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 产品资讯列表
 *
 * @tags Product
 * @name GetProductArticleList
 * @summary 产品资讯列表
 * @request GET:/api/v1/cyber/product/{id}/article
 * @response `200` `(DomainResponse & {
    data?: (DomainArticle)[],

})` OK
 */

export const getProductArticleList = (id: string, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainArticle[];
    }
  >({
    path: `/api/v1/cyber/product/${id}/article`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 产品点赞/取消点赞
 *
 * @tags Product
 * @name PostProductLike
 * @summary 产品点赞/取消点赞
 * @request POST:/api/v1/cyber/product/{id}/like
 * @response `200` `DomainResponse` OK
 */

export const postProductLike = ({ id, ...query }: PostProductLikeParams, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/cyber/product/${id}/like`,
    method: "POST",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 相关的产品列表
 *
 * @tags Product
 * @name GetProductAssociatedList
 * @summary 相关的产品列表
 * @request GET:/api/v1/cyber/product/{id}/product
 * @response `200` `(DomainResponse & {
    data?: (DomainProduct)[],

})` OK
 */

export const getProductAssociatedList = (id: string, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainProduct[];
    }
  >({
    path: `/api/v1/cyber/product/${id}/product`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 产品领域列表
 *
 * @tags Product
 * @name GetProductTopicList
 * @summary 产品领域列表
 * @request GET:/api/v1/cyber/product/{id}/topic
 * @response `200` `(DomainResponse & {
    data?: (DomainTopic)[],

})` OK
 */

export const getProductTopicList = ({ id, ...query }: GetProductTopicListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopic[];
    }
  >({
    path: `/api/v1/cyber/product/${id}/topic`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
