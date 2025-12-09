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

  const editorRef = useTiptap({
    content: content || '',
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
