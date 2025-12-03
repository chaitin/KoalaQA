'use client'

import { ModelUserQuickReply, putUserQuickReplyQuickReplyId } from '@/api'
import EditorWrap from '@/components/editor'
import Modal from '@/components/modal'
import { Button, TextField, Stack, Box } from '@mui/material'
import { useState, useEffect } from 'react'

interface QuickReplyEditModalProps {
  open: boolean
  onClose: () => void
  onSave: (name: string, content: string) => void
  editingItem?: ModelUserQuickReply | null
}

export default function QuickReplyEditModal({ open, onClose, onSave, editingItem }: QuickReplyEditModalProps) {
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
    <Modal
      onCancel={handleClose}
      onOk={handleSave}
      okText='保存'
      open={open}
      onClose={handleClose}
      width='md'
      title={editingItem ? '编辑快捷回复' : '创建快捷回复'}
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField
          fullWidth
          label='标题'
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
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, minHeight: 200 }}>
          <EditorWrap
            placeholder='输入快捷回复内容'
            value={content}
            onChange={(e) => {
              setContent(e)
            }}
          />
        </Box>
      </Stack>
    </Modal>
  )
}
