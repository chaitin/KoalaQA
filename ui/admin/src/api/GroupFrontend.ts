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
  ModelGroupItemInfo,
  ModelGroupWithItem,
  ModelListRes,
} from "./types";

/**
 * No description
 *
 * @tags group_frontend
 * @name GetGroup
 * @summary frontend list group
 * @request GET:/group
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: ((ModelGroupWithItem & {
    items?: (ModelGroupItemInfo)[],

}))[],

}),

})` OK
 */

export const getGroup = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: (ModelGroupWithItem & {
          items?: ModelGroupItemInfo[];
        })[];
      };
    }
  >({
    path: `/group`,
    method: "GET",
    format: "json",
    ...params,
  });
