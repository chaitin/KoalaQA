'use client'
import { Box, Skeleton } from '@mui/material'
import { SxProps } from '@mui/material/styles'
import dynamic from 'next/dynamic'
import React from 'react'

// 扩展props接口，添加truncate选项
export interface MarkDownProps {
  title?: string
  content?: string
  sx?: SxProps
  truncateLength?: number // 添加截断长度选项，0表示不截断
  onTocUpdate?: boolean // 可选，默认false；true表示仅启用广播
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

// 动态导入编辑器内容组件，禁用 SSR 以避免服务器端加载 jsdom
const EditorContentInternal = dynamic(
  () => import('./EditorContentInternal'),
  {
    ssr: false,
    loading: () => <ContentSkeleton />,
  }
)

const EditorContent: React.FC<MarkDownProps> = (props) => {
  return <EditorContentInternal {...props} />
}

export default EditorContent
