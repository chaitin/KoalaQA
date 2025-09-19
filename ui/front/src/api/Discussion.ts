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
  DeleteDiscussionDiscIdCommentCommentIdParams,
  DeleteDiscussionDiscIdParams,
  GetDiscussionDiscIdParams,
  GetDiscussionParams,
  ModelDiscussion,
  ModelDiscussionDetail,
  ModelDiscussionListItem,
  ModelListRes,
  PostDiscussionDiscIdCommentCommentIdAcceptParams,
  PostDiscussionDiscIdCommentCommentIdDislikeParams,
  PostDiscussionDiscIdCommentCommentIdLikeParams,
  PostDiscussionDiscIdCommentCommentIdRevokeLikeParams,
  PostDiscussionDiscIdCommentParams,
  PostDiscussionUploadPayload,
  PutDiscussionDiscIdCommentCommentIdParams,
  PutDiscussionDiscIdParams,
  SvcCommentCreateReq,
  SvcCommentUpdateReq,
  SvcDiscussionCreateReq,
  SvcDiscussionSearchReq,
  SvcDiscussionUpdateReq,
} from "./types";

/**
 * @description list discussions
 *
 * @tags discussion
 * @name GetDiscussion
 * @summary list discussions
 * @request GET:/discussion
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelDiscussionListItem)[],

}),

})` OK
 */

