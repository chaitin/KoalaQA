'use client'

import { ModelUserQuickReply } from '@/api'
import Modal from '@/components/modal'
import { AuthContext } from '@/components/authProvider'
import { useQuickReplyStore } from '@/store/quickReplyStore'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CancelIcon from '@mui/icons-material/Cancel'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import { Box, Button, CircularProgress, IconButton, Stack, Typography } from '@mui/material'
import { useState, useContext, useEffect } from 'react'
import QuickReplyEditModal from './QuickReplyEditModal'

interface SortableItemProps {
  id: string | number
  item: ModelUserQuickReply
  onEdit: (item: ModelUserQuickReply) => void
  onDelete: (id: number) => void
}

function SortableItem({ id, item, onEdit, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const truncatedContent =
    item.content && item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        p: 2,
        mb: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        cursor: isDragging ? 'grabbing' : 'grab',
        border: '1px solid #eee',
        borderRadius: 1,
        backgroundColor: '#fff',
        transition: 'all 0.2s',
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      }}
    >
      <IconButton
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          color: '#999',
          '&:active': { cursor: 'grabbing' },
          flexShrink: 0,
        }}
        size='small'
      >
        <DragHandleIcon fontSize='small' />
      </IconButton>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant='subtitle2' fontWeight={600} sx={{ mb: 0.5 }}>
          {item.name}
        </Typography>
        <Typography
          variant='body2'
          sx={{
            color: '#666',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '12px',
          }}
        >
          {truncatedContent}
        </Typography>
      </Box>

      <Stack direction='row' spacing={1} sx={{ flexShrink: 0 }}>
        <Button variant='outlined' size='small' onClick={() => onEdit(item)}>
          编辑
        </Button>
        <IconButton size='small' onClick={() => onDelete(item.id!)} title='删除'>
          <CancelIcon fontSize='small' />
        </IconButton>
      </Stack>
    </Box>
  )
}

export default function QuickReplyList() {
  const { user } = useContext(AuthContext)
  const {
    quickReplies,
    loading,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    reorderQuickReplies,
    localReorderQuickReplies,
    setUserRole,
    fetchQuickReplies,
  } = useQuickReplyStore()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ModelUserQuickReply | null>(null)

  // 设置用户角色并获取快捷回复列表
  useEffect(() => {
    if (user?.role) {
      setUserRole(user.role)
      fetchQuickReplies()
    }
  }, [user?.role, setUserRole, fetchQuickReplies])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // 处理拖动结束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      // 先本地更新
      localReorderQuickReplies(active.id as number, over.id as number)
    }
  }

  // 删除快捷回复
  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确定要删除该快捷回复吗？',
      content: '',
      onOk: async () => {
        try {
          await deleteQuickReply(id)
        } catch (error) {
          // 错误会在 store 中处理
        }
      },
    })
  }

  // 编辑快捷回复
  const handleEdit = (item: ModelUserQuickReply) => {
    setEditingItem(item)
    setEditModalOpen(true)
  }

  // 新增快捷回复
  const handleCreate = () => {
    setEditingItem(null)
    setEditModalOpen(true)
  }

  // 保存快捷回复（新增或编辑）
  const handleSaveQuickReply = async (name: string, content: string) => {
    try {
      if (editingItem?.id) {
        // 编辑现有的快捷回复
        await updateQuickReply(editingItem.id, name, content)
      } else {
        // 创建新的快捷回复
        await createQuickReply(name, content)
      }
      setEditModalOpen(false)
      setEditingItem(null)
    } catch (error) {
      // 错误会在 store 中处理
    }
  }

  if (loading) {
    return (
      <Stack
        sx={{
          height: '300px',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Stack>
    )
  }

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant='body2' sx={{ color: '#666', mb: 0.5 }}>
            已创建 {quickReplies.length}/5 个快捷回复
          </Typography>
        </Box>
        <Button
          variant='contained'
          onClick={handleCreate}
          disabled={quickReplies.length >= 5}
          size='small'
          sx={{ textTransform: 'none' }}
        >
          创建快捷回复
        </Button>
      </Box>

      {quickReplies.length === 0 ? (
        <Stack
          sx={{
            height: '200px',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant='body2'>暂无快捷回复，点击创建快捷回复开始</Typography>
        </Stack>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={quickReplies.map((item) => item.id!)} strategy={verticalListSortingStrategy}>
            {quickReplies.map((item) => (
              <SortableItem key={item.id} id={item.id!} item={item} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <QuickReplyEditModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditingItem(null)
        }}
        editingItem={editingItem}
        onSave={handleSaveQuickReply}
      />
    </Box>
  )
}
