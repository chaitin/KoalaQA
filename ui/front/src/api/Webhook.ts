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
  DeleteAdminSystemWebhookWebhookIdParams,
  GetAdminSystemWebhookWebhookIdParams,
  ModelListRes,
  ModelWebhook,
  ModelWebhookConfig,
  PutAdminSystemWebhookWebhookIdParams,
  SvcWebhookCreateReq,
  SvcWebhookUpdateReq,
} from "./types";

/**
 * No description
 *
 * @tags webhook
 * @name GetAdminSystemWebhook
 * @summary list webhook
 * @request GET:/admin/system/webhook
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelWebhook)[],

}),

})` OK
 */

export const getAdminSystemWebhook = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelWebhook[];
      };
    }
  >({
    path: `/admin/system/webhook`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags webhook
 * @name PostAdminSystemWebhook
 * @summary create webhook
 * @request POST:/admin/system/webhook
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postAdminSystemWebhook = (
  req: SvcWebhookCreateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/admin/system/webhook`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags webhook
 * @name GetAdminSystemWebhookWebhookId
 * @summary webhook detail
 * @request GET:/admin/system/webhook/{webhook_id}
 * @response `200` `(ContextResponse & {
    data?: ModelWebhookConfig,

})` OK
 */

export const getAdminSystemWebhookWebhookId = (
  { webhookId, ...query }: GetAdminSystemWebhookWebhookIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelWebhookConfig;
    }
  >({
    path: `/admin/system/webhook/${webhookId}`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags webhook
 * @name PutAdminSystemWebhookWebhookId
 * @summary update webhook config
 * @request PUT:/admin/system/webhook/{webhook_id}
 * @response `200` `ContextResponse` OK
 */

export const putAdminSystemWebhookWebhookId = (
  { webhookId, ...query }: PutAdminSystemWebhookWebhookIdParams,
  req: SvcWebhookUpdateReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/system/webhook/${webhookId}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags webhook
 * @name DeleteAdminSystemWebhookWebhookId
 * @summary delete webhook
 * @request DELETE:/admin/system/webhook/{webhook_id}
 * @response `200` `ContextResponse` OK
 */

export const deleteAdminSystemWebhookWebhookId = (
  { webhookId, ...query }: DeleteAdminSystemWebhookWebhookIdParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/system/webhook/${webhookId}`,
    method: "DELETE",
    format: "json",
    ...params,
  });
