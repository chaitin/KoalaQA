import request, { ContentType, RequestParams } from './httpClient';

export const getVuldbList = (
  query: {
    keyword?: string;
    page: number;
    size: number;
  },
  params: RequestParams = {}
) =>
  request<{
    data?: any;
  }>({
    path: `/api/vuln/list`,
    method: 'GET',
    query: query,
    type: ContentType.Json,
    format: 'json',
    ...params,
  });

export const getVuldbDetail = (id: string, params: RequestParams = {}) =>
  request<{
    data?: any;
  }>({
    path: `/api/vuln/${id}`,
    method: 'GET',
    type: ContentType.Json,
    format: 'json',
    ...params,
  });
