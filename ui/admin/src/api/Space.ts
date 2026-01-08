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
  DeleteAdminKbKbIdSpaceSpaceIdFolderFolderIdParams,
  DeleteAdminKbKbIdSpaceSpaceIdParams,
  GetAdminKbKbIdSpaceParams,
  GetAdminKbKbIdSpaceSpaceIdDocThirdDocIdParams,
  GetAdminKbKbIdSpaceSpaceIdFolderFolderIdDocParams,
  GetAdminKbKbIdSpaceSpaceIdFolderParams,
  GetAdminKbKbIdSpaceSpaceIdParams,
  GetAdminKbKbIdSpaceSpaceIdRemoteParams,
  ModelKBDocument,
  ModelListRes,
  ModelPlatformOpt,
  PostAdminKbKbIdSpaceParams,
  PostAdminKbKbIdSpaceSpaceIdFolderParams,
  PutAdminKbKbIdSpaceSpaceIdFolderFolderIdParams,
  PutAdminKbKbIdSpaceSpaceIdParams,
  PutAdminKbKbIdSpaceSpaceIdRefreshParams,
  SvcCreateSpaceFolderReq,
  SvcCreateSpaceReq,
  SvcDocListItem,
  SvcGetSpaceRes,
  SvcListAnydocNode,
  SvcListRemoteReq,
  SvcListSpaceFolderItem,
  SvcListSpaceItem,
  SvcUpdateSpaceFolderReq,
  SvcUpdateSpaceReq,
} from "./types";

/**
 * No description
 *
 * @tags space
 * @name PostAdminKbSpaceRemote
 * @summary list remote doc
 * @request POST:/admin/kb/space/remote
 * @response `200` `(ContextResponse & {
    data?: SvcListAnydocNode,

})` OK
 */

export const postAdminKbSpaceRemote = (
  req: SvcListRemoteReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcListAnydocNode;
    }
  >({
    path: `/admin/kb/space/remote`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name GetAdminKbKbIdSpace
 * @summary list kb space
 * @request GET:/admin/kb/{kb_id}/space
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcListSpaceItem)[],

}),

})` OK
 */

export const getAdminKbKbIdSpace = (
  { kbId, ...query }: GetAdminKbKbIdSpaceParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcListSpaceItem[];
      };
    }
  >({
    path: `/admin/kb/${kbId}/space`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name PostAdminKbKbIdSpace
 * @summary create kb space
 * @request POST:/admin/kb/{kb_id}/space
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postAdminKbKbIdSpace = (
  { kbId, ...query }: PostAdminKbKbIdSpaceParams,
  req: SvcCreateSpaceReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/kb/${kbId}/space`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name GetAdminKbKbIdSpaceSpaceId
 * @summary get kb space detail
 * @request GET:/admin/kb/{kb_id}/space/{space_id}
 * @response `200` `(ContextResponse & {
    data?: (SvcGetSpaceRes & {
    platform_opt?: ModelPlatformOpt,

}),

})` OK
 */

