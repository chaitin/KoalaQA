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
import { SvcPolishReq } from "./types";

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
