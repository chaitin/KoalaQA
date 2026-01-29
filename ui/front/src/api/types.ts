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

export enum TopicKBSpaceUpdateType {
  KBSpaceUpdateTypeAll = 0,
  KBSpaceUpdateTypeIncr = 1,
  KBSpaceUpdateTypeFailed = 2,
}

export enum SvcDiscussionListFilter {
  DiscussionListFilterHot = "hot",
  DiscussionListFilterNew = "new",
  DiscussionListFilterPublish = "publish",
}

export enum PlatformPlatformType {
  PlatformUnknown = 0,
  PlatformConfluence = 1,
  PlatformFeishu = 2,
  PlatformFile = 3,
  PlatformNotion = 4,
  PlatformSitemap = 5,
  PlatformURL = 6,
  PlatformWikiJS = 7,
  PlatformYuQue = 8,
  PlatformPandawiki = 9,
  PlatformDingtalk = 10,
}

export enum ModelWebhookType {
  WebhookTypeDingtalk = 1,
  WebhookTypeHTTP = 2,
}

export enum ModelUserRole {
  UserRoleUnknown = 0,
  UserRoleAdmin = 1,
  UserRoleOperator = 2,
  UserRoleUser = 3,
  UserRoleGuest = 4,
  UserRoleMax = 5,
}

export enum ModelUserPointType {
  UserPointTypeCreateBlog = 1,
  /** 回答被采纳 */
  UserPointTypeAnswerAccepted = 2,
  UserPointTypeLikeBlog = 3,
  UserPointTypeAnswerLiked = 4,
  UserPointTypeAssociateIssue = 5,
  /** 采纳别人回答 */
  UserPointTypeAcceptAnswer = 6,
  UserPointTypeAnswerQA = 7,
  /** 回答被点踩 */
  UserPointTypeAnswerDisliked = 8,
  /** 点踩别人回答 */
  UserPointTypeDislikeAnswer = 9,
  UserPointTypeUserRole = 10,
  UserPointTypeUserAvatar = 11,
  UserPointTypeUserIntro = 12,
}

export enum ModelTrendType {
  TrendTypeCreateDiscuss = 1,
  TrendTypeAnswerAccepted = 2,
  TrendTypeAnswer = 3,
}

export enum ModelStatType {
  StatTypeVisit = 1,
  StatTypeSearch = 2,
  StatTypeBotUnknown = 3,
  StatTypeBotAccept = 4,
  StatTypeDiscussionQA = 5,
  StatTypeDiscussionBlog = 6,
  StatTypeDiscussionIssue = 7,
  StatTypeBotUnknownComment = 8,
}

export enum ModelRankType {
  RankTypeContribute = 1,
  RankTypeAIInsight = 2,
  RankTypeAllContribute = 3,
}

export enum ModelOrgType {
  OrgTypeNormal = 0,
  OrgTypeDefault = 1,
  OrgTypeAdmin = 2,
}

export enum ModelMsgNotifyType {
  MsgNotifyTypeUnknown = 0,
  MsgNotifyTypeReplyDiscuss = 1,
  MsgNotifyTypeReplyComment = 2,
  MsgNotifyTypeApplyComment = 3,
  MsgNotifyTypeLikeComment = 4,
  MsgNotifyTypeDislikeComment = 5,
  MsgNotifyTypeBotUnknown = 6,
  MsgNotifyTypeLikeDiscussion = 7,
  MsgNotifyTypeUserReview = 8,
  MsgNotifyTypeResolveByAdmin = 9,
  MsgNotifyTypeCloseDiscussion = 10,
  MsgNotifyTypeAssociateIssue = 11,
  MsgNotifyTypeIssueInProgress = 12,
  MsgNotifyTypeIssueResolved = 13,
  MsgNotifyTypeUserPoint = 14,
  MsgNotifyTypeFollowDiscuss = 15,
}

export enum ModelMessageNotifySubType {
  MessageNotifySubTypeUnknown = 0,
  MessageNotifySubTypeDingtalk = 1,
}

export enum ModelLLMType {
  LLMTypeChat = "chat",
  LLMTypeEmbedding = "embedding",
  LLMTypeRerank = "rerank",
  LLMTypeAnalysis = "analysis",
  LLMTypeAnalysisVL = "analysis-vl",
}

export enum ModelFileType {
  FileTypeUnknown = 0,
  FileTypeMarkdown = 1,
  FileTypeHTML = 2,
  FileTypeJSON = 3,
  FileTypeURL = 4,
  FileTypeDOCX = 5,
  FileTypeDOC = 6,
  FileTypePPTX = 7,
  FileTypeXLSX = 8,
  FileTypeXLS = 9,
  FileTypePDF = 10,
  FileTypeImage = 11,
  FileTypeCSV = 12,
  FileTypeXML = 13,
  FileTypeZIP = 14,
  FileTypeEPub = 15,
  /** 文件夹 */
  FileTypeFolder = 16,
  /** 未知文件类型 */
  FileTypeFile = 17,
  FileTypeMax = 18,
}

export enum ModelDocType {
  DocTypeUnknown = 0,
  DocTypeQuestion = 1,
  DocTypeDocument = 2,
  DocTypeSpace = 3,
  DocTypeWeb = 4,
}

export enum ModelDocStatus {
  DocStatusUnknown = 0,
  DocStatusApplySuccess = 1,
  DocStatusPendingReview = 2,
  DocStatusPendingApply = 3,
  DocStatusApplyFailed = 4,
  DocStatusAppling = 5,
  DocStatusPendingExport = 6,
  DocStatusExportSuccess = 7,
  DocStatusExportFailed = 8,
  DocStatusPendingExec = 9,
}

