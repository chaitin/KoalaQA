import { create } from 'zustand'
import { getSystemDiscussion, ModelSystemDiscussion } from '@/api'

interface SystemDiscussionState {
  config: ModelSystemDiscussion | null
  loading: boolean
  error: string | null
  initialized: boolean

  fetchConfig: () => Promise<void>
  refetch: () => Promise<void>
  initialize: () => Promise<void>
}

export const useSystemDiscussionStore = create<SystemDiscussionState>((set) => ({
  config: null,
  loading: false,
  error: null,
  initialized: false,

  fetchConfig: async () => {
    try {
      set({ loading: true, error: null })
      const response = await getSystemDiscussion()
      set({ config: response || null, loading: false, initialized: true })
    } catch (err) {
      console.error('Failed to fetch system discussion config:', err)
      set({ error: 'Failed to load system configuration', loading: false, initialized: true })
    }
  },

  refetch: async () => {
    try {
      set({ loading: true, error: null })
      const response = await getSystemDiscussion()
      set({ config: response || null, loading: false })
    } catch (err) {
      console.error('Failed to fetch system discussion config:', err)
      set({ error: 'Failed to load system configuration', loading: false })
    }
  },

  initialize: async () => {
    try {
      set({ loading: true, error: null })
      const response = await getSystemDiscussion()
      set({ config: response || null, loading: false, initialized: true })
    } catch (err) {
      console.error('Failed to fetch system discussion config:', err)
      set({ error: 'Failed to load system configuration', loading: false, initialized: true })
    }
  },
}))
