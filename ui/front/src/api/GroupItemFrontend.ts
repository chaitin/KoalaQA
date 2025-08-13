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
import { ContextResponse, ModelGroupItem, ModelListRes } from "./types";

/**
 * No description
 *
 * @tags group_item_frontend
 * @name ItemDetail
 * @summary frontend list group item
 * @request GET:/group/{group_id}/item
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelGroupItem)[],

}),

})` OK
 */

export const itemDetail = (groupId: number, params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelGroupItem[];
      };
    }
  >({
    path: `/group/${groupId}/item`,
    method: "GET",
    format: "json",
    ...params,
  });