export enum ModelDiscussionType {
  DiscussionTypeQA = "qa",
  DiscussionTypeFeedback = "feedback",
  DiscussionTypeBlog = "blog",
  DiscussionTypeIssue = "issue",
}

export enum ModelDiscussionState {
  DiscussionStateUnknown = 0,
  DiscussionStateNone = 1,
  DiscussionStateResolved = 2,
  DiscussionStateClosed = 3,
  DiscussionStateInProgress = 4,
}

export enum ModelCommentLikeState {
  CommentLikeStateLike = 1,
  CommentLikeStateDislike = 2,
}

export enum ModelAskSessionSource {
  AskSessionSourceWeb = 0,
  AskSessionSourcePlugin = 1,
}

export interface AdminDocUserRes {
  client_id?: string;
  client_secret?: string;
  id?: number;
  name?: string;
  user_info?: AnydocUserInfoRes;
}

export interface AnydocListDoc {
  error?: string;
  file?: boolean;
  file_type?: string;
  id?: string;
  summary?: string;
  title?: string;
  updated_at?: number;
}

export interface AnydocUserInfoRes {
  access_token?: string;
  email?: string;
  id?: string;
  name?: string;
  refresh_token?: string;
}

export interface ContextResponse {
  data?: unknown;
  err?: string;
  msg?: string;
  success?: boolean;
  trace_id?: string;
}

export interface ModelAskSession {
  bot?: boolean;
  canceled?: boolean;
  content?: string;
  created_at?: number;
  id?: number;
  source?: ModelAskSessionSource;
  summary?: boolean;
  summary_discs?: ModelJSONBArrayModelAskSessionSummaryDisc;
  updated_at?: number;
  user_id?: number;
  uuid?: string;
}

export interface ModelAskSessionSummaryDisc {
  forum_id?: number;
  title?: string;
  uuid?: string;
}

export interface ModelAuth {
  auth_infos?: ModelAuthInfo[];
  /** Deprecated: move to AuthInfo, only use in migration */
  enable_register?: boolean;
  need_review?: boolean;
  prompt?: string;
  public_access?: boolean;
  /** Deprecated: only use in migration */
  public_forum_ids?: number[];
}

export interface ModelAuthConfig {
  oauth?: ModelAuthConfigOauth;
}

export interface ModelAuthConfigOauth {
  client_id?: string;
  client_secret?: string;
  corp_id?: string;
  url?: string;
}

export interface ModelAuthInfo {
  button_desc?: string;
  config?: ModelAuthConfig;
  enable_register?: boolean;
  /**
   * @min 1
   * @max 4
   */
  type?: number;
}

export interface ModelCreateSpaceFolderInfo {
  children?: ModelCreateSpaceFolderInfo[];
  doc_id?: string;
  file?: boolean;
  file_type?: string;
  title?: string;
}

export interface ModelDiscussion {
  associate_id?: number;
  bot_unknown?: boolean;
  comment?: number;
  content?: string;
  created_at?: number;
  dislike?: number;
  forum_id?: number;
  group_ids?: number[];
  hot?: number;
  id?: number;
  /** 发帖人上次访问时间 */
  last_visited?: number;
  like?: number;
  members?: number[];
  rag_id?: string;
  resolved?: ModelDiscussionState;
  resolved_at?: number;
  summary?: string;
  tag_ids?: number[];
  /** Deprecated */
  tags?: string[];
  title?: string;
  type?: ModelDiscussionType;
  updated_at?: number;
  user_id?: number;
  uuid?: string;
  view?: number;
  /** 发帖人访问次数 */
  visit?: number;
}

export interface ModelDiscussionComment {
  accepted?: boolean;
  bot?: boolean;
  content?: string;
  created_at?: number;
  dislike?: number;
  id?: number;
  like?: number;
  replies?: ModelDiscussionReply[];
  updated_at?: number;
  user_avatar?: string;
  user_id?: number;
  user_like_state?: ModelCommentLikeState;
  user_name?: string;
  user_role?: ModelUserRole;
}

export interface ModelDiscussionDetail {
  alert?: boolean;
  associate?: ModelDiscussionListItem;
  associate_id?: number;
  bot_unknown?: boolean;
  comment?: number;
  comments?: ModelDiscussionComment[];
  content?: string;
  created_at?: number;
  current_user_id?: number;
  dislike?: number;
  forum_id?: number;
  group_ids?: number[];
  groups?: ModelDiscussionGroup[];
  hot?: number;
  id?: number;
  /** 发帖人上次访问时间 */
  last_visited?: number;
  like?: number;
  members?: number[];
  rag_id?: string;
  resolved?: ModelDiscussionState;
  resolved_at?: number;
  summary?: string;
  tag_ids?: number[];
  /** Deprecated */
  tags?: string[];
  title?: string;
  type?: ModelDiscussionType;
  updated_at?: number;
  user_avatar?: string;
  user_id?: number;
  user_like?: boolean;
  user_name?: string;
  user_role?: ModelUserRole;
  uuid?: string;
  view?: number;
  /** 发帖人访问次数 */
  visit?: number;
}

export interface ModelDiscussionGroup {
  group_id?: number;
  id?: number;
  name?: string;
}

