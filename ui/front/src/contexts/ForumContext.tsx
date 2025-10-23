'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useParams } from 'next/navigation'

interface ForumContextType {
  selectedForumId: number | null
}

const ForumContext = createContext<ForumContextType | undefined>(undefined)

interface ForumProviderProps {
  children: ReactNode
}

export const ForumProvider = ({ children }: ForumProviderProps) => {
  const params = useParams()
  const forumIdParam = params?.forum_id as string
  const selectedForumId = forumIdParam ? parseInt(forumIdParam, 10) : null
  
  return (
    <ForumContext.Provider
      value={{
        selectedForumId,
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
