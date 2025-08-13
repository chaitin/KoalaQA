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
  ContextResponse,
  GetAdminKbKbIdQuestionParams,
  ModelKBDocumentDetail,
  ModelListRes,
  PostAdminKbKbIdQuestionFilePayload,
  SvcDocCreateQAReq,
  SvcDocListItem,
  SvcDocUpdateReq,
} from "./types";

/**
 * No description
 *
 * @tags question
 * @name GetAdminKbKbIdQuestion
 * @summary list kb question
 * @request GET:/admin/kb/{kb_id}/question
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcDocListItem)[],

}),

})` OK
 */

export const getAdminKbKbIdQuestion = (
  { kbId, ...query }: GetAdminKbKbIdQuestionParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcDocListItem[];
      };
    }
  >({
    path: `/admin/kb/${kbId}/question`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags question
 * @name PostAdminKbKbIdQuestion
 * @summary create kb question
 * @request POST:/admin/kb/{kb_id}/question
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postAdminKbKbIdQuestion = (
  kbId: number,
  req: SvcDocCreateQAReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/kb/${kbId}/question`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags question
 * @name PostAdminKbKbIdQuestionFile
 * @summary upload kb question assets
 * @request POST:/admin/kb/{kb_id}/question/file
 * @response `200` `ContextResponse` OK
 */

export const postAdminKbKbIdQuestionFile = (
  kbId: number,
  data: PostAdminKbKbIdQuestionFilePayload,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/question/file`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags question
 * @name GetAdminKbKbIdQuestionQaId
 * @summary kb question detail
 * @request GET:/admin/kb/{kb_id}/question/{qa_id}
 * @response `200` `(ContextResponse & {
    data?: ModelKBDocumentDetail,

})` OK
 */

export const getAdminKbKbIdQuestionQaId = (
  kbId: number,
  qaId: number,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelKBDocumentDetail;
    }
  >({
    path: `/admin/kb/${kbId}/question/${qaId}`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags question
 * @name PutAdminKbKbIdQuestionQaId
 * @summary update kb question
 * @request PUT:/admin/kb/{kb_id}/question/{qa_id}
 * @response `200` `ContextResponse` OK
 */

export const putAdminKbKbIdQuestionQaId = (
  kbId: number,
  qaId: number,
  req: SvcDocUpdateReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/question/${qaId}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags question
 * @name DeleteAdminKbKbIdQuestionQaId
 * @summary delete kb question
 * @request DELETE:/admin/kb/{kb_id}/question/{qa_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminKbKbIdQuestionQaId = (
  kbId: number,
  qaId: number,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/question/${qaId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });
