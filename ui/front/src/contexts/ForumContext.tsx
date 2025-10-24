'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { ModelForum } from '@/api/types'

interface ForumContextType {
  selectedForumId: number | null
  forums: ModelForum[]
}

const ForumContext = createContext<ForumContextType | undefined>(undefined)

interface ForumProviderProps {
  children: ReactNode
  initialForums?: ModelForum[]
}

export const ForumProvider = ({ children, initialForums = [] }: ForumProviderProps) => {
  const params = useParams()
  const forumIdParam = params?.forum_id as string
  const selectedForumId = forumIdParam ? parseInt(forumIdParam, 10) : null
  
  return (
    <ForumContext.Provider
      value={{
        selectedForumId,
        forums: initialForums,
      }}
    >
      {children}
    </ForumContext.Provider>
  )
}

export const useForum = () => {
  const context = useContext(ForumContext)
  if (context === undefined) {
    throw new Error('useForum must be used within a ForumProvider')
  }
  return context
}
