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
  DomainAdvertisementReq,
  DomainArticle,
  DomainArticleHotReq,
  DomainArticleListResp,
  DomainArticleReq,
  DomainCategory,
  DomainDraftCheckReq,
  DomainDraftListResp,
  DomainProduct,
  DomainProductAIBatchReq,
  DomainProductAIReq,
  DomainProductAIResp,
  DomainProductCreateReq,
  DomainProductListResp,
  DomainProductUpdateReq,
  DomainResponse,
  DomainTagListResp,
  DomainTagReq,
  DomainTopic,
  DomainTopicCreateReq,
  DomainTopicHotListResp,
  DomainTopicHotReq,
  DomainTopicListResp,
  DomainTopicUpdateReq,
  DomainUploadLogoResp,
  DomainVendor,
  DomainVendorCreateReq,
  DomainVendorListResp,
  DomainVendorUpdateReq,
  GetAdListParams,
  GetPanelArticleListParams,
  GetPanelDraftListParams,
  GetPanelProductListParams,
  GetPanelTopicHotListParams,
  GetPanelTopicListParams,
  GetPanelVendorListParams,
  GetTagListParams,
  PostPanelDraftCheckParams,
  PostPanelImageUploadPayload,
} from "./types";

/**
 * @description 广告列表
 *
 * @tags Panel
 * @name GetAdList
 * @summary 广告列表
 * @request GET:/api/v1/panel/ad
 * @response `200` `(DomainResponse & {
    data?: (DomainAdvertisement)[],

})` OK
 */