export interface ModelDiscussionListItem {
  associate_id?: number;
  bot_unknown?: boolean;
  comment?: number;
  content?: string;
  created_at?: number;
  dislike?: number;
  forum_id?: number;
  group_ids?: number[];
  hot?: number;
  id?: number;
  /** 发帖人上次访问时间 */
  last_visited?: number;
  like?: number;
  members?: number[];
  rag_id?: string;
  resolved?: ModelDiscussionState;
  resolved_at?: number;
  similarity?: number;
  summary?: string;
  tag_ids?: number[];
  /** Deprecated */
  tags?: string[];
  title?: string;
  type?: ModelDiscussionType;
  updated_at?: number;
  user_avatar?: string;
  user_id?: number;
  user_name?: string;
  uuid?: string;
  view?: number;
  /** 发帖人访问次数 */
  visit?: number;
}

export interface ModelDiscussionReply {
  accepted?: boolean;
  bot?: boolean;
  content?: string;
  created_at?: number;
  dislike?: number;
  id?: number;
  like?: number;
  updated_at?: number;
  user_avatar?: string;
  user_id?: number;
  user_like_state?: ModelCommentLikeState;
  user_name?: string;
  user_role?: ModelUserRole;
}

export interface ModelDiscussionTag {
  count?: number;
  created_at?: number;
  forum_id?: number;
  id?: number;
  name?: string;
  updated_at?: number;
}

export interface ModelExportFolder {
  doc_ids?: string[];
  folder_id?: string;
}

export interface ModelExportOpt {
  file_type?: string;
  /** 需要导出的文档 */
  folders?: ModelExportFolder[];
  space_id?: string;
}

export interface ModelForumGroups {
  group_ids?: number[];
  type?: ModelDiscussionType;
}

export interface ModelForumInfo {
  blog_ids?: number[];
  groups?: ModelJSONBArrayModelForumGroups;
  id?: number;
  index?: number;
  links?: ModelJSONBModelForumLinks;
  name: string;
  route_name?: string;
  tag_enabled?: boolean;
  tag_ids?: number[];
}

export interface ModelForumLink {
  address?: string;
  name?: string;
}

export interface ModelForumLinks {
  enabled?: boolean;
  links?: ModelForumLink[];
}

export interface ModelGroupItemInfo {
  id?: number;
  index?: number;
  name?: string;
}

export interface ModelGroupWithItem {
  id?: number;
  index?: number;
  name?: string;
}

export type ModelJSONBArrayModelAskSessionSummaryDisc = Record<string, any>;

export type ModelJSONBArrayModelForumGroups = Record<string, any>;

export type ModelJSONBArrayModelRankTimeGroupItem = Record<string, any>;

export type ModelJSONBArrayModelStatTrendItem = Record<string, any>;

export type ModelJSONBModelExportOpt = Record<string, any>;

export type ModelJSONBModelForumLinks = Record<string, any>;

export type ModelJSONBModelPlatformOpt = Record<string, any>;

export interface ModelKBDocumentDetail {
  created_at?: number;
  desc?: string;
  disc_forum_id?: number;
  disc_uuid?: string;
  doc_id?: string;
  doc_type?: ModelDocType;
  export_at?: number;
  export_opt?: ModelJSONBModelExportOpt;
  export_task_id?: string;
  file_type?: ModelFileType;
  group_ids?: number[];
  id?: number;
  json?: string;
  kb_id?: number;
  markdown?: string;
  message?: string;
  parent_id?: number;
  platform?: PlatformPlatformType;
  platform_opt?: ModelJSONBModelPlatformOpt;
  rag_id?: string;
  root_parent_id?: number;
  similar_id?: number;
  status?: ModelDocStatus;
  title?: string;
  updated_at?: number;
}

export interface ModelLLM {
  api_header?: string;
  api_key?: string;
  api_version?: string;
  base_url?: string;
  completion_tokens?: number;
  created_at?: number;
  id?: number;
  is_active?: boolean;
  model?: string;
  parameters?: ModelLLMModelParam;
  prompt_tokens?: number;
  provider?: string;
  rag_id?: string;
  show_name?: string;
  total_tokens?: number;
  type?: ModelLLMType;
  updated_at?: number;
}

export interface ModelLLMModelParam {
  context_window?: number;
  max_tokens?: number;
  r1_enabled?: boolean;
  support_computer_use?: boolean;
  support_images?: boolean;
  support_prompt_cache?: boolean;
}

export interface ModelListRes {
  total?: number;
}

export interface ModelMessageNotify {
  created_at?: number;
  discuss_id?: number;
  discuss_title?: string;
  discuss_uuid?: string;
  discussion_type?: ModelDiscussionType;
  forum_id?: number;
  from_bot?: boolean;
  from_id?: number;
  from_name?: string;
  id?: number;
  parent_comment?: string;
  read?: boolean;
  review_id?: number;
  review_status?: number;
  review_type?: number;
  to_bot?: boolean;
  to_id?: number;
  to_name?: string;
  type?: ModelMsgNotifyType;
  updated_at?: number;
  /** 通知到谁，除了发给机器人的信息，user_id 与 to_id 相同 */
  user_id?: number;
  user_point?: number;
}

export interface ModelMessageNotifySub {
  created_at?: number;
  enabled?: boolean;
  id?: number;
  type?: ModelMessageNotifySubType;
  updated_at?: number;
}

export interface ModelMessageNotifySubInfo {
  client_id?: string;
  client_secret?: string;
}

export interface ModelPlatformOpt {
  access_token?: string;
  app_id?: string;
  phone?: string;
  refresh_token?: string;
  secret?: string;
  url?: string;
  user_third_id?: string;
  username?: string;
}

export interface ModelPublicAddress {
  address: string;
}

export interface ModelRankTimeGroup {
  items?: ModelJSONBArrayModelRankTimeGroupItem;
  time?: number;
}

export interface ModelRankTimeGroupItem {
  associate_id?: number;
  extra?: string;
  foreign_id?: number;
  id?: number;
  score_id?: string;
}

