'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getSystemDiscussion, ModelSystemDiscussion } from '@/api'

interface SystemDiscussionContextType {
  config: ModelSystemDiscussion | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const SystemDiscussionContext = createContext<SystemDiscussionContextType | undefined>(undefined)

interface SystemDiscussionProviderProps {
  children: ReactNode
}

export const SystemDiscussionProvider: React.FC<SystemDiscussionProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<ModelSystemDiscussion | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getSystemDiscussion()
      setConfig(response || null)
    } catch (err) {
      console.error('Failed to fetch system discussion config:', err)
      setError('Failed to load system configuration')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const value: SystemDiscussionContextType = {
    config,
    loading,
    error,
    refetch: fetchConfig,
  }

  return (
    <SystemDiscussionContext.Provider value={value}>
      {children}
    </SystemDiscussionContext.Provider>
  )
}

export const useSystemDiscussion = (): SystemDiscussionContextType => {
  const context = useContext(SystemDiscussionContext)
  if (context === undefined) {
    throw new Error('useSystemDiscussion must be used within a SystemDiscussionProvider')
  }
  return context
}