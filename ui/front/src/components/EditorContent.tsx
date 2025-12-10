'use client'
import { useTiptap } from '@ctzhian/tiptap'
import { Box, Skeleton } from '@mui/material'
import { SxProps } from '@mui/material/styles'
import React, { useEffect, useState } from 'react'
import { Editor } from '@ctzhian/tiptap'

// 扩展 useTiptap 选项类型，添加 tableOfContentsOptions
interface ExtendedTiptapOptions {
  tableOfContentsOptions?: {
    scrollParent?: () => HTMLElement | null
  }
}

// 扩展props接口，添加truncate选项
export interface MarkDownProps {
  title?: string
  content?: string
  sx?: SxProps
  truncateLength?: number // 添加截断长度选项，0表示不截断
  onTocUpdate?: ((toc: any) => void) | boolean // 可选，默认false；true表示仅启用广播
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
  const { content = '', sx, onTocUpdate } = props
  const [isMounted, setIsMounted] = useState(false)
  const [hasError, setHasError] = useState(false)

  // 初始化编辑器，使用空内容避免初始化时的错误
  const editorRef = useTiptap({
    content: '',
    editable: false,
    contentType: 'markdown',
    immediatelyRender: false,
    tableOfContentsOptions: {
      scrollParent: () => document.getElementById('main-content'),
    },
    onTocUpdate: !!onTocUpdate
      ? (toc: any) => {
          try {
            if (typeof onTocUpdate === 'function') {
              onTocUpdate(toc)
            }
          } catch {}
          try {
            if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
              if (Array.isArray(toc) && toc.length > 0) {
                ;(window as any).__lastToc = toc
              }
              window.dispatchEvent(new CustomEvent('toc-update', { detail: toc } as any))
            }
          } catch {}
        }
      : undefined,
  } as Parameters<typeof useTiptap>[0] & ExtendedTiptapOptions)

  // 当内容变化时，安全地更新编辑器内容
  useEffect(() => {
    if (!editorRef?.editor || !isMounted || hasError) return
    
    try {
      // 验证内容是否有效
      const safeContent = content || ''
      if (safeContent && editorRef.editor) {
        // 使用 try-catch 包装 setContent，捕获可能的 schema 验证错误
        try {
          editorRef.editor.commands.setContent(safeContent, {
            contentType: 'markdown',
          } as any)
        } catch (contentError: any) {
          // 如果内容无效，尝试清理并设置空内容，然后重试
          console.warn('设置内容时遇到错误，尝试清理后重试:', contentError)
          try {
            // 先清空内容
            editorRef.editor.commands.clearContent()
            // 然后重新设置
            editorRef.editor.commands.setContent(safeContent, {
              contentType: 'markdown',
            } as any)
          } catch (retryError) {
            console.error('重试设置编辑器内容仍然失败:', retryError)
            setHasError(true)
            // 如果仍然失败，至少确保编辑器处于有效状态
            editorRef.editor.commands.clearContent()
          }
        }
      }
    } catch (error) {
      console.error('更新编辑器内容失败:', error)
      setHasError(true)
    }
  }, [content, isMounted, hasError, editorRef])

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

  if (!content) return null

  // 如果发生错误，显示错误提示或降级显示
  if (hasError || !editorRef?.editor) {
    return (
      <Box
        sx={{
          width: '100%',
          padding: 2,
          color: 'error.main',
          ...sx,
        }}
      >
        内容加载失败，请刷新页面重试
      </Box>
    )
  }

  return (
    <Box
      className='editor-container'
      sx={{
        width: '100%',
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
