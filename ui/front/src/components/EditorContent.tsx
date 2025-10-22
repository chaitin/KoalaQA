'use client'
import React, { useState } from 'react'
import { SxProps } from '@mui/material/styles'
import { Box, Dialog, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import SyntaxHighlighter from 'react-syntax-highlighter'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { anOldHope } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { extractTextFromHTML, truncateText } from '@/utils/stringUtils'
import { Editor, TocList, useTiptap } from '@ctzhian/tiptap'

// 扩展props接口，添加truncate选项
export interface MarkDownProps {
  title?: string
  content?: string
  sx?: SxProps
  truncateLength?: number // 添加截断长度选项，0表示不截断
}

const EditorContent: React.FC<MarkDownProps> = (props) => {
  const { content = '', sx, truncateLength = 0 } = props
  const [loading, setLoading] = useState(true)
  const editorRef = useTiptap({
    content: content || '',
    editable: false,
    immediatelyRender: false,
    onBeforeCreate: () => {
      setLoading(true)
    },
    onCreate: ({ editor }) => {
      setLoading(false)
    },
  })
  return (
    <Box
      className='editor-container'
      sx={{
        mt: 6,
        '.tiptap.ProseMirror': {
          '.tableWrapper': {
            transition: 'width 0.3s ease-in-out',
            width: '100%',
            overflowX: 'auto',
          },
        },
      }}
    >
      {editorRef.editor && <Editor editor={editorRef.editor} />}
    </Box>
  )
}

export default EditorContent
