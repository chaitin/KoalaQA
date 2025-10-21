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
import { SvcPolishReq, SvcUpdatePromptReq } from "./types";

/**
 * @description polish text
 *
 * @tags llm
 * @name PostAdminLlmPolish
 * @summary polish text
 * @request POST:/admin/llm/polish
 * @response `200` `string` polish text
 */

export const postAdminLlmPolish = (
  req: SvcPolishReq,
  params: RequestParams = {},
) =>
  request<string>({
    path: `/admin/llm/polish`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description get system chat prompt
 *
 * @tags llm
 * @name GetAdminLlmSystemPrompt
 * @summary get system chat prompt
 * @request GET:/admin/llm/system-prompt
 * @response `200` `string` system chat prompt
 */

export const getAdminLlmSystemPrompt = (params: RequestParams = {}) =>
  request<string>({
    path: `/admin/llm/system-prompt`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description update system chat prompt
 *
 * @tags llm
 * @name PutAdminLlmSystemPrompt
 * @summary update system chat prompt
 * @request PUT:/admin/llm/system-prompt
 * @response `200` `string` success
 */

export const putAdminLlmSystemPrompt = (
  req: SvcUpdatePromptReq,
  params: RequestParams = {},
) =>
  request<string>({
    path: `/admin/llm/system-prompt`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