export interface ModelStatTrend {
  items?: ModelJSONBArrayModelStatTrendItem;
  ts?: number;
}

export interface ModelStatTrendItem {
  count?: number;
  type?: ModelStatType;
}

export interface ModelSystemBrand {
  logo?: string;
  text?: string;
  theme?: string;
}

export interface ModelSystemChat {
  client_id?: string;
  client_secret?: string;
  enabled?: boolean;
  template_id?: string;
}

export interface ModelSystemDiscussion {
  auto_close?: number;
  content_placeholder?: string;
}

export interface ModelSystemSEO {
  desc?: string;
  keywords?: string[];
}

export interface ModelSystemWebPlugin {
  display?: boolean;
  enabled?: boolean;
  plugin?: boolean;
}

export interface ModelTrend {
  created_at?: number;
  discuss_id?: number;
  discuss_title?: string;
  discuss_uuid?: string;
  discussion_type?: ModelDiscussionType;
  forum_id?: number;
  id?: number;
  trend_type?: ModelTrendType;
  updated_at?: number;
  /** 谁的行为 */
  user_id?: number;
}

export interface ModelUser {
  avatar?: string;
  builtin?: boolean;
  created_at?: number;
  email?: string;
  id?: number;
  intro?: string;
  invisible?: boolean;
  key?: string;
  last_login?: number;
  name?: string;
  org_ids?: number[];
  password?: string;
  point?: number;
  role?: ModelUserRole;
  updated_at?: number;
  web_notify?: boolean;
}

export interface ModelUserInfo {
  auth_type?: number;
  avatar?: string;
  builtin?: boolean;
  cors?: boolean;
  email?: string;
  intro?: string;
  key?: string;
  no_password?: boolean;
  org_ids?: number[];
  point?: number;
  role?: ModelUserRole;
  uid?: number;
  username?: string;
  web_notify?: boolean;
}

export interface ModelUserNotiySub {
  created_at?: number;
  id?: number;
  third_id?: string;
  type?: ModelMessageNotifySubType;
  updated_at?: number;
  user_id?: number;
}

export interface ModelUserPointRecord {
  created_at?: number;
  foreign?: number;
  from_id?: number;
  id?: number;
  point?: number;
  revoke_id?: number;
  type?: ModelUserPointType;
  updated_at?: number;
  user_id?: number;
}

export interface ModelUserQuickReply {
  content?: string;
  created_at?: number;
  id?: number;
  index?: number;
  name?: string;
  updated_at?: number;
  user_id?: number;
}

export interface ModelUserReviewWithUser {
  auth_type?: number;
  created_at?: number;
  id?: number;
  reason?: string;
  state?: number;
  type?: number;
  updated_at?: number;
  user_avatar?: string;
  user_email?: string;
  user_id?: number;
  user_name?: string;
}

export interface ModelUserSearchHistory {
  created_at?: number;
  id?: number;
  keyword?: string;
  updated_at?: number;
  user_id?: number;
  user_role?: ModelUserRole;
  username?: string;
}

export interface ModelWebhook {
  created_at?: number;
  id?: number;
  msg_types?: number[];
  name?: string;
  sign?: string;
  /**
   * @min 1
   * @max 2
   */
  type: ModelWebhookType;
  updated_at?: number;
  url: string;
}

export interface ModelWebhookConfig {
  msg_types?: number[];
  sign?: string;
  /**
   * @min 1
   * @max 2
   */
  type: ModelWebhookType;
  url: string;
}

export interface RouterSystemInfoRes {
  latest_version?: string;
  version?: string;
}

export interface SvcAIInsightDiscussionItem {
  created_at?: number;
  deleted?: boolean;
  discussion_id?: string;
  id?: number;
  rank_id?: number;
  title?: string;
  updated_at?: number;
}

export interface SvcActiveModelReq {
  active?: boolean;
}

export interface SvcAnydocListRes {
  docs?: AnydocListDoc[];
  uuid?: string;
}

export interface SvcAssociateDiscussionReq {
  content?: string;
  group_ids?: number[];
  issue_uuid?: string;
  title?: string;
}

export interface SvcAuthFrontendGetAuth {
  button_desc?: string;
  enable_register?: boolean;
  type?: number;
}

export interface SvcAuthFrontendGetRes {
  auth_types?: SvcAuthFrontendGetAuth[];
  prompt?: string;
  public_access?: boolean;
}

export interface SvcBotGetRes {
  avatar?: string;
  name?: string;
  unknown_prompt?: string;
  user_id?: number;
}

export interface SvcCheckModelRes {
  content?: string;
  error?: string;
}

export interface SvcCommentCreateReq {
  comment_id?: number;
  content: string;
}

export interface SvcCommentUpdateReq {
  content: string;
}

export interface SvcCreateSpaceFolderReq {
  docs: SvcCreateSpaceForlderItem[];
}

export interface SvcCreateSpaceForlderItem {
  doc_id: string;
  folders?: ModelCreateSpaceFolderInfo;
  title?: string;
}

export interface SvcCreateSpaceReq {
  opt?: ModelPlatformOpt;
  platform?: PlatformPlatformType;
  title: string;
}

export interface SvcDiscussUploadFileReq {
  uuid?: string;
}

export interface SvcDiscussionAskReq {
  group_ids?: number[];
  question: string;
  session_id: string;
  source?: 0 | 1;
}

export interface SvcDiscussionCompeletReq {
  prefix?: string;
  suffix?: string;
}

export interface SvcDiscussionContentSummaryReq {
  content: string;
  title: string;
}

