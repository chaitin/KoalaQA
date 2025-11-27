'use client'
import React from 'react'
import { SxProps } from '@mui/material/styles'
import { Box } from '@mui/material'
import { extractTextFromMarkdown } from '@/utils/stringUtils'

export interface MarkDownProps {
  title?: string
  content?: string
  sx?: SxProps
  truncateLength?: number // 已废弃，始终只显示一行
}

const MarkDown: React.FC<MarkDownProps> = (props) => {
  const { content = '', sx } = props

  // 提取纯文本用于单行显示
  const plainText = extractTextFromMarkdown(content)
  if (!plainText) return null
  return (
    <Box
      sx={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...sx,
      }}
      className='markdown-body'
      id='markdown-body'
    >
      {plainText}
    </Box>
  )
}

export default MarkDown
