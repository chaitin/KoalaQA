import React, { type FC } from 'react'

import ErrorIcon from '@mui/icons-material/Error'
import { Box } from '@mui/material'

import Modal, { type ModalProps } from './Modal'

export interface ConfirmDialogProps extends Omit<ModalProps, 'content'> {
  content?: React.ReactNode
  icon?: React.ReactNode
}

const ConfirmDialog: FC<ConfirmDialogProps> = (props) => {
  const { title = '提示', content, width = 480, icon, ...rest } = props
  return (
    <Modal
      title={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            lineHeight: '22px',
            color: 'text.main',
            fontWeight: 500,
          }}
        >
          {icon ? icon : <ErrorIcon sx={{ color: '#FFBF00', mr: '16px', fontSize: '24px' }} />}

          {title}
        </Box>
      }
      closable={false}
      keyboard={false}
      width={width}
      {...rest}
    >
      {content && <Box sx={{ color: 'text.secondary', pl: '40px', fontSize: '14px' }}>{content}</Box>}
    </Modal>
  )
}

export default ConfirmDialog
