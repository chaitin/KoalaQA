import { create } from 'zustand'
import {
  getUserQuickReply,
  ModelUserQuickReply,
  ModelUserRole,
  postUserQuickReply,
  putUserQuickReplyReindex,
  putUserQuickReplyQuickReplyId,
  deleteUserQuickReplyQuickReplyId,
} from '@/api'
import { Message } from '@/components'
import { arrayMove } from '@dnd-kit/sortable'

// 检查用户是否有权限操作快捷回复（仅管理员和运营人员）
const hasQuickReplyPermission = (userRole?: ModelUserRole): boolean => {
  return userRole === ModelUserRole.UserRoleAdmin || userRole === ModelUserRole.UserRoleOperator
}

interface QuickReplyStore {
  quickReplies: ModelUserQuickReply[]
  loading: boolean
  error: string | null
  userRole?: ModelUserRole // 存储当前用户角色

  // 设置用户角色
  setUserRole: (role?: ModelUserRole) => void

  // 获取快捷回复列表
  fetchQuickReplies: () => Promise<void>

  // 创建快捷回复
  createQuickReply: (name: string, content: string) => Promise<void>

  // 编辑快捷回复
  updateQuickReply: (id: number, name: string, content: string) => Promise<void>

  // 删除快捷回复
  deleteQuickReply: (id: number) => Promise<void>

  // 排序快捷回复
  reorderQuickReplies: (ids: number[]) => Promise<void>

  // 本地拖动排序（不调用 API）
  localReorderQuickReplies: (fromId: number, toId: number) => void

  // 设置加载状态
  setLoading: (loading: boolean) => void

  // 清空快捷回复
  clearQuickReplies: () => void
}

export const useQuickReplyStore = create<QuickReplyStore>((set, get) => ({
  quickReplies: [],
  loading: false,
  error: null,
  userRole: undefined,

  setUserRole: (role?: ModelUserRole) => {
    set({ userRole: role })
  },

  fetchQuickReplies: async () => {
    const { userRole } = get()
    
    // 只有管理员和运营人员可以获取快捷回复
    if (!hasQuickReplyPermission(userRole)) {
      console.log('无权限获取快捷回复，仅管理员和运营人员可用')
      return
    }

    set({ loading: true })
    try {
      const res = await getUserQuickReply()
      if ((res as any)?.items) {
        set({ quickReplies: (res as any).items, error: null })
      }
    } catch (error) {
      console.error('获取快捷回复失败:', error)
      set({ error: '获取快捷回复失败' })
      Message.error('获取快捷回复失败')
    } finally {
      set({ loading: false })
    }
  },

  createQuickReply: async (name: string, content: string) => {
    const { userRole } = get()
    
    // 只有管理员和运营人员可以创建快捷回复
    if (!hasQuickReplyPermission(userRole)) {
      Message.error('无权限操作，仅管理员和运营人员可用')
      return
    }

    try {
      await postUserQuickReply({ name, content })
      Message.success('保存成功')
      // 重新获取列表
      await get().fetchQuickReplies()
    } catch (error) {
      console.error('保存失败:', error)
      set({ error: '保存失败' })
      Message.error('保存失败')
      throw error
    }
  },

  updateQuickReply: async (id: number, name: string, content: string) => {
    const { userRole } = get()
    
    // 只有管理员和运营人员可以编辑快捷回复
    if (!hasQuickReplyPermission(userRole)) {
      Message.error('无权限操作，仅管理员和运营人员可用')
      return
    }

    try {
      await putUserQuickReplyQuickReplyId({ quickReplyId: id }, { name, content })
      Message.success('更新成功')
      // 重新获取列表
      await get().fetchQuickReplies()
    } catch (error) {
      console.error('更新失败:', error)
      set({ error: '更新失败' })
      Message.error('更新失败')
      throw error
    }
  },

  deleteQuickReply: async (id: number) => {
    const { userRole } = get()
    
    // 只有管理员和运营人员可以删除快捷回复
    if (!hasQuickReplyPermission(userRole)) {
      Message.error('无权限操作，仅管理员和运营人员可用')
      return
    }

    try {
      await deleteUserQuickReplyQuickReplyId({ quickReplyId: id })
      Message.success('删除成功')
      set((state) => ({
        quickReplies: state.quickReplies.filter((item) => item.id !== id),
      }))
    } catch (error) {
      console.error('删除失败:', error)
      set({ error: '删除失败' })
      Message.error('删除失败')
      throw error
    }
  },

  reorderQuickReplies: async (ids: number[]) => {
    const { userRole } = get()
    
    // 只有管理员和运营人员可以排序快捷回复
    if (!hasQuickReplyPermission(userRole)) {
      Message.error('无权限操作，仅管理员和运营人员可用')
      return
    }

    try {
      await putUserQuickReplyReindex({ ids })
    } catch (error) {
      console.error('更新顺序失败:', error)
      set({ error: '更新顺序失败' })
      Message.error('更新顺序失败')
      // 恢复原来的顺序
      await get().fetchQuickReplies()
      throw error
    }
  },

  localReorderQuickReplies: (fromId: number, toId: number) => {
    const { userRole } = get()
    
    // 只有管理员和运营人员可以排序快捷回复
    if (!hasQuickReplyPermission(userRole)) {
      Message.error('无权限操作，仅管理员和运营人员可用')
      return
    }

    set((state) => {
      const oldIndex = state.quickReplies.findIndex((item) => item.id === fromId)
      const newIndex = state.quickReplies.findIndex((item) => item.id === toId)

      if (oldIndex === -1 || newIndex === -1) {
        return state
      }

      const newItems = arrayMove(state.quickReplies, oldIndex, newIndex)
      try {
        const ids = newItems.map((item) => item.id!).filter((id) => id > 0)
        putUserQuickReplyReindex({ ids }).then(() => {
          Message.success('排序成功')
        })
      } catch (error) {
        // 错误会在 store 中处理
      }
      return { quickReplies: newItems }
    })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  clearQuickReplies: () => {
    set({ quickReplies: [], error: null })
  },
}))
