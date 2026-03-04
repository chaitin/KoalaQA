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
  GetAdminRankAiInsightAiInsightIdDiscussionParams,
  GetAdminRankHotQuestionHotQuestionIdParams,
  GetAdminRankHotQuestionParams,
  GetRankContributeParams,
  ModelHotQuestion,
  ModelListRes,
  ModelRankTimeGroup,
  ModelRankTimeGroupItem,
  SvcAIInsightDiscussionItem,
  SvcRankContributeItem,
} from "./types";

/**
 * No description
 *
 * @tags rank
 * @name GetAdminRankAiInsight
 * @summary ai insight rank
 * @request GET:/admin/rank/ai_insight
 * @response `200` `(ContextResponse & {
    data?: ((ModelRankTimeGroup & {
    items?: (ModelRankTimeGroupItem)[],

}))[],

})` OK
 */

export const getAdminRankAiInsight = (params: RequestParams = {}) =>
  request<
    ContextResponse & {
      data?: (ModelRankTimeGroup & {
        items?: ModelRankTimeGroupItem[];
      })[];
    }
  >({
    path: `/admin/rank/ai_insight`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags rank
 * @name GetAdminRankAiInsightAiInsightIdDiscussion
 * @summary list ai insight discussion
 * @request GET:/admin/rank/ai_insight/{ai_insight_id}/discussion
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcAIInsightDiscussionItem)[],

}),

})` OK
 */

export const getAdminRankAiInsightAiInsightIdDiscussion = (
  { aiInsightId, ...query }: GetAdminRankAiInsightAiInsightIdDiscussionParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcAIInsightDiscussionItem[];
      };
    }
  >({
    path: `/admin/rank/ai_insight/${aiInsightId}/discussion`,
    method: "GET",
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags rank
 * @name GetAdminRankHotQuestion
 * @summary hot question rank
 * @request GET:/admin/rank/hot_question
 * @response `200` `(ContextResponse & {
    data?: ((ModelRankTimeGroup & {
    items?: (ModelRankTimeGroupItem)[],

}))[],

})` OK
 */

export const getAdminRankHotQuestion = (
  query: GetAdminRankHotQuestionParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: (ModelRankTimeGroup & {
        items?: ModelRankTimeGroupItem[];
      })[];
    }
  >({
    path: `/admin/rank/hot_question`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags rank
 * @name GetAdminRankHotQuestionHotQuestionId
 * @summary list hot quesion item
 * @request GET:/admin/rank/hot_question/{hot_question_id}
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (ModelHotQuestion)[],

}),

})` OK
 */

export const getAdminRankHotQuestionHotQuestionId = (
  { hotQuestionId, ...query }: GetAdminRankHotQuestionHotQuestionIdParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: ModelHotQuestion[];
      };
    }
  >({
    path: `/admin/rank/hot_question/${hotQuestionId}`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });

/**
 * No description
 *
 * @tags rank
 * @name GetRankContribute
 * @summary contribyte rank
 * @request GET:/rank/contribute
 * @response `200` `(ContextResponse & {
    data?: (ModelListRes & {
    items?: (SvcRankContributeItem)[],

}),

})` OK
 */

export const getRankContribute = (
  query: GetRankContributeParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcRankContributeItem[];
      };
    }
  >({
    path: `/rank/contribute`,
    method: "GET",
    query: query,
    format: "json",
    ...params,
  });
