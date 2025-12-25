'use client'

import { createAppTheme } from '@/theme'
import { ThemeProvider } from '@mui/material/styles'
import { useMemo } from 'react'

interface ThemeProviderWrapperProps {
  primaryColor?: string
  children: React.ReactNode
}

/**
 * 主题提供者包装组件
 * 根据传入的主题色动态创建主题
 */
export default function ThemeProviderWrapper({
  primaryColor,
  children,
}: ThemeProviderWrapperProps) {
  // 使用 useMemo 缓存主题，只有当 primaryColor 变化时才重新创建
  const theme = useMemo(() => {
    return createAppTheme(primaryColor)
  }, [primaryColor])

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

