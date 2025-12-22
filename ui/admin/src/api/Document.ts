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
  AnydocListRes,
  ContextResponse,
  DeleteAdminKbKbIdDocumentDocIdParams,
  GetAdminKbKbIdDocumentDocIdParams,
  GetAdminKbKbIdDocumentParams,
  ModelKBDocumentDetail,
  ModelListRes,
  PostAdminKbDocumentFileListPayload,
  SvcDocListItem,
  SvcFileExportReq,
  SvcSitemapExportReq,
  SvcSitemapListReq,
  SvcURLExportReq,
  SvcURLListReq,
} from "./types";

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
    data?: AnydocListRes,

})` OK
 */

export const postAdminKbDocumentFileList = (
  data: PostAdminKbDocumentFileListPayload,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: AnydocListRes;
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
    data?: AnydocListRes,

})` OK
 */

export const postAdminKbDocumentSitemapList = (
  req: SvcSitemapListReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: AnydocListRes;
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
    data?: AnydocListRes,

})` OK
 */

export const postAdminKbDocumentUrlList = (
  req: SvcURLListReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: AnydocListRes;
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
