'use client'

import { Box, Button, Paper, Stack, Typography, useTheme } from '@mui/material'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import { useState } from 'react'
import { Icon } from '@ctzhian/ui'

interface DiscussionAlertProps {
  defaultOpen?: boolean
}

const DiscussionAlert = ({ defaultOpen = false }: DiscussionAlertProps) => {
  const [open, setOpen] = useState(defaultOpen)
  const theme = useTheme()

  if (!open) return null

  return (
    <Stack
      alignItems='center'
      sx={{
        width: 'min(92vw, 350px)',
        bgcolor: '#ffffff',
        position: 'fixed',
        top: 80,
        right: 16,
        left: 'auto',
        bottom: 'auto',
        display: 'flex',
        zIndex: theme.zIndex.modal + 10,
        boxShadow: '0px 10px 20px 0px rgba(0,34,52,0.1)',
        borderRadius: 1,
        textAlign: 'center',
        px: 3,
        py: 2,
        border: '1px solid #f3f4f6',
        pointerEvents: 'auto',
        color: '#21222D',
        lineHeight: '22px',
        fontSize: '14px',
      }}
    >
      <Icon type='icon-tishi' sx={{ fontSize: 38, color: '#f5c542', mb: 1.5 }} />
      <Box>如已有回答解决您的问题</Box>
      <Box>
        请点击
        <Box component='span' sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          「采纳」
        </Box>
        进行标记
      </Box>
      <Box>以便您后续查询并帮助其他用户快速定位答案。</Box>
      <Button
        fullWidth
        variant='contained'
        size='small'
        onClick={() => setOpen(false)}
        sx={{
          mt: 2,
          bgcolor: 'rgba(0, 99, 151, 0.10)',
          color: 'primary.main',
          fontWeight: 600,
          boxShadow: 'none',
          borderRadius: 1.5,
          height: 44,
          '&:hover': {
            bgcolor: '#d9e8f7',
            boxShadow: 'none',
          },
        }}
      >
        我知道了
      </Button>
    </Stack>
  )
}

export default DiscussionAlert
