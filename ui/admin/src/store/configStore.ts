import { create } from 'zustand'

interface ConfigState {
  kb_id: number
  kb_c: boolean
  modelStatus: boolean

  setKbId: (id: number) => void
  setKbC: (value: boolean) => void
  setModelStatus: (status: boolean) => void
}

export const useConfigStore = create<ConfigState>((set) => ({
  kb_id: 0,
  kb_c: false,
  modelStatus: false,

  setKbId: (id) => set({ kb_id: id }),
  setKbC: (value) => set({ kb_c: value }),
  setModelStatus: (status) => set({ modelStatus: status }),
}))