export interface SvcDiscussionCreateReq {
  content?: string;
  forum_id?: number;
  group_ids?: number[];
  summary?: string;
  title: string;
  type?: ModelDiscussionType;
}

export interface SvcDiscussionListFollowRes {
  followed?: boolean;
  follower?: number;
}

export interface SvcDiscussionUpdateReq {
  content?: string;
  group_ids?: number[];
  summary?: string;
  title?: string;
}

export interface SvcDocCreateQAReq {
  ai_insight_id?: number;
  desc?: string;
  markdown: string;
  title: string;
}

export interface SvcDocListItem {
  created_at?: number;
  desc?: string;
  doc_id?: string;
  file_type?: ModelFileType;
  group_ids?: number[];
  id?: number;
  parent_id?: number;
  platform?: PlatformPlatformType;
  similar_id?: number;
  status?: ModelDocStatus;
  title?: string;
  updated_at?: number;
}

export interface SvcDocUpdateReq {
  desc?: string;
  markdown?: string;
  title: string;
}

export interface SvcFeishuAuthURLReq {
  client_id: string;
  client_secret: string;
  id?: number;
  kb_id: number;
  name: string;
}

export interface SvcFileExportReq {
  desc?: string;
  doc_id: string;
  kb_id: number;
  title: string;
  uuid: string;
}

export interface SvcForumBlog {
  id?: number;
  title?: string;
}

export interface SvcForumRes {
  blog_ids?: number[];
  blogs?: SvcForumBlog[];
  groups?: ModelJSONBArrayModelForumGroups;
  id?: number;
  index?: number;
  links?: ModelJSONBModelForumLinks;
  name: string;
  route_name?: string;
  tag_enabled?: boolean;
  tag_ids?: number[];
  tags?: SvcForumTag[];
}

export interface SvcForumTag {
  count?: number;
  id?: number;
  name?: string;
}

export interface SvcForumUpdateReq {
  forums?: ModelForumInfo[];
}

export interface SvcGetSpaceRes {
  created_at?: number;
  id?: number;
  platform?: PlatformPlatformType;
  title?: string;
  updated_at?: number;
}

export interface SvcGroupUpdateReq {
  groups?: ModelGroupWithItem[];
}

export interface SvcKBCreateReq {
  desc?: string;
  name: string;
}

export interface SvcKBListItem {
  created_at?: number;
  desc?: string;
  doc_count?: number;
  id?: number;
  name?: string;
  qa_count?: number;
  space_count?: number;
  updated_at?: number;
  web_count?: number;
}

export interface SvcKBUpdateReq {
  desc?: string;
  name: string;
}

export interface SvcListAnydocNode {
  children?: SvcListAnydocNode[];
  value?: AnydocListDoc;
}

export interface SvcListAsksRes {
  bot?: boolean;
  canceled?: boolean;
  content?: string;
  created_at?: number;
  id?: number;
  source?: ModelAskSessionSource;
  summary?: boolean;
  summary_discs?: ModelJSONBArrayModelAskSessionSummaryDisc;
  updated_at?: number;
  user_id?: number;
  username?: string;
  uuid?: string;
}

export interface SvcListRemoteReq {
  opt?: ModelPlatformOpt;
  platform?: PlatformPlatformType;
  remote_folder_id?: string;
  remote_sub_folder_id?: string;
  shallow?: boolean;
}

export interface SvcListSpaceFolderItem {
  created_at?: number;
  doc_id?: string;
  failed?: number;
  id?: number;
  rag_id?: string;
  status?: ModelDocStatus;
  success?: number;
  title?: string;
  total?: number;
  updated_at?: number;
}

export interface SvcListSpaceItem {
  created_at?: number;
  id?: number;
  platform?: PlatformPlatformType;
  title?: string;
  total?: number;
  updated_at?: number;
}

export interface SvcListWebItem {
  created_at?: number;
  desc?: string;
  file_type?: ModelFileType;
  group_ids?: number[];
  id?: number;
  status?: ModelDocStatus;
  title?: string;
  updated_at?: number;
}

export interface SvcMKCreateReq {
  api_header?: string;
  api_key?: string;
  /** for azure openai */
  api_version?: string;
  base_url: string;
  model: string;
  param?: ModelLLMModelParam;
  provider: string;
  show_name?: string;
  type: "chat" | "embedding" | "rerank" | "analysis" | "analysis-vl";
}

export interface SvcMKModelItem {
  model?: string;
}

export interface SvcMKSupportedReq {
  api_header?: string;
  api_key?: string;
  base_url: string;
  provider: string;
  type: "chat" | "embedding" | "rerank" | "analysis" | "analysis-vl";
}

export interface SvcMKSupportedRes {
  error?: string;
  models?: SvcMKModelItem[];
}

export interface SvcMKUpdateReq {
  api_header?: string;
  api_key?: string;
  /** for azure openai */
  api_version?: string;
  base_url: string;
  model: string;
  param?: ModelLLMModelParam;
  provider: string;
  show_name?: string;
  type: "chat" | "embedding" | "rerank" | "analysis" | "analysis-vl";
}

export interface SvcMessageNotifySubCreateReq {
  enabled?: boolean;
  info?: ModelMessageNotifySubInfo;
  type: ModelMessageNotifySubType;
}

export interface SvcModelKitCheckReq {
  api_header?: string;
  api_key?: string;
  /** for azure openai */
  api_version?: string;
  base_url: string;
  model: string;
  provider: string;
  show_name?: string;
  type: "chat" | "embedding" | "rerank" | "analysis" | "analysis-vl";
}

export interface SvcNotifyReadReq {
  id?: number;
}

