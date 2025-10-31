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
  DeleteAdminOrgOrgIdParams,
  GetAdminOrgParams,
  ModelListRes,
  PutAdminOrgOrgIdParams,
  SvcOrgListItem,
  SvcOrgUpsertReq,
} from "./types";

/**
 * No description
 *
 * @tags org
 * @name GetAdminOrg
 * @summary list org
 * @request GET:/admin/org
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcOrgListItem)[],

}),

})` OK
 */

export const getAdminOrg = (
  query: GetAdminOrgParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcOrgListItem[];
      };
    }
  >({
    path: `/admin/org`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags org
 * @name PostAdminOrg
 * @summary create org
 * @request POST:/admin/org
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postAdminOrg = (
  req: SvcOrgUpsertReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/org`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags org
 * @name PutAdminOrgOrgId
 * @summary update org
 * @request PUT:/admin/org/{org_id}
 * @response `200` `ContextResponse` OK
 */

export const putAdminOrgOrgId = (
  { orgId, ...query }: PutAdminOrgOrgIdParams,
  req: SvcOrgUpsertReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/org/${orgId}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags org
 * @name DeleteAdminOrgOrgId
 * @summary delete org
 * @request DELETE:/admin/org/{org_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminOrgOrgId = (
  { orgId, ...query }: DeleteAdminOrgOrgIdParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/org/${orgId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });
