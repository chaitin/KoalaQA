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
  DeleteDiscussionDiscIdFollowParams,
  DeleteDiscussionDiscIdParams,
  GetAdminDiscussionAskParams,
  GetAdminDiscussionAskSessionParams,
  GetAdminDiscussionParams,
  GetDiscussionAskAskSessionIdParams,
  GetDiscussionAskSessionParams,
  GetDiscussionDiscIdAssociateParams,
  GetDiscussionDiscIdFollowParams,
  GetDiscussionDiscIdParams,
  GetDiscussionDiscIdSimilarityParams,
  GetDiscussionFollowParams,
  GetDiscussionParams,
  ModelAskSession,
  ModelAskSessionSummaryDisc,
  ModelDiscussion,
  ModelDiscussionDetail,
  ModelDiscussionListItem,
  ModelListRes,
  PostDiscussionDiscIdAiLearnParams,
  PostDiscussionDiscIdAssociateParams,
  PostDiscussionDiscIdCommentCommentIdAcceptParams,
  PostDiscussionDiscIdCommentCommentIdDislikeParams,
  PostDiscussionDiscIdCommentCommentIdLikeParams,
  PostDiscussionDiscIdCommentCommentIdRevokeLikeParams,
  PostDiscussionDiscIdCommentParams,
  PostDiscussionDiscIdFollowParams,
  PostDiscussionDiscIdLikeParams,
  PostDiscussionDiscIdRequirementParams,
  PostDiscussionDiscIdResolveIssueParams,
  PostDiscussionDiscIdResolveParams,
  PostDiscussionDiscIdRevokeLikeParams,
  PostDiscussionSummaryParams,
  PostDiscussionUploadPayload,
  PutDiscussionDiscIdCloseParams,
  PutDiscussionDiscIdCommentCommentIdParams,
  PutDiscussionDiscIdParams,
  SvcAssociateDiscussionReq,
  SvcCommentCreateReq,
  SvcCommentUpdateReq,
  SvcDiscussionAskReq,
  SvcDiscussionCompeletReq,
  SvcDiscussionContentSummaryReq,
  SvcDiscussionCreateReq,
  SvcDiscussionListFollowRes,
  SvcDiscussionUpdateReq,
  SvcListAsksRes,
  SvcResolveFeedbackReq,
  SvcResolveIssueReq,
  SvcStopAskSessionReq,
  SvcSummaryByContentReq,
} from "./types";

/**
 * @description backend list discussions
 *
 * @tags discussion
 * @name GetAdminDiscussion
 * @summary backend list discussions
 * @request GET:/admin/discussion
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelDiscussionListItem)[],

}),

})` OK
 */

export const getAdminDiscussion = (
  query: GetAdminDiscussionParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelDiscussionListItem[];
      };
    }
  >({
    path: `/admin/discussion`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * @description backend ask session group
 *
 * @tags discussion
 * @name GetAdminDiscussionAsk
 * @summary backend ask session group
 * @request GET:/admin/discussion/ask
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcListAsksRes)[],

}),

})` OK
 */

export const getAdminDiscussionAsk = (
  query: GetAdminDiscussionAskParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcListAsksRes[];
      };
    }
  >({
    path: `/admin/discussion/ask`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * @description backend ask session
 *
 * @tags discussion
 * @name GetAdminDiscussionAskSession
 * @summary backend ask session
 * @request GET:/admin/discussion/ask/session
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: ((ModelAskSession & {
    summary_discs?: (ModelAskSessionSummaryDisc)[],

}))[],

}),

})` OK
 */