export const getDiscussion = (
  query: GetDiscussionParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelDiscussionListItem[];
      };
    }
  >({
    path: `/discussion`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * @description create discussion
 *
 * @tags discussion
 * @name PostDiscussion
 * @summary create discussion
 * @request POST:/discussion
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const postDiscussion = (
  discussion: SvcDiscussionCreateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/discussion`,
    method: "POST",
    body: discussion,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description search discussion
 *
 * @tags discussion
 * @name PostDiscussionSearch
 * @summary search discussion
 * @request POST:/discussion/search
 * @response `200` `(ContextResponse & {
    data?: (ModelDiscussion)[],

})` OK
 */

export const postDiscussionSearch = (
  discussion: SvcDiscussionSearchReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelDiscussion[];
    }
  >({
    path: `/discussion/search`,
    method: "POST",
    body: discussion,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description discussion upload file
 *
 * @tags discussion
 * @name PostDiscussionUpload
 * @summary discussion upload file
 * @request POST:/discussion/upload
 * @response `200` `ContextResponse` OK
 */

export const postDiscussionUpload = (
  req: PostDiscussionUploadPayload,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/discussion/upload`,
    method: "POST",
    body: req,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });

/**
 * @description detail discussion
 *
 * @tags discussion
 * @name GetDiscussionDiscId
 * @summary detail discussion
 * @request GET:/discussion/{disc_id}
 * @response `200` `(ContextResponse & {
    data?: ModelDiscussionDetail,

})` OK
 */

export const getDiscussionDiscId = (
  { discId, ...query }: GetDiscussionDiscIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelDiscussionDetail;
    }
  >({
    path: `/discussion/${discId}`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description update discussion
 *
 * @tags discussion
 * @name PutDiscussionDiscId
 * @summary update discussion
 * @request PUT:/discussion/{disc_id}
 * @response `200` `(ContextResponse & {
    data?: unknown,

})` OK
 */

export const putDiscussionDiscId = (
  { discId, ...query }: PutDiscussionDiscIdParams,
  discussion: SvcDiscussionUpdateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: unknown;
    }
  >({
    path: `/discussion/${discId}`,
    method: "PUT",
    body: discussion,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description delete discussion
 *
 * @tags discussion
 * @name DeleteDiscussionDiscId
 * @summary delete discussion
 * @request DELETE:/discussion/{disc_id}
 * @response `200` `(ContextResponse & {
    data?: unknown,

})` OK
 */

export const deleteDiscussionDiscId = (
  { discId, ...query }: DeleteDiscussionDiscIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: unknown;
    }
  >({
    path: `/discussion/${discId}`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description create comment
 *
 * @tags discussion
 * @name PostDiscussionDiscIdComment
 * @summary create comment
 * @request POST:/discussion/{disc_id}/comment
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postDiscussionDiscIdComment = (
  { discId, ...query }: PostDiscussionDiscIdCommentParams,
  comment: SvcCommentCreateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/discussion/${discId}/comment`,
    method: "POST",
    body: comment,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description update comment
 *
 * @tags discussion
 * @name PutDiscussionDiscIdCommentCommentId
 * @summary update comment
 * @request PUT:/discussion/{disc_id}/comment/{comment_id}
 * @response `200` `(ContextResponse & {
    data?: unknown,

})` OK
 */

export const putDiscussionDiscIdCommentCommentId = (
  { discId, commentId, ...query }: PutDiscussionDiscIdCommentCommentIdParams,
  comment: SvcCommentUpdateReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: unknown;
    }
  >({
    path: `/discussion/${discId}/comment/${commentId}`,
    method: "PUT",
    body: comment,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description delete comment
 *
 * @tags discussion
 * @name DeleteDiscussionDiscIdCommentCommentId
 * @summary delete comment
 * @request DELETE:/discussion/{disc_id}/comment/{comment_id}
 * @response `200` `(ContextResponse & {
    data?: unknown,

})` OK
 */

export const deleteDiscussionDiscIdCommentCommentId = (
  { discId, commentId, ...query }: DeleteDiscussionDiscIdCommentCommentIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: unknown;
    }
  >({
    path: `/discussion/${discId}/comment/${commentId}`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description accept comment
 *
 * @tags discussion
 * @name PostDiscussionDiscIdCommentCommentIdAccept
 * @summary accept comment
 * @request POST:/discussion/{disc_id}/comment/{comment_id}/accept
 * @response `200` `(ContextResponse & {
    data?: unknown,

})` OK
 */

export const postDiscussionDiscIdCommentCommentIdAccept = (
  {
    discId,
    commentId,
    ...query
  }: PostDiscussionDiscIdCommentCommentIdAcceptParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: unknown;
    }
  >({
    path: `/discussion/${discId}/comment/${commentId}/accept`,
    method: "POST",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description dislike comment
 *
 * @tags discussion
 * @name PostDiscussionDiscIdCommentCommentIdDislike
 * @summary dislike comment
 * @request POST:/discussion/{disc_id}/comment/{comment_id}/dislike
 * @response `200` `ContextResponse` OK
 */

export const postDiscussionDiscIdCommentCommentIdDislike = (
  {
    discId,
    commentId,
    ...query
  }: PostDiscussionDiscIdCommentCommentIdDislikeParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/discussion/${discId}/comment/${commentId}/dislike`,
    method: "POST",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description like comment
 *
 * @tags discussion
 * @name PostDiscussionDiscIdCommentCommentIdLike
 * @summary like comment
 * @request POST:/discussion/{disc_id}/comment/{comment_id}/like
 * @response `200` `ContextResponse` OK
 */

export const postDiscussionDiscIdCommentCommentIdLike = (
  {
    discId,
    commentId,
    ...query
  }: PostDiscussionDiscIdCommentCommentIdLikeParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/discussion/${discId}/comment/${commentId}/like`,
    method: "POST",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description revoke comment like
 *
 * @tags discussion
 * @name PostDiscussionDiscIdCommentCommentIdRevokeLike
 * @summary revoke comment like
 * @request POST:/discussion/{disc_id}/comment/{comment_id}/revoke_like
 * @response `200` `ContextResponse` OK
 */

export const postDiscussionDiscIdCommentCommentIdRevokeLike = (
  {
    discId,
    commentId,
    ...query
  }: PostDiscussionDiscIdCommentCommentIdRevokeLikeParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/discussion/${discId}/comment/${commentId}/revoke_like`,
    method: "POST",
    type: ContentType.Json,
    format: "json",
    ...params,
  });
