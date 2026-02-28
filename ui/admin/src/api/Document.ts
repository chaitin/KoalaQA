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
  AdminDocUserRes,
  ContextResponse,
  DeleteAdminKbKbIdDocumentDocIdParams,
  GetAdminKbKbIdDocumentDocIdParams,
  GetAdminKbKbIdDocumentParams,
  ModelKBDocumentDetail,
  ModelListRes,
  PostAdminKbDocumentFileListPayload,
  PostAdminKbDocumentYuqueListPayload,
  PutAdminKbKbIdDocumentGroupIdsParams,
  SvcAnydocListRes,
  SvcDocListItem,
  SvcFeishuAuthURLReq,
  SvcFileExportReq,
  SvcSitemapExportReq,
  SvcSitemapListReq,
  SvcURLExportReq,
  SvcURLListReq,
  SvcUpdateGroupIDsReq,
} from "./types";

/**
 * No description
 *
 * @tags document
 * @name PostAdminKbDocumentFeishuAuthUrl
 * @summary feishu auth url
 * @request POST:/admin/kb/document/feishu/auth_url
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const postAdminKbDocumentFeishuAuthUrl = (
  req: SvcFeishuAuthURLReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/admin/kb/document/feishu/auth_url`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name GetAdminKbDocumentFeishuUser
 * @summary feishu user
 * @request GET:/admin/kb/document/feishu/user
 * @response `200` `(ContextResponse & {
    data?: AdminDocUserRes,

})` OK
 */

export const getAdminKbDocumentFeishuUser = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: AdminDocUserRes;
    }
  >({
    path: `/admin/kb/document/feishu/user`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name PostAdminKbDocumentFileExport
 * @summary export file document
 * @request POST:/admin/kb/document/file/export
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const postAdminKbDocumentFileExport = (
  req: SvcFileExportReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/admin/kb/document/file/export`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name PostAdminKbDocumentFileList
 * @summary list file documents
 * @request POST:/admin/kb/document/file/list
 * @response `200` `(ContextResponse & {
    data?: SvcAnydocListRes,

})` OK
 */

export const postAdminKbDocumentFileList = (
  data: PostAdminKbDocumentFileListPayload,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcAnydocListRes;
    }
  >({
    path: `/admin/kb/document/file/list`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name PostAdminKbDocumentSitemapExport
 * @summary export sitemap document
 * @request POST:/admin/kb/document/sitemap/export
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const postAdminKbDocumentSitemapExport = (
  req: SvcSitemapExportReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/admin/kb/document/sitemap/export`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name PostAdminKbDocumentSitemapList
 * @summary list sitemap documents
 * @request POST:/admin/kb/document/sitemap/list
 * @response `200` `(ContextResponse & {
    data?: SvcAnydocListRes,

})` OK
 */

export const postAdminKbDocumentSitemapList = (
  req: SvcSitemapListReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcAnydocListRes;
    }
  >({
    path: `/admin/kb/document/sitemap/list`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name PostAdminKbDocumentUrlExport
 * @summary export url document
 * @request POST:/admin/kb/document/url/export
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const postAdminKbDocumentUrlExport = (
  req: SvcURLExportReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/admin/kb/document/url/export`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name PostAdminKbDocumentUrlList
 * @summary list url documents
 * @request POST:/admin/kb/document/url/list
 * @response `200` `(ContextResponse & {
    data?: SvcAnydocListRes,

})` OK
 */

export const postAdminKbDocumentUrlList = (
  req: SvcURLListReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcAnydocListRes;
    }
  >({
    path: `/admin/kb/document/url/list`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name PostAdminKbDocumentYuqueExport
 * @summary export yuque document
 * @request POST:/admin/kb/document/yuque/export
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const postAdminKbDocumentYuqueExport = (
  req: SvcFileExportReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/admin/kb/document/yuque/export`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name PostAdminKbDocumentYuqueList
 * @summary list yuque documents
 * @request POST:/admin/kb/document/yuque/list
 * @response `200` `(ContextResponse & {
    data?: SvcAnydocListRes,

})` OK
 */

export const postAdminKbDocumentYuqueList = (
  data: PostAdminKbDocumentYuqueListPayload,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcAnydocListRes;
    }
  >({
    path: `/admin/kb/document/yuque/list`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name GetAdminKbKbIdDocument
 * @summary list kb document
 * @request GET:/admin/kb/{kb_id}/document
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcDocListItem)[],

}),

})` OK
 */

export const getAdminKbKbIdDocument = (
  { kbId, ...query }: GetAdminKbKbIdDocumentParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcDocListItem[];
      };
    }
  >({
    path: `/admin/kb/${kbId}/document`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name PutAdminKbKbIdDocumentGroupIds
 * @summary update doc group_ids
 * @request PUT:/admin/kb/{kb_id}/document/group_ids
 * @response `200` `ContextResponse` OK
 */

export const putAdminKbKbIdDocumentGroupIds = (
  { kbId, ...query }: PutAdminKbKbIdDocumentGroupIdsParams,
  req: SvcUpdateGroupIDsReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/document/group_ids`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name GetAdminKbKbIdDocumentDocId
 * @summary get kb document detail
 * @request GET:/admin/kb/{kb_id}/document/{doc_id}
 * @response `200` `(ContextResponse & {
    data?: ModelKBDocumentDetail,

})` OK
 */

export const getAdminKbKbIdDocumentDocId = (
  { kbId, docId, ...query }: GetAdminKbKbIdDocumentDocIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelKBDocumentDetail;
    }
  >({
    path: `/admin/kb/${kbId}/document/${docId}`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags document
 * @name DeleteAdminKbKbIdDocumentDocId
 * @summary delete kb document
 * @request DELETE:/admin/kb/{kb_id}/document/{doc_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminKbKbIdDocumentDocId = (
  { kbId, docId, ...query }: DeleteAdminKbKbIdDocumentDocIdParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/document/${docId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });
