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
  GetAdminUserReviewParams,
  ModelListRes,
  ModelUserReviewWithUser,
  PutAdminUserReviewReviewIdParams,
  SvcUserReviewGuestCreateReq,
  SvcUserReviewUpdateReq,
} from "./types";

/**
 * @description list user review
 *
 * @tags user_review
 * @name GetAdminUserReview
 * @summary list user review
 * @request GET:/admin/user/review
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelUserReviewWithUser)[],

}),

})` OK
 */

export const getAdminUserReview = (
  query: GetAdminUserReviewParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelUserReviewWithUser[];
      };
    }
  >({
    path: `/admin/user/review`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * @description update user review
 *
 * @tags user_review
 * @name PutAdminUserReviewReviewId
 * @summary update user review
 * @request PUT:/admin/user/review/{review_id}
 * @response `200` `ContextResponse` OK
 */

export const putAdminUserReviewReviewId = (
  { reviewId, ...query }: PutAdminUserReviewReviewIdParams,
  req: SvcUserReviewUpdateReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/admin/user/review/${reviewId}`,
    method: "PUT",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags user_review
 * @name PostUserReviewGuest
 * @summary create guest review
 * @request POST:/user/review/guest
 * @response `200` `ContextResponse` OK
 */

export const postUserReviewGuest = (
  req: SvcUserReviewGuestCreateReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/user/review/guest`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
