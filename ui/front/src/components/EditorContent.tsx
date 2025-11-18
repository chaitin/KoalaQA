'use client'
import { useTiptap } from '@ctzhian/tiptap'
import { Box, Skeleton } from '@mui/material'
import { SxProps } from '@mui/material/styles'
import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// 使用动态导入来避免 HMR 问题
const Editor = dynamic(
  () => import('@ctzhian/tiptap').then((mod) => ({ default: mod.Editor })),
  {
    ssr: false,
    loading: () => null,
  }
)

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
  const { content = '', sx, truncateLength = 0, onTocUpdate } = props
  const [isMounted, setIsMounted] = useState(false)

  const isHTML = /<[^>]+>/.test(content)

  const stripHtml = (input: string) =>
    input
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  const stripMarkdown = (input: string) =>
    input
      // images/links
      .replace(/!\[[^\]]*\]\([^\)]*\)/g, '')
      .replace(/\[[^\]]*\]\([^\)]*\)/g, '$1')
      // headings/emphasis/code
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
      .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
      // blockquotes/lists
      .replace(/^>\s?/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      // tables fences
      .replace(/\|/g, ' ')
      .replace(/^---+$/gm, '')

  const needTruncate = truncateLength > 0
  const plainText = isHTML ? stripHtml(content) : stripMarkdown(content)
  const truncatedText = needTruncate
    ? (plainText || '').slice(0, truncateLength).trim() + ((plainText || '').length > truncateLength ? '…' : '')
    : content

  const displayContent = truncatedText
  const editorRef = useTiptap({
    content: content || '',
    editable: false,
    contentType: 'markdown',
    immediatelyRender: false,
    // 大纲更新回调：透传给父级，同时广播全局事件供兄弟侧栏使用
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
  })
  // }, [content, displayContent, editorRef, needTruncate, isHTML])
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

  if (!displayContent || !content) return null

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
