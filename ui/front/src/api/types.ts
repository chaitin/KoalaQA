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

export enum SvcDiscussionListFilter {
  DiscussionListFilterHot = "hot",
  DiscussionListFilterNew = "new",
  DiscussionListFilterMine = "mine",
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
  UserRoleMax = 4,
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
  DocStatusAppling = 1,
  DocStatusPendingReview = 2,
  DocStatusPendingApply = 3,
}

export enum ModelDiscussionType {
  DiscussionTypeQA = "qa",
  DiscussionTypeFeedback = "feedback",
  DiscussionTypeBlog = "blog",
}

export enum ModelCommentLikeState {
  CommentLikeStateLike = 1,
  CommentLikeStateDislike = 2,
}

export interface AnydocListDoc {
  file?: boolean;
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
  corp_id?: string;
  url?: string;
}

export interface ModelAuthInfo {
  button_desc?: string;
  config?: ModelAuthConfig;
  /**
   * @min 1
   * @max 3
   */
  type?: number;
}

export interface ModelDiscussionComment {
  accepted?: boolean;
  bot?: boolean;
  content?: string;
  dislike?: number;
  id?: number;
  like?: number;
  replies?: ModelDiscussionReply[];
  updated_at?: number;
  user_avatar?: string;
  user_id?: number;
  user_like_state?: ModelCommentLikeState;
  user_name?: string;
}

export interface ModelDiscussionDetail {
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
  like?: number;
  members?: number[];
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
  user_like?: boolean;
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
  forum_id?: number;
  group_ids?: number[];
  hot?: number;
  id?: number;
  like?: number;
  members?: number[];
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
  bot?: boolean;
  content?: string;
  dislike?: number;
  id?: number;
  like?: number;
  updated_at?: number;
  user_avatar?: string;
  user_id?: number;
  user_like_state?: ModelCommentLikeState;
  user_name?: string;
}

export interface ModelExportOpt {
  file_type?: string;
  space_id?: string;
}

export interface ModelForumGroups {
  group_ids?: number[];
  type?: ModelDiscussionType;
}

export interface ModelForumInfo {
  groups?: ModelJSONBArrayModelForumGroups;
  id?: number;
  index?: number;
  name: string;
  route_name?: string;
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

export type ModelJSONBArrayModelForumGroups = Record<string, any>;

export type ModelJSONBModelExportOpt = Record<string, any>;

export type ModelJSONBModelPlatformOpt = Record<string, any>;

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
  parent_id?: number;
  platform?: PlatformPlatformType;
  platform_opt?: ModelJSONBModelPlatformOpt;
  rag_id?: string;
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
  read?: boolean;
  to_bot?: boolean;
  to_id?: number;
  to_name?: string;
  type?: ModelMsgNotifyType;
  updated_at?: number;
  /** 通知到谁，除了发给机器人的信息，user_id 与 to_id 相同 */
  user_id?: number;
}

export interface ModelPlatformOpt {
  access_token?: string;
  app_id?: string;
  phone?: string;
  secret?: string;
  url?: string;
}

export interface ModelPublicAddress {
  address: string;
}

export interface ModelSystemBrand {
  logo?: string;
  text?: string;
}

export interface ModelUser {
  avatar?: string;
  builtin?: boolean;
  created_at?: number;
  email?: string;
  id?: number;
  invisible?: boolean;
  key?: string;
  last_login?: number;
  name?: string;
  org_ids?: number[];
  password?: string;
  role?: ModelUserRole;
  updated_at?: number;
}

export interface ModelUserInfo {
  avatar?: string;
  builtin?: boolean;
  email?: string;
  key?: string;
  no_password?: boolean;
  org_ids?: number[];
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
  version?: string;
}

export interface SvcAuthFrontendGetAuth {
  button_desc?: string;
  type?: number;
}

export interface SvcAuthFrontendGetRes {
  auth_types?: SvcAuthFrontendGetAuth[];
  enable_register?: boolean;
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

export interface SvcDiscussionCompeletReq {
  prefix?: string;
  suffix?: string;
}

export interface SvcDiscussionCreateReq {
  content?: string;
  forum_id?: number;
  group_ids?: number[];
  tags?: string[];
  title: string;
  type?: ModelDiscussionType;
  user_id?: number;
}

export interface SvcDiscussionUpdateReq {
  content?: string;
  group_ids?: number[];
  tags?: string[];
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

export interface SvcFileExportReq {
  desc?: string;
  doc_id: string;
  kb_id: number;
  title: string;
  uuid: string;
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

export interface SvcListRemoteReq {
  opt?: ModelPlatformOpt;
  platform?: PlatformPlatformType;
  remote_folder_id?: string;
}

export interface SvcListSpaceFolderItem {
  created_at?: number;
  doc_id?: string;
  id?: number;
  rag_id?: string;
  status?: ModelDocStatus;
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

export interface SvcListSpaceKBItem {
  desc?: string;
  doc_id?: string;
  file_type?: ModelFileType;
  title?: string;
}

export interface SvcListWebItem {
  created_at?: number;
  desc?: string;
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
  updated_at?: number;
}

export interface SvcOrgUpsertReq {
  forum_ids?: number[];
  name: string;
}

export interface SvcPolishReq {
  text?: string;
}

export interface SvcRankContributeItem {
  avatar?: string;
  id?: number;
  name?: string;
  score?: number;
}

export interface SvcResolveFeedbackReq {
  resolve?: boolean;
}

export interface SvcReviewReq {
  add_new: boolean;
  content: string;
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

export interface SvcUpdatePromptReq {
  prompt?: string;
}

export interface SvcUpdateSpaceReq {
  opt?: ModelPlatformOpt;
  title?: string;
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

export interface SvcUserRegisterReq {
  email: string;
  name: string;
  password: string;
}

export interface SvcUserUpdateReq {
  email?: string;
  name?: string;
  org_ids?: number[];
  password?: string;
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

export interface TopicTaskMeta {
  access_token?: string;
  app_id?: string;
  dbdocID?: number;
  desc?: string;
  docType?: ModelDocType;
  doc_id?: string;
  doc_type?: ModelFileType;
  err?: string;
  exportOpt?: ModelExportOpt;
  kbid?: number;
  parentID?: number;
  phone?: string;
  platform?: PlatformPlatformType;
  platform_id?: string;
  secret?: string;
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
  unknown_prompt?: string;
}

/** request params */
export type PutAdminForumPayload = SvcForumUpdateReq & {
  forums?: (ModelForumInfo & {
    groups?: ModelForumGroups[];
  })[];
};

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
  title?: string;
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

export interface PutAdminKbKbIdSpaceSpaceIdRefreshParams {
  /** kb_id */
  kbId: number;
  /** space_id */
  spaceId: number;
}

export interface GetAdminKbKbIdSpaceSpaceIdRemoteParams {
  remote_folder_id?: string;
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
  id: string;
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
  /** @min 1 */
  size?: number;
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
  filter?: "hot" | "new" | "mine";
  forum_id?: number;
  group_ids?: number[];
  keyword?: string;
  /** @min 1 */
  page?: number;
  /** @min 1 */
  size?: number;
  type?: "qa" | "feedback" | "blog";
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

export interface PostDiscussionDiscIdLikeParams {
  /** disc_id */
  discId: string;
}

export interface PostDiscussionDiscIdResolveParams {
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

export interface GetGroupParams {
  /** forum id */
  forum_id?: number;
}

export interface PutUserPayload {
  /**
   * avatar
   * @format binary
   */
  avatar?: File;
  email?: string;
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
