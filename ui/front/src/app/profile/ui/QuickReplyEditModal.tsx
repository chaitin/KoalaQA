'use client'

import { ModelUserQuickReply, putUserQuickReplyQuickReplyId } from '@/api'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
} from '@mui/material'
import { useState, useEffect } from 'react'

interface QuickReplyEditModalProps {
  open: boolean
  onClose: () => void
  onSave: (name: string, content: string) => void
  editingItem?: ModelUserQuickReply | null
}

export default function QuickReplyEditModal({
  open,
  onClose,
  onSave,
  editingItem,
}: QuickReplyEditModalProps) {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [nameError, setNameError] = useState('')
  const [contentError, setContentError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setName(editingItem.name || '')
        setContent(editingItem.content || '')
      } else {
        setName('')
        setContent('')
      }
      setNameError('')
      setContentError('')
    }
  }, [open, editingItem])

  const handleValidate = (): boolean => {
    let hasError = false

    if (!name.trim()) {
      setNameError('标题不能为空')
      hasError = true
    } else if (name.length > 10) {
      setNameError('标题不能超过10个字')
      hasError = true
    } else {
      setNameError('')
    }

    if (!content.trim()) {
      setContentError('内容不能为空')
      hasError = true
    } else {
      setContentError('')
    }

    return !hasError
  }

  const handleSave = async () => {
    if (!handleValidate()) {
      return
    }

    setSaving(true)
    try {
      await onSave(name, content)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>
        {editingItem ? '编辑快捷回复' : '创建快捷回复'}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Stack direction='row' alignItems='center' sx={{ mb: 1 }}>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                标题
              </Typography>
              <Typography variant='caption' sx={{ color: '#ff4d4f', ml: 0.5 }}>
                *
              </Typography>
            </Stack>
            <TextField
              fullWidth
              size='small'
              placeholder='输入标题（不超过10个字）'
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (e.target.value) {
                  setNameError('')
                }
              }}
              error={!!nameError}
              helperText={nameError}
              inputProps={{ maxLength: 10 }}
            />
          </Box>

          <Box>
            <Stack direction='row' alignItems='center' sx={{ mb: 1 }}>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                内容
              </Typography>
              <Typography variant='caption' sx={{ color: '#ff4d4f', ml: 0.5 }}>
                *
              </Typography>
            </Stack>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder='输入快捷回复内容'
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                if (e.target.value) {
                  setContentError('')
                }
              }}
              error={!!contentError}
              helperText={contentError}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          取消
        </Button>
        <Button variant='contained' onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
