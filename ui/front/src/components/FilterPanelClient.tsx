'use client'

import { ModelGroupItemInfo, ModelGroupWithItem } from '@/api'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

interface FilterPanelClientProps {
  routeName: string
  forumId: number | null
  typeForFilter: string | null
  isDetailPage: boolean
  urlTopics: number[]
  filteredGroups: {
    origin: (ModelGroupWithItem & { items?: ModelGroupItemInfo[] })[]
    flat: ModelGroupItemInfo[]
  }
  onTagsChange?: (tags: number[]) => void
  onUrlSync?: () => void
}

export default function FilterPanelClient({
  routeName,
  forumId,
  typeForFilter,
  isDetailPage,
  urlTopics,
  filteredGroups,
  onTagsChange,
  onUrlSync,
}: FilterPanelClientProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouterWithRouteName()

  // 根据当前 type（可选：叠加当前分类筛选）聚合出"正在使用"的标签 id，用于过滤标签列表展示
  const [usedTagIdSet, setUsedTagIdSet] = useState<Set<number> | null>(null)
  const [usedTagReadyKey, setUsedTagReadyKey] = useState<string | null>(null)
  const [usedTagLoading, setUsedTagLoading] = useState(false)
  const usedTagCacheRef = useState(() => new Map<string, Set<number>>())[0]

  const usedTagTargetKey = useMemo(() => {
    if (isDetailPage) return null
    if (!forumId) return null
    if (!typeForFilter) return null
    const topicKey = (urlTopics || [])
      .slice()
      .sort((a, b) => a - b)
      .join(',')
    return `forum:${forumId}|type:${typeForFilter}|topics:${topicKey}`
  }, [forumId, isDetailPage, typeForFilter, urlTopics])

  useEffect(() => {
    if (isDetailPage) return
    if (!forumId) return
    if (!typeForFilter) {
      setUsedTagLoading(false)
      setUsedTagIdSet(null)
      setUsedTagReadyKey(null)
      if (onTagsChange) onTagsChange([])
      return
    }
    if (!usedTagTargetKey) return

    let cancelled = false
    setUsedTagLoading(true)

    const cached = usedTagCacheRef.get(usedTagTargetKey)
    if (cached) {
      setUsedTagIdSet(cached)
      setUsedTagReadyKey(usedTagTargetKey)
      setUsedTagLoading(false)
      if (onTagsChange) onTagsChange(Array.from(cached))
      return
    }

    const { getDiscussion } = require('@/api')
    const params: any = {
      forum_id: forumId,
      page: 1,
      size: 200,
      filter: 'publish',
    }
    if (typeForFilter) {
      params.type = typeForFilter
    }

    if (urlTopics.length > 0) {
      params.group_ids = urlTopics
    }

    getDiscussion(params)
      .then((res: any) => {
        if (cancelled) return
        const ids = new Set<number>()
        ;(res?.items || []).forEach((it: any) => {
          ;(it?.tag_ids || []).forEach((id: any) => {
            const n = Number(id)
            if (!Number.isNaN(n)) ids.add(n)
          })
        })
        usedTagCacheRef.set(usedTagTargetKey, ids)
        setUsedTagIdSet(ids)
        setUsedTagReadyKey(usedTagTargetKey)
        if (onTagsChange) onTagsChange(Array.from(ids))
      })
      .catch((e: any) => {
        console.error('Failed to fetch used tags:', e)
        if (!cancelled) {
          const empty = new Set<number>()
          usedTagCacheRef.set(usedTagTargetKey, empty)
          setUsedTagIdSet(empty)
          setUsedTagReadyKey(usedTagTargetKey)
          if (onTagsChange) onTagsChange([])
        }
      })
      .finally(() => {
        if (!cancelled) setUsedTagLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [forumId, typeForFilter, isDetailPage, usedTagTargetKey, urlTopics, usedTagCacheRef, onTagsChange])

  // 清理 URL 中不属于当前 type 的分类/标签
  useEffect(() => {
    if (isDetailPage) return
    if (!routeName) return
    if (!onUrlSync) return

    const normalize = (arr: number[]) =>
      arr
        .slice()
        .sort((a, b) => a - b)
        .join(',')

    const urlTopicsFromParams = (() => {
      const tps = searchParams?.get('tps')
      if (!tps) return []
      return tps
        .split(',')
        .map(Number)
        .filter((id) => !Number.isNaN(id))
    })()

    const urlTagsFromParams = (() => {
      const tags = searchParams?.get('tags')
      if (!tags) return []
      return tags
        .split(',')
        .map(Number)
        .filter((id) => !Number.isNaN(id))
    })()

    const typeForUrl = searchParams?.get('type') || null

    if (!typeForUrl) return

    const allowedTopicIds = urlTopicsFromParams.filter((id) => filteredGroups.flat.some((g) => g.id === id))
    const nextTopicsKey = normalize(allowedTopicIds)
    const curTopicsKey = normalize(urlTopicsFromParams)

    const canCleanTags = !!typeForFilter && usedTagTargetKey && usedTagReadyKey === usedTagTargetKey
    const allowedTagIds = canCleanTags && usedTagIdSet ? urlTagsFromParams.filter((id) => usedTagIdSet.has(id)) : urlTagsFromParams
    const nextTagsKey = normalize(allowedTagIds)
    const curTagsKey = normalize(urlTagsFromParams)

    if (nextTopicsKey === curTopicsKey && nextTagsKey === curTagsKey) return

    onUrlSync()
  }, [isDetailPage, routeName, filteredGroups.flat, usedTagIdSet, usedTagTargetKey, usedTagReadyKey, typeForFilter, searchParams, onUrlSync])

  return null
}
