'use client'
import { extractTextFromHTML, truncateText } from '@/utils/stringUtils'
import { sanitizeHTML } from '@/lib/utils'
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
  const [isMounted, setIsMounted] = useState(false)
  const [sanitizedContent, setSanitizedContent] = useState<string>('')
  const [displayContent, setDisplayContent] = useState<string>('')
  
  // 异步清理 HTML 内容以防止 XSS 攻击
  useEffect(() => {
    const sanitizeContent = async () => {
      const sanitized = await sanitizeHTML(content)
      setSanitizedContent(sanitized)
      
      let display = sanitized
      if (truncateLength > 0) {
        const plainText = extractTextFromHTML(sanitized)
        display = truncateText(plainText, truncateLength)
      }
      setDisplayContent(display)
    }
    
    sanitizeContent()
  }, [content, truncateLength])

  // 确保只在客户端渲染编辑器
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const editorRef = useTiptap({
    content: displayContent || '',
    editable: false,
    immediatelyRender: false,
    onBeforeCreate: () => {
      _setLoading(true)
    },
    onCreate: ({ editor: _editor }: { editor: any }) => {
      _setLoading(false)
    },
  })

  // 监听 content 变化，更新编辑器内容
  useEffect(() => {
    if (editorRef.editor && displayContent !== editorRef.editor.getHTML()) {
      editorRef.editor.commands.setContent(displayContent || '')
    }
  }, [displayContent, editorRef.editor])

  // 在服务端渲染时返回内容预览
  if (!isMounted) {
    return displayContent ? (
      <Box
        className='editor-container'
        sx={{
          fontSize: '12px!important',
          width: '100%',
          '& code': {
            whiteSpace: 'pre-wrap',
          },
          ...sx,
        }}
        dangerouslySetInnerHTML={{ __html: displayContent }}
      />
    ) : (
      ''
    )
  }

  return displayContent ? (
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
      {editorRef.editor && <Editor editor={editorRef.editor} />}
    </Box>
  ) : (
    ''
  )
}

export default EditorContent
