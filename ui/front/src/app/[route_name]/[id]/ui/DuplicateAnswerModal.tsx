import Modal from '@/components/modal'
import { Button, Stack, Typography } from '@mui/material'
import React from 'react'

interface DuplicateAnswerModalProps {
  open: boolean
  onCancel: () => void
  onEditExisting: () => void
}

const DuplicateAnswerModal: React.FC<DuplicateAnswerModalProps> = ({ open, onCancel, onEditExisting }) => {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onClose={onCancel}
      title='提示'
      width={480}
      footer={null}
      showCancel={false}
    >
      <Stack spacing={3} sx={{ py: 2 }}>
        <Typography sx={{ fontSize: '0.875rem', color: 'text.primary', lineHeight: 1.6 }}>
          你已经回答过这个问题了。如需补充或修改，请编辑原有回答，避免重复创建新答案。
        </Typography>
        <Stack direction='row' spacing={2} justifyContent='flex-end'>
          <Button
            onClick={onCancel}
            sx={{
              textTransform: 'none',
              color: '#6b7280',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={onEditExisting}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              px: 2,
            }}
          >
            编辑原有回答
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}

export default DuplicateAnswerModal