export const getAdminDiscussionAskSession = (
  query: GetAdminDiscussionAskSessionParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: (ModelAskSession & {
          summary_discs?: ModelAskSessionSummaryDisc[];
        })[];
      };
    }
  >({
    path: `/admin/discussion/ask/session`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

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
 * @description user ask
 *
 * @tags discussion
 * @name PostDiscussionAsk
 * @summary user ask
 * @request POST:/discussion/ask
 */

export const postDiscussionAsk = (
  req: SvcDiscussionAskReq,
  params: RequestParams = {},
) =>
  request<unknown>({
    path: `/discussion/ask`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    ...params,
  });

/**
 * @description create or get last session id
 *
 * @tags discussion
 * @name GetDiscussionAskSession
 * @summary create or get last session id
 * @request GET:/discussion/ask/session
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const getDiscussionAskSession = (
  query: GetDiscussionAskSessionParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/discussion/ask/session`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * @description stop discussion ask history
 *
 * @tags discussion
 * @name PostDiscussionAskStop
 * @summary stop discussion ask history
 * @request POST:/discussion/ask/stop
 * @response `200` `ContextResponse` OK
 */

export const postDiscussionAskStop = (
  req: SvcStopAskSessionReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/discussion/ask/stop`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description discussion ask history
 *
 * @tags discussion
 * @name GetDiscussionAskAskSessionId
 * @summary discussion ask history
 * @request GET:/discussion/ask/{ask_session_id}
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: ((ModelAskSession & {
    summary_discs?: (ModelAskSessionSummaryDisc)[],

}))[],

}),

})` OK
 */

export const getDiscussionAskAskSessionId = (
  { askSessionId, ...query }: GetDiscussionAskAskSessionIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: (ModelAskSession & {
          summary_discs?: ModelAskSessionSummaryDisc[];
        })[];
      };
    }
  >({
    path: `/discussion/ask/${askSessionId}`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * @description tab complete
 *
 * @tags discussion
 * @name PostDiscussionComplete
 * @summary tab complete
 * @request POST:/discussion/complete
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const postDiscussionComplete = (
  req: SvcDiscussionCompeletReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/discussion/complete`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description discussion content summary
 *
 * @tags discussion
 * @name PostDiscussionContentSummary
 * @summary discussion content summary
 * @request POST:/discussion/content_summary
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const postDiscussionContentSummary = (
  req: SvcDiscussionContentSummaryReq,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/discussion/content_summary`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description list follow discussions
 *
 * @tags discussion
 * @name GetDiscussionFollow
 * @summary list follow discussions
 * @request GET:/discussion/follow
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelDiscussion)[],

}),

})` OK
 */

export const getDiscussionFollow = (
  query: GetDiscussionFollowParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelDiscussion[];
      };
    }
  >({
    path: `/discussion/follow`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * @description discussions summary
 *
 * @tags discussion
 * @name PostDiscussionSummary
 * @summary discussions summary
 * @request POST:/discussion/summary
 */

export const postDiscussionSummary = (
  query: PostDiscussionSummaryParams,
  params: RequestParams = {},
) =>
  request<unknown>({
    path: `/discussion/summary`,
    method: "POST",
    query: query,
    ...params,
  });

/**
 * @description content summary
 *
 * @tags discussion
 * @name PostDiscussionSummaryContent
 * @summary content summary
 * @request POST:/discussion/summary/content
 */

export const postDiscussionSummaryContent = (
  req: SvcSummaryByContentReq,
  params: RequestParams = {},
) =>
  request<unknown>({
    path: `/discussion/summary/content`,
    method: "POST",
    body: req,
    type: ContentType.Json,
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
    query: query,
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
 * @description discussion ai learn
 *
 * @tags discussion
 * @name PostDiscussionDiscIdAiLearn
 * @summary discussion ai learn
 * @request POST:/discussion/{disc_id}/ai_learn
 * @response `200` `ContextResponse` OK
 */

export const postDiscussionDiscIdAiLearn = (
  { discId, ...query }: PostDiscussionDiscIdAiLearnParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/discussion/${discId}/ai_learn`,
    method: "POST",
    format: "json",
    ...params,
  });

/**
 * @description list associate discussion
 *
 * @tags discussion
 * @name GetDiscussionDiscIdAssociate
 * @summary list associate discussion
 * @request GET:/discussion/{disc_id}/associate
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelDiscussionListItem)[],

}),

})` OK
 */

