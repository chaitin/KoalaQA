'use client'

import { ModelForumInfo, ModelGroupItemInfo, ModelGroupWithItem, ModelListRes } from '@/api/types'
import { CommonContext } from '@/components/commonProvider'
import React, { createContext, useContext, useMemo, ReactNode } from 'react'

interface GroupDataContextType {
  /**
   * 处理分组数据：将原始数据转换为 { origin, flat } 格式
   * @param groupsData SSR传入的分组数据（可选）
   * @returns 处理后的分组数据
   */
  processGroupsData: (
    groupsData?: ModelListRes & {
      items?: (ModelGroupWithItem & {
        items?: ModelGroupItemInfo[]
      })[]
    }
  ) => {
    origin: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[]
    })[]
    flat: ModelGroupItemInfo[]
  }

  /**
   * 根据 forumInfo 和 type 过滤分组数据
   * @param rawGroups 原始分组数据
   * @param forumInfo 论坛信息（可选）
   * @param type 类型：'qa' | 'blog' | 'issue'
   * @returns 过滤后的分组数据
   */
  filterGroupsByForumAndType: (
    rawGroups: {
      origin: (ModelGroupWithItem & {
        items?: ModelGroupItemInfo[]
      })[]
      flat: ModelGroupItemInfo[]
    },
    forumInfo?: ModelForumInfo | null,
    type?: 'qa' | 'blog' | 'issue'
  ) => {
    origin: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[]
    })[]
    flat: ModelGroupItemInfo[]
  }

  /**
   * 获取过滤后的分组数据（结合 processGroupsData 和 filterGroupsByForumAndType）
   * @param groupsData SSR传入的分组数据（可选）
   * @param forumInfo 论坛信息（可选）
   * @param type 类型：'qa' | 'blog' | 'issue'
   * @returns 处理并过滤后的分组数据
   */
  getFilteredGroups: (
    groupsData?: ModelListRes & {
      items?: (ModelGroupWithItem & {
        items?: ModelGroupItemInfo[]
      })[]
    },
    forumInfo?: ModelForumInfo | null,
    type?: 'qa' | 'blog' | 'issue'
  ) => {
    origin: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[]
    })[]
    flat: ModelGroupItemInfo[]
  }
}

const GroupDataContext = createContext<GroupDataContextType | null>(null)

export const useGroupData = () => {
  const context = useContext(GroupDataContext)
  if (!context) {
    throw new Error('useGroupData must be used within GroupDataProvider')
  }
  return context
}

interface GroupDataProviderProps {
  children: ReactNode
}

export const GroupDataProvider: React.FC<GroupDataProviderProps> = ({ children }) => {
  const { groups: contextGroups } = useContext(CommonContext)

  const processGroupsData = useMemo(
    () => (
      groupsData?: ModelListRes & {
        items?: (ModelGroupWithItem & {
          items?: ModelGroupItemInfo[]
        })[]
      }
    ) => {
      // 优先使用 SSR 传入的 groupsData，否则使用 contextGroups
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
    },
    [contextGroups]
  )

  const filterGroupsByForumAndType = useMemo(
    () => (
      rawGroups: {
        origin: (ModelGroupWithItem & {
          items?: ModelGroupItemInfo[]
        })[]
        flat: ModelGroupItemInfo[]
      },
      forumInfo?: ModelForumInfo | null,
      type?: 'qa' | 'blog' | 'issue'
    ) => {
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
    },
    []
  )

  const getFilteredGroups = useMemo(
    () => (
      groupsData?: ModelListRes & {
        items?: (ModelGroupWithItem & {
          items?: ModelGroupItemInfo[]
        })[]
      },
      forumInfo?: ModelForumInfo | null,
      type?: 'qa' | 'blog' | 'issue'
    ) => {
      const rawGroups = processGroupsData(groupsData)
      return filterGroupsByForumAndType(rawGroups, forumInfo, type)
    },
    [processGroupsData, filterGroupsByForumAndType]
  )

  return (
    <GroupDataContext.Provider
      value={{
        processGroupsData,
        filterGroupsByForumAndType,
        getFilteredGroups,
      }}
    >
      {children}
    </GroupDataContext.Provider>
  )
}

