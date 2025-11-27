import { create } from 'zustand'
import { ModelForumInfo, ModelGroupItemInfo, ModelGroupWithItem, ModelListRes } from '@/api/types'

interface GroupsData {
  origin: (ModelGroupWithItem & {
    items?: ModelGroupItemInfo[]
  })[]
  flat: ModelGroupItemInfo[]
}

interface GroupDataState {
  // 处理分组数据：将原始数据转换为 { origin, flat } 格式
  processGroupsData: (
    groupsData?: ModelListRes & {
      items?: (ModelGroupWithItem & {
        items?: ModelGroupItemInfo[]
      })[]
    },
    contextGroups?: GroupsData
  ) => GroupsData

  // 根据 forumInfo 和 type 过滤分组数据
  filterGroupsByForumAndType: (
    rawGroups: GroupsData,
    forumInfo?: ModelForumInfo | null,
    type?: 'qa' | 'feedback' | 'blog'
  ) => GroupsData

  // 获取过滤后的分组数据
  getFilteredGroups: (
    groupsData?: ModelListRes & {
      items?: (ModelGroupWithItem & {
        items?: ModelGroupItemInfo[]
      })[]
    },
    contextGroups?: GroupsData,
    forumInfo?: ModelForumInfo | null,
    type?: 'qa' | 'feedback' | 'blog'
  ) => GroupsData
}

const defaultGroupsData: GroupsData = {
  origin: [],
  flat: [],
}

export const useGroupDataStore = create<GroupDataState>((set, get) => {
  const processGroupsDataImpl = (
    groupsData?: ModelListRes & {
      items?: (ModelGroupWithItem & {
        items?: ModelGroupItemInfo[]
      })[]
    },
    contextGroups: GroupsData = defaultGroupsData
  ): GroupsData => {
    // 优先使用传入的 groupsData，否则使用 contextGroups
    if (groupsData?.items) {
      return {
        origin: groupsData.items ?? [],
        flat: (groupsData.items?.filter((i) => !!i.items) || []).reduce((acc, item) => {
          acc.push(...(item.items || []))
          return acc
        }, [] as ModelGroupItemInfo[]),
      }
    }

    return contextGroups
  }

  const filterGroupsByForumAndTypeImpl = (rawGroups: GroupsData, forumInfo?: ModelForumInfo | null, type?: 'qa' | 'feedback' | 'blog'): GroupsData => {
    // 获取当前类型对应的 group_ids
    let forumGroupIds: number[] = []
    if (forumInfo?.groups) {
      const matchedGroup = Array.isArray(forumInfo.groups)
        ? forumInfo.groups.find((g: any) => g?.type === type)
        : Object.values(forumInfo.groups).find((g: any) => g?.type === type)
      forumGroupIds = matchedGroup?.group_ids || []
    }

    // 如果没有配置 group_ids，返回原始数据
    if (forumGroupIds.length === 0) {
      return rawGroups
    }

    // 根据 group_ids 过滤分类组
    const filteredOrigin = rawGroups.origin.filter((group) => {
      return forumGroupIds.includes(group.id || -1)
    })

    // 根据筛选后的 origin 重新计算 flat
    const filteredFlat = filteredOrigin.reduce((acc, group) => {
      if (group.items && group.items.length > 0) {
        acc.push(...group.items)
      }
      return acc
    }, [] as ModelGroupItemInfo[])

    return {
      origin: filteredOrigin,
      flat: filteredFlat,
    }
  }

  return {
    processGroupsData: processGroupsDataImpl,

    filterGroupsByForumAndType: filterGroupsByForumAndTypeImpl,

    getFilteredGroups: (groupsData, contextGroups, forumInfo, type) => {
      const rawGroups = processGroupsDataImpl(groupsData, contextGroups)
      return filterGroupsByForumAndTypeImpl(rawGroups, forumInfo, type)
    },
  }
})
