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

export enum TopicTaskStatus {
  TaskStatusPending = "pending",
  TaskStatusInProgress = "in_process",
  TaskStatusCompleted = "completed",
  TaskStatusFailed = "failed",
  TaskStatusTimeout = "timeout",
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
}

export enum ModelUserRole {
  UserRoleUnknown = 0,
  UserRoleAdmin = 1,
  UserRoleOperator = 2,
  UserRoleUser = 3,
  UserRoleMax = 4,
}

export enum ModelLLMType {
  LLMTypeChat = "chat",
  LLMTypeEmbedding = "embedding",
  LLMTypeRerank = "rerank",
}

export enum ModelFileType {
  FileTypeUnknown = 0,
  FileTypeMarkdown = 1,
  FileTypeHTML = 2,
  FileTypeJSON = 3,
  FileTypeURL = 4,
  FileTypeDOCX = 5,
  FileTypePPTX = 6,
  FileTypeXLSX = 7,
  FileTypeXLS = 8,
  FileTypePDF = 9,
  FileTypeImage = 10,
  FileTypeCSV = 11,
  FileTypeXML = 12,
  FileTypeZIP = 13,
  FileTypeEPub = 14,
  FileTypeMax = 15,
}

export enum ModelDocType {
  DocTypeUnknown = 0,
  DocTypeQuestion = 1,
  DocTypeDocument = 2,
}

export enum ModelDocStatus {
  DocStatusUnknown = 0,
  DocStatusAppling = 1,
}

export enum ModelDiscussionType {
  DiscussionTypeQA = "qa",
  DiscussionTypeFeedback = "feedback",
  DiscussionTypeBlog = "blog",
}

export interface AnydocListDoc {
  file_type?: string;
  id?: string;
  summary?: string;
  title?: string;
}

export interface AnydocListRes {
  docs?: AnydocListDoc[];
  uuid?: string;
}

export interface ContextResponse {
  data?: unknown;
  err?: string;
  msg?: string;
  success?: boolean;
  trace_id?: string;
}

export interface ModelAuth {
  auth_infos?: ModelAuthInfo[];
  enable_register?: boolean;
  public_access?: boolean;
}

export interface ModelAuthConfig {
  oauth?: ModelAuthConfigOauth;
}

export interface ModelAuthConfigOauth {
  client_id?: string;
  client_secret?: string;
  url?: string;
}

export interface ModelAuthInfo {
  config?: ModelAuthConfig;
  type?: number;
}

export interface ModelDiscussion {
  comment?: number;
  content?: string;
  created_at?: number;
  dislike?: number;
  group_ids?: number[];
  id?: number;
  like?: number;
  rag_id?: string;
  resolved?: boolean;
  resolved_at?: number;
  summary?: string;
  tags?: string[];
  title?: string;
  type?: ModelDiscussionType;
  updated_at?: number;
  user_id?: number;
  uuid?: string;
  view?: number;
}

export interface ModelDiscussionComment {
  accepted?: boolean;
  content?: string;
  id?: number;
  replies?: ModelDiscussionReply[];
  updated_at?: number;
  user_avatar?: string;
  user_id?: number;
  user_name?: string;
}

export interface ModelDiscussionDetail {
  comment?: number;
  comments?: ModelDiscussionComment[];
  content?: string;
  created_at?: number;
  dislike?: number;
  group_ids?: number[];
  groups?: ModelDiscussionGroup[];
  id?: number;
  like?: number;
  rag_id?: string;
  resolved?: boolean;
  resolved_at?: number;
  summary?: string;
  tags?: string[];
  title?: string;
  type?: ModelDiscussionType;
  updated_at?: number;
  user_avatar?: string;
  user_id?: number;
  user_name?: string;
  uuid?: string;
  view?: number;
}

export interface ModelDiscussionGroup {
  id?: number;
  name?: string;
}

export interface ModelDiscussionListItem {
  comment?: number;
  content?: string;
  created_at?: number;
  dislike?: number;
  group_ids?: number[];
  id?: number;
  like?: number;
  rag_id?: string;
  resolved?: boolean;
  resolved_at?: number;
  summary?: string;
  tags?: string[];
  title?: string;
  type?: ModelDiscussionType;
  updated_at?: number;
  user_avatar?: string;
  user_id?: number;
  user_name?: string;
  uuid?: string;
  view?: number;
}

export interface ModelDiscussionReply {
  accepted?: boolean;
  content?: string;
  id?: number;
  updated_at?: number;
  user_avatar?: string;
  user_id?: number;
  user_name?: string;
}

export interface ModelExportOpt {
  file_type?: string;
  space_id?: string;
}

export interface ModelGroupItem {
  created_at?: number;
  groupID?: number;
  id?: number;
  index?: number;
  name?: string;
  updated_at?: number;
}

export type ModelJSONBModelExportOpt = Record<string, any>;

export type ModelJSONBModelPlatformOpt = Record<string, any>;

export interface ModelKBDocument {
  created_at?: number;
  desc?: string;
  doc_id?: string;
  doc_type?: ModelDocType;
  export_opt?: ModelJSONBModelExportOpt;
  file_type?: ModelFileType;
  id?: number;
  json?: number[];
  kb_id?: number;
  markdown?: number[];
  platform?: PlatformPlatformType;
  platform_opt?: ModelJSONBModelPlatformOpt;
  rag_id?: string;
  status?: ModelDocStatus;
  summary?: string;
  title?: string;
  updated_at?: number;
}

