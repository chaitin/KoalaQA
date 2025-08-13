import { AttackType, BANNEDIPSTATUS, StatusEnum, ThreatSource } from "@/constant/ip";

export type ResponseData<T> = {
  data: T;
  success: boolean;
  message: string;
};

export type EventItem = {
  attack_type: keyof typeof AttackType,
  count: number,
  create_at: number,
  ports: number[]
  source: keyof typeof ThreatSource
}
export type IPItem = {
  create_at: number,
  ip: string,
  status: keyof typeof StatusEnum
  tags: string[] | null,
  update_at: number
  iana: string
  address: {
    lng: number
    lat: number
    country: string,
    city: string
    province: string
    isp: string
    owner: string
    timezone: string
  }
}
export type SearchData = {
  behavior: {
    web_attack: {
      items: EventItem[] | null,
      total: number
    }
    scan_attack: {
      items: EventItem[] | null,
      total: number
    }
    malicious_attack: {
      items: EventItem[] | null,
      total: number
    }
    crawler_attack: {
      items: EventItem[] | null,
      total: number
    }
  }
  events: {
    items: EventItem[] | null,
    total: number
  },
  ip_info: IPItem
}
export type GroupItem = {
  cidr_count: number,
  group_id: string,
  mode: 'free' | 'pro',
  name: string,
  tags: string[] | null,
  update_at: number
  user_name: string
  mine: boolean
}
export type GroupInfo = {
  cidrs: string[] | null,
  cidr_count: number,
  desc: string,
  id: string,
  mode: 'free' | 'pro'
  name: string,
  tags: string[] | null,
  update_at: number
  user_name: string
  create_at: number
  mine: boolean
  subscribe_count: number
}
export type BlockItem = {
  apply_user_count: number,
  ip: string,
  status: keyof typeof BANNEDIPSTATUS,
  update_at: number
}
export interface RcFile extends File {
  uid: string;
}
export type ModeEnum = 'free' | 'v1' | 'v8'
export interface VersionItem {
  label: string
  value: ModeEnum
  discount_month: number
  price_month: number
  discount_year: number
  price_year: number
  color: string
}
export interface CreateIPGroupData {
  cidrs: string[],
  desc: string,
  name: string,
  tags: string[]
}
export interface OrgDetail {
  mode: ModeEnum
  expired_at: number
}
export interface TagItem {
  count: number
  tag: string
}