export interface SvcOrgListItem {
  builtin?: boolean;
  count?: number;
  created_at?: number;
  forum_ids?: number[];
  forum_names?: string[];
  id?: number;
  name?: string;
  type?: ModelOrgType;
  updated_at?: number;
}

export interface SvcOrgUpsertReq {
  forum_ids?: number[];
  name: string;
}

export interface SvcPolishReq {
  text?: string;
}

export interface SvcQuickReplyReindexReq {
  ids: number[];
}

export interface SvcRankContributeItem {
  avatar?: string;
  id?: number;
  name?: string;
  score?: number;
}

export interface SvcResolveFeedbackReq {
  /** @max 3 */
  resolve?: ModelDiscussionState;
}

export interface SvcResolveIssueReq {
  resolve?: 2 | 4;
}

export interface SvcReviewReq {
  add_new: boolean;
  content: string;
  title: string;
}

export interface SvcSitemapExportReq {
  desc?: string;
  doc_id: string;
  kb_id: number;
  title: string;
  uuid: string;
}

export interface SvcSitemapListReq {
  url: string;
}

export interface SvcStatDiscussionItem {
  count?: number;
  key?: ModelDiscussionType;
}

export interface SvcStatDiscussionRes {
  accept?: number;
  bot_accept?: number;
  bot_unknown?: number;
  human_resp_time?: number;
}

export interface SvcStatVisitRes {
  pv?: number;
  uv?: number;
}

export interface SvcStopAskSessionReq {
  session_id: string;
}

export interface SvcSummaryByContentReq {
  forum_id: number;
  group_ids?: number[];
  session_id: string;
  source?: 0 | 1;
}

export interface SvcURLExportReq {
  desc?: string;
  doc_id: string;
  kb_id: number;
  title: string;
  uuid: string;
}

export interface SvcURLListReq {
  url: string;
}

export interface SvcUnbindNotifySubReq {
  type: ModelMessageNotifySubType;
}

export interface SvcUpdateGroupIDsReq {
  group_ids?: number[];
  ids: number[];
  type: ModelDocType;
}

export interface SvcUpdatePromptReq {
  prompt?: string;
}

export interface SvcUpdateSpaceFolderReq {
  update_type?: TopicKBSpaceUpdateType;
}

export interface SvcUpdateSpaceReq {
  opt?: ModelPlatformOpt;
  title?: string;
}

export interface SvcUpdateWebNotifyReq {
  enable?: boolean;
}

export interface SvcUserJoinOrgReq {
  /** @minItems 1 */
  org_ids?: number[];
  /** @minItems 1 */
  user_ids?: number[];
}

export interface SvcUserListItem {
  avatar?: string;
  builtin?: boolean;
  created_at?: number;
  email?: string;
  id?: number;
  last_login?: number;
  name?: string;
  org_ids?: number[];
  org_names?: string[];
  role?: ModelUserRole;
  updated_at?: number;
}

export interface SvcUserLoginReq {
  email: string;
  password: string;
}

export interface SvcUserQuickReplyReq {
  content: string;
  /** @maxLength 10 */
  name: string;
}

export interface SvcUserRegisterReq {
  email: string;
  name: string;
  password: string;
}

export interface SvcUserReviewGuestCreateReq {
  reason: string;
}

export interface SvcUserReviewUpdateReq {
  /**
   * @min 1
   * @max 2
   */
  state: number;
}

export interface SvcUserStatisticsRes {
  answer_count?: number;
  avatar?: string;
  blog_count?: number;
  intro?: string;
  name?: string;
  point?: number;
  qa_count?: number;
  role?: ModelUserRole;
}

export interface SvcUserUpdateReq {
  email?: string;
  name?: string;
  org_ids?: number[];
  password?: string;
  /**
   * @min 1
   * @max 4
   */
  role?: ModelUserRole;
}

export interface SvcWebhookCreateReq {
  msg_types?: number[];
  name: string;
  sign?: string;
  /**
   * @min 1
   * @max 2
   */
  type: ModelWebhookType;
  url: string;
}

export interface SvcWebhookUpdateReq {
  msg_types?: number[];
  name: string;
  sign?: string;
  /**
   * @min 1
   * @max 2
   */
  type: ModelWebhookType;
  url: string;
}

export interface PutAdminBotPayload {
  /**
   * upload avatar
   * @format binary
   */
  avatar?: File;
  name: string;
  unknown_prompt?: string;
}

export interface GetAdminDiscussionParams {
  forum_id: number;
  keyword?: string;
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
}

export interface GetAdminDiscussionAskParams {
  content?: string;
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
  username?: string;
}

export interface GetAdminDiscussionAskSessionParams {
  /** @min 1 */
  page?: number;
  session_id: string;
  /** @min 1 */
  size?: number;
  user_id?: number;
}

/** request params */
export type PutAdminForumPayload = SvcForumUpdateReq & {
  forums?: (ModelForumInfo & {
    groups?: ModelForumGroups[];
    links?: ModelForumLinks;
  })[];
};

export interface GetAdminForumForumIdTagsParams {
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
  /** forum id */
  forumId?: number;
}

export interface PostAdminKbDocumentFileListPayload {
  /**
   * upload file
   * @format binary
   */
  file: File;
}

export interface PutAdminKbKbIdParams {
  /** kb id */
  kbId: number;
}

export interface DeleteAdminKbKbIdParams {
  /** kb id */
  kbId: number;
}

export interface GetAdminKbKbIdDocumentParams {
  file_type?:
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18;
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
  status?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  title?: string;
  /** kb_id */
  kbId: number;
}

export interface PutAdminKbKbIdDocumentGroupIdsParams {
  /** kb_id */
  kbId: number;
}

