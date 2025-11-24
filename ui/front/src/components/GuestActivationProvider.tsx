'use client'

import { postUserReviewGuest, getUserLoginMethod } from '@/api'
import Message from './alert'
import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { useRequest } from 'ahooks'

interface GuestActivationContextType {
  openModal: () => void
}

const GuestActivationContext = createContext<GuestActivationContextType | null>(null)

export const useGuestActivation = () => {
  const context = useContext(GuestActivationContext)
  if (!context) {
    throw new Error('useGuestActivation must be used within GuestActivationProvider')
  }
  return context
}

const GuestActivationProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 获取登录配置以获取prompt
  const { data: loginConfig } = useRequest(getUserLoginMethod, {
    manual: false,
  })

  const handleClose = useCallback(() => {
    setOpen(false)
    setReason('')
    setError('')
  }, [])

  const openModal = useCallback(() => {
    setOpen(true)
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('请填写申请理由')
      return
    }

    try {
      setSubmitting(true)
      await postUserReviewGuest({ reason: trimmed })
      Message.success('申请已提交，请等待审核')
      handleClose()
    } catch (err) {
      Message.error('请勿重复提交申请')
    } finally {
      setSubmitting(false)
    }
  }, [reason, handleClose])

  const contextValue = useMemo(
    () => ({
      openModal,
    }),
    [openModal],
  )

  return (
    <GuestActivationContext.Provider value={contextValue}>
      {children}
      <Dialog open={open} onClose={handleClose} maxWidth='xs' fullWidth>
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: 18,
            color: 'text.primary',
          }}
        >
          激活账号
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ fontSize: '14px' }}>
            <Tooltip title={loginConfig?.prompt || '您的账号尚未激活，请填写申请理由并提交，我们会尽快处理。'}>
              <Typography
                color='text.secondary'
                fontSize={14}
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {loginConfig?.prompt || '您的账号尚未激活，请填写申请理由并提交，我们会尽快处理。'}
              </Typography>
            </Tooltip>
            <Box>
              <TextField
                multiline
                minRows={4}
                maxRows={8}
                placeholder='申请理由'
                fullWidth
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  if (error) {
                    setError('')
                  }
                }}
                error={!!error}
                helperText={error}
              />
            </Box>
            <Button variant='contained' onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : '提交申请'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </GuestActivationContext.Provider>
  )
}

export default GuestActivationProvider
