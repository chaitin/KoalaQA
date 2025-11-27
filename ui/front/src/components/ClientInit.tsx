"use client"

import React, { useEffect } from 'react'
import { useForumStore } from '@/store'
import { ModelForumInfo } from '@/api/types'
import { useParams } from 'next/navigation'

const ClientInit = ({ initialForums = [] }: { initialForums?: ModelForumInfo[] }) => {
  const setForums = useForumStore((s) => s.setForums)
  const setRouteName = useForumStore((s) => s.setRouteName)
  const params = useParams()

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        if (initialForums && initialForums.length > 0) {
          setForums(initialForums)
        } else {
          // fallback：如果 initialForums 为空，尝试在客户端刷新一次 forums
          const refreshed = await useForumStore.getState().refreshForums()
          if (mounted && refreshed && refreshed.length > 0) {
            setForums(refreshed)
          }
        }

        const routeName = params?.route_name as string | undefined
        if (routeName) {
          setRouteName(routeName)
        }
      } catch (e) {
        // 忽略错误，客户端无需阻塞渲染
        console.warn('ClientInit init error', e)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [initialForums, params, setForums, setRouteName])

  return null
}

export default ClientInit