export interface GetAdminKbKbIdDocumentDocIdParams {
  /** kb_id */
  kbId: number;
  /** doc_id */
  docId: number;
}

export interface DeleteAdminKbKbIdDocumentDocIdParams {
  /** kb_id */
  kbId: number;
  /** doc_id */
  docId: number;
}

export interface GetAdminKbKbIdQuestionParams {
  file_type?:
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18;
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
  status?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  title?: string;
  /** kb_id */
  kbId: number;
}

export interface PostAdminKbKbIdQuestionParams {
  /** kb_id */
  kbId: number;
}

export interface PostAdminKbKbIdQuestionFilePayload {
  /** upload file */
  file: File;
}

export interface PostAdminKbKbIdQuestionFileParams {
  /** kb_id */
  kbId: number;
}

export interface GetAdminKbKbIdQuestionQaIdParams {
  /** kb_id */
  kbId: number;
  /** qa_id */
  qaId: number;
}

export interface PutAdminKbKbIdQuestionQaIdParams {
  /** kb_id */
  kbId: number;
  /** qa_id */
  qaId: number;
}

export interface DeleteAdminKbKbIdQuestionQaIdParams {
  /** kb_id */
  kbId: number;
  /** qa_id */
  qaId: number;
}

export interface PostAdminKbKbIdQuestionQaIdReviewParams {
  /** kb_id */
  kbId: number;
  /** qa_id */
  qaId: number;
}

export interface GetAdminKbKbIdSpaceParams {
  /** kb_id */
  kbId: number;
}

export interface PostAdminKbKbIdSpaceParams {
  /** kb_id */
  kbId: number;
}

export interface GetAdminKbKbIdSpaceSpaceIdParams {
  /** kb_id */
  kbId: number;
  /** space_id */
  spaceId: number;
}

export interface PutAdminKbKbIdSpaceSpaceIdParams {
  /** kb_id */
  kbId: number;
  /** space_id */
  spaceId: number;
}

export interface DeleteAdminKbKbIdSpaceSpaceIdParams {
  /** kb_id */
  kbId: number;
  /** space_id */
  spaceId: number;
}

export interface GetAdminKbKbIdSpaceSpaceIdFolderParams {
  /** kb_id */
  kbId: number;
  /** space_id */
  spaceId: number;
}

export interface PostAdminKbKbIdSpaceSpaceIdFolderParams {
  /** kb_id */
  kbId: number;
  /** space_id */
  spaceId: number;
}

export interface PutAdminKbKbIdSpaceSpaceIdFolderFolderIdParams {
  /** kb_id */
  kbId: number;
  /** space_id */
  spaceId: number;
  /** folder_id */
  folderId: number;
}

export interface DeleteAdminKbKbIdSpaceSpaceIdFolderFolderIdParams {
  /** kb_id */
  kbId: number;
  /** space_id */
  spaceId: number;
  /** folder_id */
  folderId: number;
}

export interface GetAdminKbKbIdSpaceSpaceIdFolderFolderIdDocParams {
  /** @min 1 */
  page?: number;
  parent_id: number;
  /** @min 1 */
  size?: number;
  status?: (0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)[];
  title?: string;
  /** kb_id */
  kbId: number;
  /** space_id */
  spaceId: number;
  folderId: string;
}

export interface PutAdminKbKbIdSpaceSpaceIdRefreshParams {
  /** kb_id */
  kbId: number;
  /** space_id */
  spaceId: number;
}

export interface GetAdminKbKbIdSpaceSpaceIdRemoteParams {
  remote_folder_id?: string;
  remote_sub_folder_id?: string;
  shallow?: boolean;
  /** kb_id */
  kbId: number;
  /** space_id */
  spaceId: number;
}

export interface GetAdminKbKbIdWebParams {
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
  title?: string;
  kbId: string;
}

export interface PutAdminKbKbIdWebDocIdParams {
  /** kb_id */
  kbId: number;
  /** doc_id */
  docId: number;
}

export interface DeleteAdminKbKbIdWebDocIdParams {
  /** kb_id */
  kbId: number;
  /** doc_id */
  docId: number;
}

export interface PutAdminModelIdParams {
  /** model_id */
  id: number;
}

export interface PutAdminModelIdActiveParams {
  /** model_id */
  id: number;
}

export interface GetAdminOrgParams {
  name?: string;
}

export interface PutAdminOrgOrgIdParams {
  /** org id */
  orgId: number;
}

export interface DeleteAdminOrgOrgIdParams {
  /** org id */
  orgId: number;
}

export interface GetAdminRankAiInsightAiInsightIdDiscussionParams {
  /** ai_insight_id */
  aiInsightId: number;
}

export interface GetAdminStatDiscussionParams {
  begin: number;
}

export interface GetAdminStatSearchParams {
  begin: number;
}

export interface GetAdminStatTrendParams {
  begin: number;
  stat_group: number;
  stat_types: (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)[];
}

export interface GetAdminStatVisitParams {
  begin: number;
}

export interface GetAdminSystemWebhookWebhookIdParams {
  /** wenhook id */
  webhookId: number;
}

export interface PutAdminSystemWebhookWebhookIdParams {
  /** wenhook id */
  webhookId: number;
}

export interface DeleteAdminSystemWebhookWebhookIdParams {
  /** wenhook id */
  webhookId: number;
}

export interface GetAdminUserParams {
  email?: string;
  name?: string;
  org_id?: number;
  org_name?: string;
  /** @min 1 */
  page?: number;
  role?: 0 | 1 | 2 | 3 | 4 | 5;
  /** @min 1 */
  size?: number;
}

export interface GetAdminUserHistorySearchParams {
  keyword?: string;
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
  username?: string;
}

