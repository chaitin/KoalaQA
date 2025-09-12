"use client";
import React from 'react'
import Modal from '@/components/Modal2'
import { FormControlLabel, Checkbox, Stack } from '@mui/material'

interface PdfModalProps {
  open: boolean
  onCancel: () => void
  onOk: () => void
  onAgree: (v: boolean) => void
  isRead: boolean
}

const PdfModal: React.FC<PdfModalProps> = ({ open, onCancel, onOk, isRead, onAgree }) => {
  return (
    <Modal
      open={open}
      title='推广大使协议'
      width='1250px'
      cancelText='不同意'
      okText='同意并继续'
      sx={{
        '.MuiDialog-paper': {
          maxWidth: '100vw',
        },
      }}
      onCancel={onCancel}
      onOk={onOk}
    >
      <iframe src='/console/promotion-agreement.pdf' style={{ width: '100%', height: '70vh', border: 'none' }}></iframe>
    </Modal>
  )
}

export default PdfModal
