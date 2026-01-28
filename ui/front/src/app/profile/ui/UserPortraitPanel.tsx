'use client'

import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '@/components/authProvider'
import {
  deleteUserPortrait,
  getUserPortraitList,
  ModelUserRole,
  postUserPortrait,
  putUserPortrait,
  SvcUserPortraitListItem,
} from '@/api'
import { isAdminRole } from '@/lib/utils'
import { Message } from '@/components'
import Modal from '@/components/modal'
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import AddIcon from '@mui/icons-material/Add'
import { TimeDisplay } from '@/components/TimeDisplay'

interface UserPortraitPanelProps {
  userId: number
  targetUserName?: string
}

interface PortraitFormState {
  open: boolean
  loading: boolean
  value: string
  editingId?: number
}

const INITIAL_FORM_STATE: PortraitFormState = {
  open: false,
  loading: false,
  value: '',
  editingId: undefined,
}

export default function UserPortraitPanel({ userId, targetUserName }: UserPortraitPanelProps) {
  const { user } = useContext(AuthContext)
  const [portraits, setPortraits] = useState<SvcUserPortraitListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [formState, setFormState] = useState<PortraitFormState>(INITIAL_FORM_STATE)

  const canManage = useMemo(() => {
    const role = user?.role ?? ModelUserRole.UserRoleUnknown
    return isAdminRole(role)
  }, [user?.role])

  if (!canManage) {
    return null
  }

  const fetchPortraits = useCallback(async () => {
    if (!userId || !canManage) {
      setPortraits([])
      return
    }

    setLoading(true)
    try {
      const res = await getUserPortraitList({ userId })
      const items = (res as any)?.items || []
      setPortraits(items)
    } catch (error) {
      console.error('获取用户画像失败:', error)
      Message.error('获取用户画像失败')
    } finally {
      setLoading(false)
    }
  }, [userId, canManage])

  useEffect(() => {
    fetchPortraits()
  }, [fetchPortraits])

  const handleOpenCreate = () => {
    setFormState({ open: true, loading: false, value: '', editingId: undefined })
  }

  const handleOpenEdit = (item: SvcUserPortraitListItem) => {
    setFormState({ open: true, loading: false, value: item.content || '', editingId: item.id })
  }

  const handleCloseForm = () => {
    setFormState((prev) => ({ ...prev, open: false, loading: false }))
  }

  const handleSavePortrait = async () => {
    const content = formState.value.trim()
    if (!content) {
      Message.error('画像内容不能为空')
      return
    }

    setFormState((prev) => ({ ...prev, loading: true }))
    try {
      if (formState.editingId) {
        await putUserPortrait({ userId, portraitId: formState.editingId }, { content })
        Message.success('画像更新成功')
      } else {
        await postUserPortrait({ userId }, { content })
        Message.success('画像创建成功')
      }
      handleCloseForm()
      fetchPortraits()
    } catch (error) {
      console.error('保存用户画像失败:', error)
      Message.error('保存失败，请稍后重试')
      setFormState((prev) => ({ ...prev, loading: false }))
    }
  }

  const handleDeletePortrait = (item: SvcUserPortraitListItem) => {
    Modal.confirm({
      title: '确定删除该用户画像吗？',
      content: '',
      onOk: async () => {
        try {
          await deleteUserPortrait({ userId, portraitId: item.id! })
          Message.success('删除成功')
          setPortraits((prev) => prev.filter((portrait) => portrait.id !== item.id))
        } catch (error) {
          console.error('删除用户画像失败:', error)
          Message.error('删除失败，请稍后重试')
        }
      },
    })
  }

  const renderContent = () => {
    if (loading) {
      return (
        <Stack direction='row' alignItems='center' justifyContent='center' sx={{ py: 6 }}>
          <CircularProgress size={24} />
        </Stack>
      )
    }

    if (!portraits.length) {
      return (
        <Typography variant='body2' color='text.secondary' sx={{ fontSize: 13, lineHeight: 1.6 }}>
          暂未添加用户画像
        </Typography>
      )
    }

    return (
      <Stack spacing={1.5}>
        {portraits.map((item, index) => (
          <Box
            key={item.id}
            sx={{
              position: 'relative',
              pb: 2,
              borderBottom: index === portraits.length - 1 ? 'none' : '1px solid rgba(148, 163, 184, 0.25)',
            }}
            className='portrait-item'
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'nowrap',
              }}
            >
              <Typography
                variant='body2'
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontSize: 13,
                  color: '#1f2937',
                  lineHeight: 1.6,
                  flexGrow: 1,
                  minWidth: 0,
                }}
              >
                {item.content}
              </Typography>
              {canManage && (
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{
                    opacity: 0,
                    pointerEvents: 'none',
                    transition: 'opacity 0.2s ease',
                    '.portrait-item:hover &': {
                      opacity: 1,
                      pointerEvents: 'auto',
                    },
                    flexShrink: 0,
                  }}
                >
                  <IconButton
                    size='small'
                    sx={{
                      bgcolor: 'transparent',
                      color: '#0f172a',
                      '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.15)' },
                    }}
                    onClick={() => handleOpenEdit(item)}
                  >
                    <EditOutlinedIcon fontSize='inherit' />
                  </IconButton>
                  <IconButton
                    size='small'
                    sx={{
                      bgcolor: 'transparent',
                      color: '#ef4444',
                      '&:hover': { bgcolor: 'rgba(248, 113, 113, 0.15)' },
                    }}
                    onClick={() => handleDeletePortrait(item)}
                  >
                    <DeleteOutlineIcon fontSize='inherit' />
                  </IconButton>
                </Stack>
              )}
            </Box>
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mt: 1.5 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                  bgcolor: '#f1f5f9',
                  color: '#475569',
                  fontSize: 12,
                }}
              >
                {item.username || '系统管理员'}
              </Box>
              {item.created_at ? (
                <Typography variant='caption' sx={{ fontSize: 12, color: '#6b7280' }}>
                  <TimeDisplay timestamp={item.created_at} />
                </Typography>
              ) : null}
            </Stack>
          </Box>
        ))}
      </Stack>
    )
  }

  return (
    <Card
      sx={{
        width: '100%',
        p: { xs: 2, lg: 3 },
        borderRadius: 1,
        border: (theme) => `1px solid ${theme.palette.mode === 'light' ? '#EAECF0' : '#393939'}`,
        boxShadow: 'none',
        bgcolor: '#ffffff',
      }}
    >
      <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 2.5, pb: 1.5, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
        <Typography variant='subtitle1' fontWeight={600} sx={{ color: '#111827' }}>
          用户画像
        </Typography>
        {canManage ? (
          <IconButton
            size='small'
            sx={{
              color: 'primary.main',
              '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.12)' },
            }}
            onClick={handleOpenCreate}
            aria-label='添加用户画像'
          >
            <AddIcon fontSize='inherit' />
          </IconButton>
        ) : null}
      </Stack>
      {renderContent()}

      <Dialog open={formState.open} onClose={handleCloseForm} fullWidth maxWidth='sm'>
        <DialogTitle>{formState.editingId ? '编辑用户画像' : '添加用户画像'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            value={formState.value}
            onChange={(event) => setFormState((prev) => ({ ...prev, value: event.target.value }))}
            placeholder='可输入用户画像信息备注等'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm} disabled={formState.loading}>
            取消
          </Button>
          <Button onClick={handleSavePortrait} variant='contained' disabled={formState.loading}>
            {formState.loading ? <CircularProgress size={20} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