export const getAdminKbKbIdSpaceSpaceId = (
  { kbId, spaceId, ...query }: GetAdminKbKbIdSpaceSpaceIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcGetSpaceRes & {
        platform_opt?: ModelPlatformOpt;
      };
    }
  >({
    path: `/admin/kb/${kbId}/space/${spaceId}`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name PutAdminKbKbIdSpaceSpaceId
 * @summary update kb space
 * @request PUT:/admin/kb/{kb_id}/space/{space_id}
 * @response `200` `ContextResponse` OK
 */

export const putAdminKbKbIdSpaceSpaceId = (
  { kbId, spaceId, ...query }: PutAdminKbKbIdSpaceSpaceIdParams,
  req: SvcUpdateSpaceReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/space/${spaceId}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name DeleteAdminKbKbIdSpaceSpaceId
 * @summary delete kb space
 * @request DELETE:/admin/kb/{kb_id}/space/{space_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminKbKbIdSpaceSpaceId = (
  { kbId, spaceId, ...query }: DeleteAdminKbKbIdSpaceSpaceIdParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/space/${spaceId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name GetAdminKbKbIdSpaceSpaceIdDocThirdDocId
 * @summary get kb space doc
 * @request GET:/admin/kb/{kb_id}/space/{space_id}/doc/{third_doc_id}
 * @response `200` `(ContextResponse & {
    data?: ModelKBDocument,

})` OK
 */

export const getAdminKbKbIdSpaceSpaceIdDocThirdDocId = (
  {
    kbId,
    spaceId,
    thirdDocId,
    ...query
  }: GetAdminKbKbIdSpaceSpaceIdDocThirdDocIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelKBDocument;
    }
  >({
    path: `/admin/kb/${kbId}/space/${spaceId}/doc/${thirdDocId}`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name GetAdminKbKbIdSpaceSpaceIdFolder
 * @summary list kb space folder
 * @request GET:/admin/kb/{kb_id}/space/{space_id}/folder
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcListSpaceFolderItem)[],

}),

})` OK
 */

export const getAdminKbKbIdSpaceSpaceIdFolder = (
  { kbId, spaceId, ...query }: GetAdminKbKbIdSpaceSpaceIdFolderParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcListSpaceFolderItem[];
      };
    }
  >({
    path: `/admin/kb/${kbId}/space/${spaceId}/folder`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name PostAdminKbKbIdSpaceSpaceIdFolder
 * @summary create kb space folder
 * @request POST:/admin/kb/{kb_id}/space/{space_id}/folder
 * @response `200` `ContextResponse` OK
 */

export const postAdminKbKbIdSpaceSpaceIdFolder = (
  { kbId, spaceId, ...query }: PostAdminKbKbIdSpaceSpaceIdFolderParams,
  req: SvcCreateSpaceFolderReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/space/${spaceId}/folder`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name PutAdminKbKbIdSpaceSpaceIdFolderFolderId
 * @summary update kb space folder
 * @request PUT:/admin/kb/{kb_id}/space/{space_id}/folder/{folder_id}
 * @response `200` `ContextResponse` OK
 */

export const putAdminKbKbIdSpaceSpaceIdFolderFolderId = (
  {
    kbId,
    spaceId,
    folderId,
    ...query
  }: PutAdminKbKbIdSpaceSpaceIdFolderFolderIdParams,
  req: SvcUpdateSpaceFolderReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/space/${spaceId}/folder/${folderId}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name DeleteAdminKbKbIdSpaceSpaceIdFolderFolderId
 * @summary delete kb space folder
 * @request DELETE:/admin/kb/{kb_id}/space/{space_id}/folder/{folder_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminKbKbIdSpaceSpaceIdFolderFolderId = (
  {
    kbId,
    spaceId,
    folderId,
    ...query
  }: DeleteAdminKbKbIdSpaceSpaceIdFolderFolderIdParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/space/${spaceId}/folder/${folderId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name GetAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc
 * @summary list kb space folder doc
 * @request GET:/admin/kb/{kb_id}/space/{space_id}/folder/{folder_id}/doc
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcDocListItem)[],

}),

})` OK
 */

export const getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc = (
  {
    kbId,
    spaceId,
    folderId,
    ...query
  }: GetAdminKbKbIdSpaceSpaceIdFolderFolderIdDocParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcDocListItem[];
      };
    }
  >({
    path: `/admin/kb/${kbId}/space/${spaceId}/folder/${folderId}/doc`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name PutAdminKbKbIdSpaceSpaceIdRefresh
 * @summary update kb space all folder
 * @request PUT:/admin/kb/{kb_id}/space/{space_id}/refresh
 * @response `200` `ContextResponse` OK
 */

export const putAdminKbKbIdSpaceSpaceIdRefresh = (
  { kbId, spaceId, ...query }: PutAdminKbKbIdSpaceSpaceIdRefreshParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/kb/${kbId}/space/${spaceId}/refresh`,
    method: "PUT",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags space
 * @name GetAdminKbKbIdSpaceSpaceIdRemote
 * @summary list kb space remote doc
 * @request GET:/admin/kb/{kb_id}/space/{space_id}/remote
 * @response `200` `(ContextResponse & {
    data?: SvcListAnydocNode,

})` OK
 */

export const getAdminKbKbIdSpaceSpaceIdRemote = (
  { kbId, spaceId, ...query }: GetAdminKbKbIdSpaceSpaceIdRemoteParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcListAnydocNode;
    }
  >({
    path: `/admin/kb/${kbId}/space/${spaceId}/remote`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });
