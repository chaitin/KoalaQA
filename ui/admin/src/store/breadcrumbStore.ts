import { create } from 'zustand'

interface BreadcrumbState {
  pageName: string

  setPageName: (name: string) => void
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  pageName: '',

  setPageName: (name) => set({ pageName: name }),
}))