export interface ModelKBDocumentDetail {
  created_at?: number;
  desc?: string;
  doc_id?: string;
  doc_type?: ModelDocType;
  export_opt?: ModelJSONBModelExportOpt;
  file_type?: ModelFileType;
  id?: number;
  json?: string;
  kb_id?: number;
  markdown?: string;
  platform?: PlatformPlatformType;
  platform_opt?: ModelJSONBModelPlatformOpt;
  rag_id?: string;
  status?: ModelDocStatus;
  summary?: string;
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

export interface ModelPublicAddress {
  address: string;
}

export interface ModelUserInfo {
  email?: string;
  role?: ModelUserRole;
  uid?: number;
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
   * @max 1
   */
  type: number;
  updated_at?: number;
  url: string;
}

export interface ModelWebhookConfig {
  msg_types?: number[];
  sign?: string;
  /**
   * @min 1
   * @max 1
   */
  type: number;
  url: string;
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

export interface SvcDiscussUploadFileReq {
  uuid?: string;
}

export interface SvcDiscussionCreateReq {
  content?: string;
  /** @minItems 1 */
  group_ids: number[];
  tags?: string[];
  title: string;
  type?: ModelDiscussionType;
  user_id?: number;
}

export interface SvcDiscussionSearchReq {
  keyword?: string;
}

export interface SvcDiscussionUpdateReq {
  content: string;
  group_ids: number[];
  tags: string[];
  title: string;
}

export interface SvcDocCreateQAReq {
  desc?: string;
  markdown: string;
  title: string;
}

export interface SvcDocListItem {
  created_at?: number;
  desc?: string;
  file_type?: ModelFileType;
  id?: number;
  platform?: PlatformPlatformType;
  status?: ModelDocStatus;
  title?: string;
  updated_at?: number;
}

export interface SvcDocUpdateReq {
  desc?: string;
  markdown?: number[];
  title: string;
}

export interface SvcFileExportReq {
  desc?: string;
  doc_id: string;
  kb_id: number;
  title: string;
  uuid: string;
}

export interface SvcGICreateReq {
  name: string;
}

export interface SvcGIUpdateIndexReq {
  index?: number;
}

export interface SvcGIUpdateReq {
  name: string;
}

export interface SvcGroupCreateReq {
  name: string;
}

export interface SvcGroupItemInfo {
  id?: number;
  name?: string;
}

export interface SvcGroupUpdateReq {
  name: string;
}

export interface SvcGroupWithItem {
  id?: number;
  name?: string;
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
  updated_at?: number;
}

export interface SvcKBUpdateReq {
  desc?: string;
  name: string;
}

export interface SvcLoginMethodGetRes {
  auth_types?: number[];
  enable_register?: boolean;
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
  type: "chat" | "embedding" | "rerank";
}

export interface SvcMKModelItem {
  model?: string;
}

export interface SvcMKSupportedReq {
  api_header?: string;
  api_key?: string;
  base_url: string;
  provider: string;
  type: "chat" | "embedding" | "rerank";
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
  type: "chat" | "embedding" | "rerank";
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
  type: "chat" | "embedding" | "rerank";
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

export interface SvcTaskReq {
  ids: string[];
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

export interface SvcUserCreateReq {
  email: string;
  name: string;
  password: string;
}

export interface SvcUserListItem {
  builtin?: boolean;
  created_at?: number;
  email?: string;
  id?: number;
  last_login?: number;
  name?: string;
  role?: ModelUserRole;
  updated_at?: number;
}

export interface SvcUserLoginReq {
  email: string;
  password: string;
}

export interface SvcUserRegisterReq {
  email: string;
  name: string;
  password: string;
}

export interface SvcUserUpdateReq {
  name?: string;
  /**
   * @min 1
   * @max 3
   */
  role?: ModelUserRole;
}

export interface SvcWebhookCreateReq {
  msg_types?: number[];
  name: string;
  sign?: string;
  /**
   * @min 1
   * @max 1
   */
  type: number;
  url: string;
}

export interface SvcWebhookUpdateReq {
  msg_types?: number[];
  name: string;
  sign?: string;
  /**
   * @min 1
   * @max 1
   */
  type: number;
  url: string;
}

export interface TopicTaskMeta {
  access_token?: string;
  app_id?: string;
  dbdocID?: number;
  desc?: string;
  doc_id?: string;
  doc_type?: ModelFileType;
  err?: string;
  exportOpt?: ModelExportOpt;
  kbid?: number;
  platform?: PlatformPlatformType;
  platform_id?: string;
  secret?: string;
  space_id?: string;
  status?: TopicTaskStatus;
  task_id?: string;
  title?: string;
  url?: string;
}

export interface PutAdminBotPayload {
  /**
   * upload avatar
   * @format binary
   */
  avatar?: File;
  name: string;
  unknown_prompt: string;
}

export interface PostAdminKbDocumentFileListPayload {
  /**
   * upload file
   * @format binary
   */
  file: File;
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
    | 15;
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
  title?: string;
  /** kb_id */
  kbId: number;
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
    | 15;
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
  title?: string;
  /** kb_id */
  kbId: number;
}

export interface PostAdminKbKbIdQuestionFilePayload {
  /** upload file */
  file: File;
}

export interface GetDiscussionParams {
  /** page */
  page?: number;
  /** size */
  size?: number;
  /** keyword */
  keyword?: string;
  /** type */
  type?: "qa" | "feedback" | "blog";
  /** filter */
  filter?: "hot" | "new" | "mine";
}

/** request params */
export interface PostDiscussionUploadPayload {
  /**
   * upload file
   * @format binary
   */
  file: File;
}

export interface GetUserLoginThirdParams {
  type: number;
}
