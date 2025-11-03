'use client'

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Alert } from '@mui/material'
import { useState } from 'react'
import { putUser } from '@/api'

interface BindEmailModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function BindEmailModal({ open, onClose, onSuccess }: BindEmailModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    if (loading) return
    setEmail('')
    setError('')
    onClose()
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async () => {
    setError('')

    // 验证输入
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }

    if (!validateEmail(email.trim())) {
      setError('请输入有效的邮箱地址')
      return
    }

    setLoading(true)
    try {
      await putUser({
        email: email.trim(),
      })

      onSuccess?.()
      handleClose()
    } catch (error: any) {
      if(error.includes('email already used')){
        setError('该邮箱已被使用，请使用其他邮箱')
      }else{
        setError('绑定邮箱失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>绑定邮箱</DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label='邮箱地址'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            disabled={loading}
            placeholder='请输入您的邮箱地址'
            helperText='绑定后可用于找回密码和接收通知'
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading} color='inherit'>
          取消
        </Button>
        <Button onClick={handleSubmit} variant='contained' disabled={loading}>
          {loading ? '绑定中...' : '确认绑定'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