export const getAdList = (query: GetAdListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainAdvertisement[];
    }
  >({
    path: `/api/v1/panel/ad`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 创建广告信息
 *
 * @tags Panel
 * @name PostAdCreate
 * @summary 创建广告信息
 * @request POST:/api/v1/panel/ad
 * @response `200` `DomainResponse` OK
 */

export const postAdCreate = (body: DomainAdvertisementReq, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/ad`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 更新广告信息
 *
 * @tags Panel
 * @name PutAdUpdate
 * @summary 更新广告信息
 * @request PUT:/api/v1/panel/ad/{id}
 * @response `200` `DomainResponse` OK
 */

export const putAdUpdate = (id: number, body: DomainAdvertisement, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/ad/${id}`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 删除广告信息
 *
 * @tags Panel
 * @name DeleteAdDelete
 * @summary 删除广告信息
 * @request DELETE:/api/v1/panel/ad/{id}
 * @response `200` `DomainResponse` OK
 */

export const deleteAdDelete = (id: number, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/ad/${id}`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 文章列表
 *
 * @tags Panel
 * @name GetPanelArticleList
 * @summary 文章列表
 * @request GET:/api/v1/panel/article
 * @response `200` `(DomainResponse & {
    data?: DomainArticleListResp,

})` OK
 */

export const getPanelArticleList = (query: GetPanelArticleListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainArticleListResp;
    }
  >({
    path: `/api/v1/panel/article`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 创建文章
 *
 * @tags Panel
 * @name PostArticleCreate
 * @summary 创建文章
 * @request POST:/api/v1/panel/article
 * @response `200` `DomainResponse` OK
 */

export const postArticleCreate = (body: DomainArticleReq, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/article`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 热门文章列表
 *
 * @tags Panel
 * @name GetPanelArticleHotList
 * @summary 热门文章列表
 * @request GET:/api/v1/panel/article/hot
 * @response `200` `(DomainResponse & {
    data?: (DomainArticle)[],

})` OK
 */

export const getPanelArticleHotList = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainArticle[];
    }
  >({
    path: `/api/v1/panel/article/hot`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 设置为热门文章
 *
 * @tags Panel
 * @name PostArticleHotAdd
 * @summary 设置为热门文章
 * @request POST:/api/v1/panel/article/hot
 * @response `200` `DomainResponse` OK
 */

export const postArticleHotAdd = (body: DomainArticleHotReq, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/article/hot`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 修改文章
 *
 * @tags Panel
 * @name PutArticleUpdate
 * @summary 修改文章
 * @request PUT:/api/v1/panel/article/{id}
 * @response `200` `DomainResponse` OK
 */

export const putArticleUpdate = (id: string, body: DomainArticleReq, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/article/${id}`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 删除文章
 *
 * @tags Panel
 * @name DeleteArticleDelete
 * @summary 删除文章
 * @request DELETE:/api/v1/panel/article/{id}
 * @response `200` `DomainResponse` OK
 */

export const deleteArticleDelete = (id: string, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/article/${id}`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 删除热门文章
 *
 * @tags Panel
 * @name DeleteArticleHotDel
 * @summary 删除热门文章
 * @request DELETE:/api/v1/panel/article/{id}/hot
 * @response `200` `DomainResponse` OK
 */

export const deleteArticleHotDel = (id: string, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/article/${id}/hot`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 分类列表
 *
 * @tags Panel
 * @name GetPanelCategoryList
 * @summary 分类列表
 * @request GET:/api/v1/panel/category
 * @response `200` `(DomainResponse & {
    data?: DomainVendorListResp,

})` OK
 */

export const getPanelCategoryList = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainVendorListResp;
    }
  >({
    path: `/api/v1/panel/category`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 创建分类
 *
 * @tags Panel
 * @name PostPanelCategoryCreate
 * @summary 创建分类
 * @request POST:/api/v1/panel/category
 * @response `200` `(DomainResponse & {
    data?: DomainCategory,

})` OK
 */

export const postPanelCategoryCreate = (body: DomainCategory, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainCategory;
    }
  >({
    path: `/api/v1/panel/category`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 更新分类
 *
 * @tags Panel
 * @name PutPanelCategoryUpdate
 * @summary 更新分类
 * @request PUT:/api/v1/panel/category/{id}
 * @response `200` `(DomainResponse & {
    data?: DomainCategory,

})` OK
 */

export const putPanelCategoryUpdate = (id: string, body: DomainCategory, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainCategory;
    }
  >({
    path: `/api/v1/panel/category/${id}`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 删除分类
 *
 * @tags Panel
 * @name DeletePanelCategoryDelete
 * @summary 删除分类
 * @request DELETE:/api/v1/panel/category/{id}
 * @response `200` `DomainResponse` OK
 */

export const deletePanelCategoryDelete = (id: string, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/category/${id}`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 待审核列表
 *
 * @tags Panel
 * @name GetPanelDraftList
 * @summary 待审核列表
 * @request GET:/api/v1/panel/draft
 * @response `200` `(DomainResponse & {
    data?: DomainDraftListResp,

})` OK
 */

export const getPanelDraftList = (query: GetPanelDraftListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainDraftListResp;
    }
  >({
    path: `/api/v1/panel/draft`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 审核操作
 *
 * @tags Panel
 * @name PostPanelDraftCheck
 * @summary 审核操作
 * @request POST:/api/v1/panel/draft/{id}/check
 * @response `200` `DomainResponse` OK
 */

export const postPanelDraftCheck = (
  { id, ...query }: PostPanelDraftCheckParams,
  body: DomainDraftCheckReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/panel/draft/${id}/check`,
    method: "POST",
    query: query,
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 上传图片Logo
 *
 * @tags Panel
 * @name PostPanelImageUpload
 * @summary 上传图片
 * @request POST:/api/v1/panel/image/upload
 * @response `200` `(DomainResponse & {
    data?: DomainUploadLogoResp,

})` OK
 */

export const postPanelImageUpload = (data: PostPanelImageUploadPayload, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainUploadLogoResp;
    }
  >({
    path: `/api/v1/panel/image/upload`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });

/**
 * @description 产品列表
 *
 * @tags Panel
 * @name GetPanelProductList
 * @summary 产品列表
 * @request GET:/api/v1/panel/product
 * @response `200` `(DomainResponse & {
    data?: DomainProductListResp,

})` OK
 */

export const getPanelProductList = (query: GetPanelProductListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainProductListResp;
    }
  >({
    path: `/api/v1/panel/product`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 创建产品
 *
 * @tags Panel
 * @name PostPanelProductCreate
 * @summary 创建产品
 * @request POST:/api/v1/panel/product
 * @response `200` `(DomainResponse & {
    data?: DomainProduct,

})` OK
 */

export const postPanelProductCreate = (body: DomainProductCreateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainProduct;
    }
  >({
    path: `/api/v1/panel/product`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description AI生成产品内容
 *
 * @tags Panel
 * @name PostPanelProductAi
 * @summary AI生成产品内容
 * @request POST:/api/v1/panel/product/ai
 * @response `200` `(DomainResponse & {
    data?: DomainProductAIResp,

})` OK
 */

export const postPanelProductAi = (body: DomainProductAIReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainProductAIResp;
    }
  >({
    path: `/api/v1/panel/product/ai`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 批量生成产品内容
 *
 * @tags Panel
 * @name PostPanelProductAiBatch
 * @summary 批量生成产品内容
 * @request POST:/api/v1/panel/product/ai/batch
 * @response `200` `DomainResponse` OK
 */

export const postPanelProductAiBatch = (body: DomainProductAIBatchReq, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/product/ai/batch`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 更新产品
 *
 * @tags Panel
 * @name PutPanelProductUpdate
 * @summary 更新产品
 * @request PUT:/api/v1/panel/product/{id}
 * @response `200` `(DomainResponse & {
    data?: DomainProduct,

})` OK
 */

export const putPanelProductUpdate = (id: string, body: DomainProductUpdateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainProduct;
    }
  >({
    path: `/api/v1/panel/product/${id}`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 删除产品
 *
 * @tags Panel
 * @name DeletePanelProductUpdate
 * @summary 删除产品
 * @request DELETE:/api/v1/panel/product/{id}
 * @response `200` `DomainResponse` OK
 */

export const deletePanelProductUpdate = (id: string, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/product/${id}`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 标签列表
 *
 * @tags Panel
 * @name GetTagList
 * @summary 标签列表
 * @request GET:/api/v1/panel/tag
 * @response `200` `(DomainResponse & {
    data?: DomainTagListResp,

})` OK
 */

export const getTagList = (query: GetTagListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTagListResp;
    }
  >({
    path: `/api/v1/panel/tag`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 标签创建
 *
 * @tags Panel
 * @name PostTagCreate
 * @summary 标签创建
 * @request POST:/api/v1/panel/tag
 * @response `200` `DomainResponse` OK
 */

export const postTagCreate = (body: DomainTagReq, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/tag`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 标签更新
 *
 * @tags Panel
 * @name PutTagUpdate
 * @summary 标签更新
 * @request PUT:/api/v1/panel/tag/{id}
 * @response `200` `DomainResponse` OK
 */

export const putTagUpdate = (id: number, body: DomainTagReq, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/tag/${id}`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 标签删除
 *
 * @tags Panel
 * @name DeleteTagDelete
 * @summary 标签删除
 * @request DELETE:/api/v1/panel/tag/{id}
 * @response `200` `DomainResponse` OK
 */

export const deleteTagDelete = (id: number, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/tag/${id}`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 领域列表
 *
 * @tags Panel
 * @name GetPanelTopicList
 * @summary 领域列表
 * @request GET:/api/v1/panel/topic
 * @response `200` `(DomainResponse & {
    data?: DomainTopicListResp,

})` OK
 */

export const getPanelTopicList = (query: GetPanelTopicListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopicListResp;
    }
  >({
    path: `/api/v1/panel/topic`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 创建领域
 *
 * @tags Panel
 * @name PostPanelTopicCreate
 * @summary 创建领域
 * @request POST:/api/v1/panel/topic
 * @response `200` `(DomainResponse & {
    data?: DomainTopic,

})` OK
 */

export const postPanelTopicCreate = (body: DomainTopicCreateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopic;
    }
  >({
    path: `/api/v1/panel/topic`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 热门领域列表
 *
 * @tags Panel
 * @name GetPanelTopicHotList
 * @summary 热门领域列表
 * @request GET:/api/v1/panel/topic/hot
 * @response `200` `(DomainResponse & {
    data?: DomainTopicHotListResp,

})` OK
 */

export const getPanelTopicHotList = (query: GetPanelTopicHotListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopicHotListResp;
    }
  >({
    path: `/api/v1/panel/topic/hot`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 添加热门领域
 *
 * @tags Panel
 * @name PostPanelTopicHotCreate
 * @summary 添加热门领域
 * @request POST:/api/v1/panel/topic/hot
 * @response `200` `DomainResponse` OK
 */

export const postPanelTopicHotCreate = (body: DomainTopicHotReq, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/topic/hot`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 删除热门领域
 *
 * @tags Panel
 * @name DeletePanelTopicHotDelete
 * @summary 删除热门领域
 * @request DELETE:/api/v1/panel/topic/hot/{name}
 * @response `200` `DomainResponse` OK
 */

export const deletePanelTopicHotDelete = (name: string, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/topic/hot/${name}`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 更新领域
 *
 * @tags Panel
 * @name PutPanelTopicUpdate
 * @summary 更新领域
 * @request PUT:/api/v1/panel/topic/{id}
 * @response `200` `(DomainResponse & {
    data?: DomainTopic,

})` OK
 */

export const putPanelTopicUpdate = (id: string, body: DomainTopicUpdateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainTopic;
    }
  >({
    path: `/api/v1/panel/topic/${id}`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 删除领域
 *
 * @tags Panel
 * @name DeletePanelTopicDelete
 * @summary 删除领域
 * @request DELETE:/api/v1/panel/topic/{id}
 * @response `200` `DomainResponse` OK
 */

export const deletePanelTopicDelete = (id: string, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/topic/${id}`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 厂商列表
 *
 * @tags Panel
 * @name GetPanelVendorList
 * @summary 厂商列表
 * @request GET:/api/v1/panel/vendor
 * @response `200` `(DomainResponse & {
    data?: DomainVendorListResp,

})` OK
 */

export const getPanelVendorList = (query: GetPanelVendorListParams, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainVendorListResp;
    }
  >({
    path: `/api/v1/panel/vendor`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 创建厂商
 *
 * @tags Panel
 * @name PostPanelVendorCreate
 * @summary 创建厂商
 * @request POST:/api/v1/panel/vendor
 * @response `200` `(DomainResponse & {
    data?: DomainVendor,

})` OK
 */

export const postPanelVendorCreate = (body: DomainVendorCreateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainVendor;
    }
  >({
    path: `/api/v1/panel/vendor`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 更新厂商
 *
 * @tags Panel
 * @name PutPanelVendorUpdate
 * @summary 更新厂商
 * @request PUT:/api/v1/panel/vendor/{id}
 * @response `200` `(DomainResponse & {
    data?: DomainVendor,

})` OK
 */

export const putPanelVendorUpdate = (id: string, body: DomainVendorUpdateReq, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainVendor;
    }
  >({
    path: `/api/v1/panel/vendor/${id}`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 删除厂商
 *
 * @tags Panel
 * @name DeletePanelVendorDelete
 * @summary 删除厂商
 * @request DELETE:/api/v1/panel/vendor/{id}
 * @response `200` `DomainResponse` OK
 */

export const deletePanelVendorDelete = (id: string, params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/api/v1/panel/vendor/${id}`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });
