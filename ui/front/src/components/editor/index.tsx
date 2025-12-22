'use client'

import { Box } from '@mui/material'
import dynamic from 'next/dynamic'
import { forwardRef } from 'react'

// 动态导入编辑器组件，禁用 SSR 以避免服务器端加载 jsdom
const EditorWrapInternal = dynamic(
  () => import('./EditorWrapInternal'),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        加载编辑器...
      </Box>
    ),
  }
)

interface WrapProps {
  aiWriting?: boolean
  value?: string
  placeholder?: string
  readonly?: boolean
  mode?: 'advanced' | 'simple'
  onChange?: (value: string) => void
  onTocUpdate?: ((toc: any) => void) | boolean
}

export interface EditorWrapRef {
  getContent: () => string
  getHTML: () => string
  getText: () => string
  resetContent: () => void
  setReadonly: (readonly: boolean) => void
  setContent: (content: string) => void
}

// 包装组件，转发 ref
const EditorWrap = forwardRef<EditorWrapRef, WrapProps>(
  (props, ref) => {
    return <EditorWrapInternal {...props} ref={ref} />
  }
)

EditorWrap.displayName = 'EditorWrap'

export default EditorWrap
