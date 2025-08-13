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

/**
 * @description oauth callback
 *
 * @tags PanelAuth
 * @name GetPanelOauthCtCallback
 * @summary oauth callback
 * @request GET:/api/panel/oauth/ct/callback
 */

export const getPanelOauthCtCallback = (params: RequestParams = {}) =>
  request<unknown>({
    path: `/api/panel/oauth/ct/callback`,
    method: "GET",
    ...params,
  });

/**
 * @description oauth redirect
 *
 * @tags PanelAuth
 * @name GetPanelOauthCtRedirect
 * @summary oauth redirect
 * @request GET:/api/panel/oauth/ct/redirect
 */

export const getPanelOauthCtRedirect = (params: RequestParams = {}) =>
  request<unknown>({
    path: `/api/panel/oauth/ct/redirect`,
    method: "GET",
    ...params,
  });
