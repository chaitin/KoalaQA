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

import request, { RequestParams } from "./httpClient";
import {
  ContextResponse,
  DeleteAdminKbKbIdWebDocIdParams,
  GetAdminKbKbIdWebParams,
  ModelListRes,
  PutAdminKbKbIdWebDocIdParams,
  SvcListWebItem,
} from "./types";

/**
 * No description
 *
 * @tags web
 * @name GetAdminKbKbIdWeb
 * @summary list kb web
 * @request GET:/admin/kb/{kb_id}/web
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcListWebItem)[],

}),

})` OK
 */

export const getAdminKbKbIdWeb = (
  { kbId, ...query }: GetAdminKbKbIdWebParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcListWebItem[];
      };
    }
  >({
    path: `/admin/kb/${kbId}/web`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags web
 * @name PutAdminKbKbIdWebDocId
 * @summary update kb web
 * @request PUT:/admin/kb/{kb_id}/web/{doc_id}
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const putAdminKbKbIdWebDocId = (
  { kbId, docId, ...query }: PutAdminKbKbIdWebDocIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/admin/kb/${kbId}/web/${docId}`,
    method: "PUT",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags web
 * @name DeleteAdminKbKbIdWebDocId
 * @summary delete kb web
 * @request DELETE:/admin/kb/{kb_id}/web/{doc_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminKbKbIdWebDocId = (
  { kbId, docId, ...query }: DeleteAdminKbKbIdWebDocIdParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/web/${docId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });
