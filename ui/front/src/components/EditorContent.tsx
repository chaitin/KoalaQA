'use client'
import { extractTextFromHTML, truncateText } from '@/utils/stringUtils'
import { Editor, useTiptap } from '@ctzhian/tiptap'
import { Box, Skeleton } from '@mui/material'
import { SxProps } from '@mui/material/styles'
import React, { useEffect, useState } from 'react'

// 扩展props接口，添加truncate选项
export interface MarkDownProps {
  title?: string
  content?: string
  sx?: SxProps
  truncateLength?: number // 添加截断长度选项，0表示不截断
}

// 骨架图组件
const ContentSkeleton: React.FC = () => {
  return (
    <Box sx={{ width: '100%', padding: 2 }}>
      <Skeleton variant='text' width='100%' height={24} sx={{ marginBottom: 1 }} animation='wave' />
      <Skeleton variant='text' width='85%' height={24} sx={{ marginBottom: 1 }} animation='wave' />
      <Skeleton variant='text' width='90%' height={24} animation='wave' />
    </Box>
  )
}

const EditorContent: React.FC<MarkDownProps> = (props) => {
  const { content = '', sx, truncateLength = 0 } = props
  const [isMounted, setIsMounted] = useState(false)
  const displayContent = truncateLength > 0 ? truncateText(extractTextFromHTML(content), truncateLength) : content
  if (!displayContent || !content) return ''
  const editorRef = useTiptap({
    content: displayContent || '',
    editable: false,
    immediatelyRender: false,
  })
  useEffect(() => {
    setIsMounted(true)
  }, [])
  // 在服务端渲染时返回内容预览
  if (!isMounted) {
    return content ? (
      <Box sx={{ ...sx }}>
        <ContentSkeleton />
      </Box>
    ) : (
      ''
    )
  }

  return (
    <Box
      className='editor-container'
      sx={{
        width: '100%',
        '.tiptap.ProseMirror': {
          '.tableWrapper': {
            transition: 'width 0.3s ease-in-out',
            width: '100%',
            overflowX: 'auto',
          },
        },
        '& code': {
          whiteSpace: 'pre-wrap',
        },
        ...sx,
      }}
    >
      <Editor editor={editorRef.editor} />
    </Box>
  )
}

export default EditorContent
