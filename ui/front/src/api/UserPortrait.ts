import request, { ContentType, RequestParams } from './httpClient'
import { ContextResponse, ModelListRes, SvcUserPortraitListItem } from './types'



export interface SvcUserPortraitReq {
  content: string
}

export interface GetUserPortraitParams {
  userId: number | string
}

export interface UpdateUserPortraitParams extends GetUserPortraitParams {
  portraitId: number | string
}

export const getUserPortraitList = (
  { userId }: GetUserPortraitParams,
  params: RequestParams = {},
) =>
  request<
    ContextResponse & {
      data?: ModelListRes & {
        items?: SvcUserPortraitListItem[]
      }
    }
  >({
    path: `/user/${userId}/portrait`,
    method: 'GET',
    format: 'json',
    ...params,
  })

export const postUserPortrait = (
  { userId }: GetUserPortraitParams,
  req: SvcUserPortraitReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/user/${userId}/portrait`,
    method: 'POST',
    body: req,
    type: ContentType.Json,
    format: 'json',
    ...params,
  })

export const putUserPortrait = (
  { userId, portraitId }: UpdateUserPortraitParams,
  req: SvcUserPortraitReq,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/user/${userId}/portrait/${portraitId}`,
    method: 'PUT',
    body: req,
    type: ContentType.Json,
    format: 'json',
    ...params,
  })

export const deleteUserPortrait = (
  { userId, portraitId }: UpdateUserPortraitParams,
  params: RequestParams = {},
) =>
  request<ContextResponse>({
    path: `/user/${userId}/portrait/${portraitId}`,
    method: 'DELETE',
    format: 'json',
    ...params,
  })
