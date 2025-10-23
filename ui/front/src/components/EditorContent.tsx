'use client'
import { extractTextFromHTML, truncateText } from '@/utils/stringUtils'
import { Editor, useTiptap } from '@ctzhian/tiptap'
import { Box } from '@mui/material'
import { SxProps } from '@mui/material/styles'
import React, { useEffect, useState } from 'react'

// 扩展props接口，添加truncate选项
export interface MarkDownProps {
  title?: string
  content?: string
  sx?: SxProps
  truncateLength?: number // 添加截断长度选项，0表示不截断
}

const EditorContent: React.FC<MarkDownProps> = (props) => {
  const { content = '', sx, truncateLength = 0 } = props
  const [_loading, _setLoading] = useState(true)
  let displayContent = content
  if (truncateLength > 0) {
    const plainText = extractTextFromHTML(content)
    displayContent = truncateText(plainText, truncateLength)
  }
  const editorRef = useTiptap({
    content: displayContent || '',
    editable: false,
    immediatelyRender: false,
    onBeforeCreate: () => {
      _setLoading(true)
    },
    onCreate: ({ editor: _editor }) => {
      _setLoading(false)
    },
  })

  // 监听 content 变化，更新编辑器内容
  useEffect(() => {
    if (editorRef.editor && displayContent !== editorRef.editor.getHTML()) {
      editorRef.editor.commands.setContent(displayContent || '')
    }
  }, [content, displayContent, editorRef.editor])
  return (
    displayContent ? <Box
      className='editor-container'
      sx={{
        '.tiptap.ProseMirror': {
          '.tableWrapper': {
            transition: 'width 0.3s ease-in-out',
            width: '100%',
            overflowX: 'auto',
          },
        },
        ...sx,
      }}
    >
      {editorRef.editor && <Editor editor={editorRef.editor} />}
    </Box> : ''
  )
}

export default EditorContent