export interface GetAdminUserReviewParams {
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
  state?: number[];
}

export interface PutAdminUserReviewReviewIdParams {
  /** review id */
  reviewId: string;
}

export interface GetAdminUserUserIdParams {
  /** user id */
  userId: number;
}

export interface PutAdminUserUserIdParams {
  /** user id */
  userId: number;
}

export interface DeleteAdminUserUserIdParams {
  /** user id */
  userId: number;
}

export interface GetDiscussionParams {
  discussion_ids?: number[];
  filter?: "hot" | "new" | "publish";
  forum_id: number;
  group_ids?: number[];
  keyword?: string;
  only_mine?: boolean;
  /** @min 1 */
  page?: number;
  resolved?: 0 | 1 | 2 | 3 | 4;
  /** @min 1 */
  size?: number;
  stat?: boolean;
  tag_ids?: number[];
  type?: "qa" | "feedback" | "blog" | "issue";
}

export interface GetDiscussionAskSessionParams {
  force_create?: boolean;
  session_id?: string;
}

export interface GetDiscussionAskAskSessionIdParams {
  /** ask_session_id */
  askSessionId: string;
}

export interface GetDiscussionFollowParams {
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
}

export interface PostDiscussionSummaryParams {
  keyword: string;
  uuids: string[];
}

/** request params */
export interface PostDiscussionUploadPayload {
  /**
   * upload file
   * @format binary
   */
  file: File;
}

export interface GetDiscussionDiscIdParams {
  no_view?: boolean;
  /** disc_id */
  discId: string;
}

export interface PutDiscussionDiscIdParams {
  /** disc_id */
  discId: string;
}

export interface DeleteDiscussionDiscIdParams {
  /** disc_id */
  discId: string;
}

export interface PostDiscussionDiscIdAiLearnParams {
  /** disc_id */
  discId: string;
}

export interface GetDiscussionDiscIdAssociateParams {
  /** disc_id */
  discId: string;
}

export interface PostDiscussionDiscIdAssociateParams {
  /** disc_id */
  discId: string;
}

export interface PutDiscussionDiscIdCloseParams {
  /** disc_id */
  discId: string;
}

export interface PostDiscussionDiscIdCommentParams {
  /** disc_id */
  discId: string;
}

export interface PutDiscussionDiscIdCommentCommentIdParams {
  /** disc_id */
  discId: string;
  /** comment_id */
  commentId: number;
}

export interface DeleteDiscussionDiscIdCommentCommentIdParams {
  /** disc_id */
  discId: string;
  /** comment_id */
  commentId: number;
}

export interface PostDiscussionDiscIdCommentCommentIdAcceptParams {
  /** disc_id */
  discId: string;
  /** comment_id */
  commentId: number;
}

export interface PostDiscussionDiscIdCommentCommentIdDislikeParams {
  /** disc_id */
  discId: string;
  /** comment_id */
  commentId: number;
}

export interface PostDiscussionDiscIdCommentCommentIdLikeParams {
  /** disc_id */
  discId: string;
  /** comment_id */
  commentId: number;
}

export interface PostDiscussionDiscIdCommentCommentIdRevokeLikeParams {
  /** disc_id */
  discId: string;
  /** comment_id */
  commentId: number;
}

export interface GetDiscussionDiscIdFollowParams {
  /** disc_id */
  discId: string;
}

export interface PostDiscussionDiscIdFollowParams {
  /** disc_id */
  discId: string;
}

export interface DeleteDiscussionDiscIdFollowParams {
  /** disc_id */
  discId: string;
}

export interface PostDiscussionDiscIdLikeParams {
  /** disc_id */
  discId: string;
}

export interface PostDiscussionDiscIdRequirementParams {
  /** disc_id */
  discId: string;
}

export interface PostDiscussionDiscIdResolveParams {
  /** disc_id */
  discId: string;
}

export interface PostDiscussionDiscIdResolveIssueParams {
  /** disc_id */
  discId: string;
}

export interface PostDiscussionDiscIdRevokeLikeParams {
  /** disc_id */
  discId: string;
}

export interface GetDiscussionDiscIdSimilarityParams {
  /** disc_id */
  discId: string;
}

export interface GetForumForumIdTagsParams {
  type?: "qa" | "feedback" | "blog" | "issue";
  /** forum id */
  forumId?: number;
}

export interface GetGroupParams {
  /** forum id */
  forum_id?: number;
}

export interface GetRankContributeParams {
  type: 1 | 2 | 3;
}

export interface PutUserPayload {
  /**
   * avatar
   * @format binary
   */
  avatar?: File;
  email?: string;
  intro?: string;
  name?: string;
  old_password?: string;
  password?: string;
}

export interface GetUserLoginThirdParams {
  app?: boolean;
  redirect?: string;
  type: number;
}

export interface GetUserNotifyListParams {
  /** @min 1 */
  page?: number;
  read?: boolean;
  /** @min 1 */
  size?: number;
}

export interface GetUserNotifySubAuthUrlParams {
  app?: boolean;
  type: 0 | 1;
}

export interface GetUserPointParams {
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
}

export interface PutUserQuickReplyQuickReplyIdParams {
  /** quick_reply_id */
  quickReplyId: number;
}

export interface DeleteUserQuickReplyQuickReplyIdParams {
  /** quick_reply_id */
  quickReplyId: number;
}

export interface GetUserTrendParams {
  discussion_type?: "qa" | "feedback" | "blog" | "issue";
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
  trend_type?: 1 | 2 | 3;
  user_id: number;
}

export interface GetUserUserIdParams {
  /** user id */
  userId: number;
}
