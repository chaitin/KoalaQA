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
  ModelListRes,
  SvcKBCreateReq,
  SvcKBListItem,
  SvcKBUpdateReq,
} from "./types";

/**
 * No description
 *
 * @tags knowledge_base
 * @name GetAdminKb
 * @summary list kb
 * @request GET:/admin/kb
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcKBListItem)[],

}),

})` OK
 */

export const getAdminKb = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcKBListItem[];
      };
    }
  >({
    path: `/admin/kb`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags knowledge_base
 * @name PostAdminKb
 * @summary create kb
 * @request POST:/admin/kb
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postAdminKb = (req: SvcKBCreateReq, params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/kb`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags knowledge_base
 * @name PutAdminKbKbId
 * @summary update kb
 * @request PUT:/admin/kb/{kb_id}
 * @response `200` `ContextResponse` OK
 */

export const putAdminKbKbId = (
  kbId: number,
  req: SvcKBUpdateReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags knowledge_base
 * @name DeleteAdminKbKbId
 * @summary delete kb
 * @request DELETE:/admin/kb/{kb_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminKbKbId = (kbId: number, params: RequestParams = {}) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });
