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
import { DomainResponse, DomainUploadLogoResp, PostImageUploadPayload } from "./types";

/**
 * @description 上传图片Logo
 *
 * @tags Image
 * @name PostImageUpload
 * @summary 上传图片
 * @request POST:/api/v1/cyber/image/upload
 * @response `200` `(DomainResponse & {
    data?: DomainUploadLogoResp,

})` OK
 */

export const postImageUpload = (data: PostImageUploadPayload, params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainUploadLogoResp;
    }
  >({
    path: `/api/v1/cyber/image/upload`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });
