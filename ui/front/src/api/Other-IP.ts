import request from './httpClient';
import { GroupItem, ResponseData, SearchData, TagItem } from './Other-IP-types';

const getUrl = (org_id: number) => {
  let url = `https://${location.host.includes('dev') ? 'threat' : 'ip'}-${org_id}.${location.host}/api/`;
  if (process.env.NODE_ENV === 'development') {
    url = '/api/';
  }
  return url;
};

export const freeSearch = (org_id: number, params: { q: string }) =>
  request<ResponseData<SearchData>>({
    path: getUrl(org_id) + 'share/search',
    method: 'get',
    query: params,
  });

export const freeIPGroups = (org_id: number, params: { q: string }) =>
  request<ResponseData<GroupItem[]>>({
    path: getUrl(org_id) + 'share/ip_group',
    method: 'get',
    query: params,
  });

export const getMineIP = (org_id: number) =>
  request<ResponseData<{ ip: string }>>({
    path: getUrl(org_id) + 'share/ip/mine',
    method: 'get',
  });

export const getRank = (org_id: number) =>
  request<ResponseData<{ ips: string[] }>>({
    path: getUrl(org_id) + 'share/search/rank',
    method: 'get',
  });

export const getMineIPMyEvents = (org_id: number) =>
  request<ResponseData<{ ip: string }>>({
    path: getUrl(org_id) + 'share/ip/my_events',
    method: 'get',
  });

export const freeWhois = (org_id: number, params: { ip: string }) =>
  request<ResponseData<{ iana: string }>>({
    path: getUrl(org_id) + 'share/whois',
    method: 'get',
    query: params,
  });

export const freeIPGroupsTags = (org_id: number) =>
  request<ResponseData<TagItem[]>>({
    path: getUrl(org_id) + 'share/ip_group/tag',
    method: 'get',
  });

// export const vipSearch = (org_id: number, params: { q: string }) => request<ResponseData<SearchData>>({
//   path: getUrl(org_id) + 'v1/search',
//   method: 'get',
//   query: params,
//   credentials: 'include',
// })

// export const vipIPGroups = (org_id: number, params: { q: string }) => request<ResponseData<GroupItem[]>>({
//   path: getUrl(org_id) + 'v1/ip_group',
//   method: 'get',
//   query: params,
//   credentials: 'include',
// })

// export const vipWhois = (org_id: number, params: { ip: string }) => request<ResponseData<{ iana: string }>>({
//   path: getUrl(org_id) + 'v1/whois',
//   method: 'get',
//   query: params,
//   credentials: 'include',
// })

// export const vipIPGroupsTags = (org_id: number,) => request<ResponseData<TagItem[]>>({
//   path: getUrl(org_id) + 'v1/ip_group/tag',
//   method: 'get',
//   credentials: 'include',
// })

// export const subscribeIPGroup = (org_id: number, id: string) => request<ResponseData<{ access_key: string }>>({
//   path: getUrl(org_id) + `v1/ip_group/${id}/subscribe`,
//   method: 'post',
//   credentials: 'include',
// })

// export const getIPGroupInfo = (org_id: number, id: string) => request<ResponseData<GroupInfo>>({
//   path: getUrl(org_id) + `v1/ip_group/${id}`,
//   method: 'get',
//   credentials: 'include',
// })

// export const getOrgInfo = (org_id: number) => request<ResponseData<OrgDetail>>({
//   path: getUrl(org_id) + 'v1/org',
//   method: 'get',
//   credentials: 'include',
// })

export const getOrgs = () =>
  request<ResponseData<{ data: { id: number; name: string }[] }>>({
    path: '/api/v1/organizations',
    method: 'get',
  });

export const getApps = (org_id: number) =>
  request<ResponseData<{ apps: { id: number; name: string }[] }>>({
    path: '/api/v1/organizations/' + org_id + '/purchase/apps',
    method: 'get',
  });

export const openIPApp = (body: {
  id: number;
  org_id: number;
  package_id: number;
}) =>
  request<ResponseData<{}>>({
    path: '/api/v1/apps/' + body.org_id + '/subscribe',
    method: 'post',
    body,
  });