export const getDiscussionDiscIdAssociate = (
  { discId, ...query }: GetDiscussionDiscIdAssociateParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelDiscussionListItem[];
      };
    }
  >({
    path: `/discussion/${discId}/associate`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * @description associate discussion
 *
 * @tags discussion
 * @name PostDiscussionDiscIdAssociate
 * @summary associate discussion
 * @request POST:/discussion/{disc_id}/associate
 * @response `200` `ContextResponse` OK
 */

export const postDiscussionDiscIdAssociate = (
  { discId, ...query }: PostDiscussionDiscIdAssociateParams,
  discussion: SvcAssociateDiscussionReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/discussion/${discId}/associate`,
    method: "POST",
    body: discussion,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description close discussion
 *
 * @tags discussion
 * @name PutDiscussionDiscIdClose
 * @summary close discussion
 * @request PUT:/discussion/{disc_id}/close
 * @response `200` `ContextResponse` OK
 */

export const putDiscussionDiscIdClose = (
  { discId, ...query }: PutDiscussionDiscIdCloseParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/discussion/${discId}/close`,
    method: "PUT",
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

/**
 * @description get discussion follow info
 *
 * @tags discussion
 * @name GetDiscussionDiscIdFollow
 * @summary get discussion follow info
 * @request GET:/discussion/{disc_id}/follow
 * @response `200` `(ContextResponse & {
    data?: SvcDiscussionListFollowRes,

})` OK
 */

export const getDiscussionDiscIdFollow = (
  { discId, ...query }: GetDiscussionDiscIdFollowParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: SvcDiscussionListFollowRes;
    }
  >({
    path: `/discussion/${discId}/follow`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description follow discussion
 *
 * @tags discussion
 * @name PostDiscussionDiscIdFollow
 * @summary follow discussion
 * @request POST:/discussion/{disc_id}/follow
 * @response `200` `(ContextResponse & {
    data?: number,

})` OK
 */

export const postDiscussionDiscIdFollow = (
  { discId, ...query }: PostDiscussionDiscIdFollowParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: number;
    }
  >({
    path: `/discussion/${discId}/follow`,
    method: "POST",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description unfollow discussion
 *
 * @tags discussion
 * @name DeleteDiscussionDiscIdFollow
 * @summary unfollow discussion
 * @request DELETE:/discussion/{disc_id}/follow
 * @response `200` `ContextResponse` OK
 */

export const deleteDiscussionDiscIdFollow = (
  { discId, ...query }: DeleteDiscussionDiscIdFollowParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/discussion/${discId}/follow`,
    method: "DELETE",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description like discussion
 *
 * @tags discussion
 * @name PostDiscussionDiscIdLike
 * @summary like discussion
 * @request POST:/discussion/{disc_id}/like
 * @response `200` `(ContextResponse & {
    data?: unknown,

})` OK
 */

export const postDiscussionDiscIdLike = (
  { discId, ...query }: PostDiscussionDiscIdLikeParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: unknown;
    }
  >({
    path: `/discussion/${discId}/like`,
    method: "POST",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description discussion requirement
 *
 * @tags discussion
 * @name PostDiscussionDiscIdRequirement
 * @summary discussion requirement
 * @request POST:/discussion/{disc_id}/requirement
 * @response `200` `(ContextResponse & {
    data?: string,

})` OK
 */

export const postDiscussionDiscIdRequirement = (
  { discId, ...query }: PostDiscussionDiscIdRequirementParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: string;
    }
  >({
    path: `/discussion/${discId}/requirement`,
    method: "POST",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description resolve feedback
 *
 * @tags discussion
 * @name PostDiscussionDiscIdResolve
 * @summary resolve feedback
 * @request POST:/discussion/{disc_id}/resolve
 * @response `200` `ContextResponse` OK
 */

export const postDiscussionDiscIdResolve = (
  { discId, ...query }: PostDiscussionDiscIdResolveParams,
  req: SvcResolveFeedbackReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/discussion/${discId}/resolve`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description resolve issue
 *
 * @tags discussion
 * @name PostDiscussionDiscIdResolveIssue
 * @summary resolve issue
 * @request POST:/discussion/{disc_id}/resolve_issue
 * @response `200` `ContextResponse` OK
 */

export const postDiscussionDiscIdResolveIssue = (
  { discId, ...query }: PostDiscussionDiscIdResolveIssueParams,
  req: SvcResolveIssueReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/discussion/${discId}/resolve_issue`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description revoke like discussion
 *
 * @tags discussion
 * @name PostDiscussionDiscIdRevokeLike
 * @summary revoke like discussion
 * @request POST:/discussion/{disc_id}/revoke_like
 * @response `200` `(ContextResponse & {
    data?: unknown,

})` OK
 */

export const postDiscussionDiscIdRevokeLike = (
  { discId, ...query }: PostDiscussionDiscIdRevokeLikeParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: unknown;
    }
  >({
    path: `/discussion/${discId}/revoke_like`,
    method: "POST",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description list similarity discussion
 *
 * @tags discussion
 * @name GetDiscussionDiscIdSimilarity
 * @summary list similarity discussion
 * @request GET:/discussion/{disc_id}/similarity
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelDiscussionListItem)[],

}),

})` OK
 */

export const getDiscussionDiscIdSimilarity = (
  { discId, ...query }: GetDiscussionDiscIdSimilarityParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelDiscussionListItem[];
      };
    }
  >({
    path: `/discussion/${discId}/similarity`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });
