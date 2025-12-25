'use client'
import { Stack, Box, Paper } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

interface BrandAttributionProps {
  /**
   * 是否在侧边栏中使用（会智能定位）
   */
  inSidebar?: boolean
  /**
   * 侧边栏容器的 ref（用于计算是否需要固定）
   */
  sidebarRef?: React.RefObject<HTMLElement>
}

const BrandAttribution = ({ inSidebar = false, sidebarRef }: BrandAttributionProps) => {
  const [isFixed, setIsFixed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleLogoClick = () => {
    window.open('https://koalaqa.docs.baizhi.cloud', '_blank')
  }

  // 智能定位逻辑：当侧边栏内容太高时，固定在底部
  useEffect(() => {
    if (!inSidebar || !sidebarRef?.current || !containerRef.current) return

    const checkPosition = () => {
      const sidebar = sidebarRef.current
      const container = containerRef.current
      if (!sidebar || !container) return

      const sidebarScrollHeight = sidebar.scrollHeight
      const sidebarClientHeight = sidebar.clientHeight

      // 如果内容高度超过可见高度，说明可以滚动，此时固定品牌声明在底部
      if (sidebarScrollHeight > sidebarClientHeight) {
        setIsFixed(true)
      } else {
        setIsFixed(false)
      }
    }

    const sidebar = sidebarRef.current
    // 使用 setTimeout 确保 DOM 已完全渲染
    const timeoutId = setTimeout(checkPosition, 0)
    sidebar.addEventListener('scroll', checkPosition)
    window.addEventListener('resize', checkPosition)

    return () => {
      clearTimeout(timeoutId)
      sidebar.removeEventListener('scroll', checkPosition)
      window.removeEventListener('resize', checkPosition)
    }
  }, [inSidebar, sidebarRef])

  const content = (
    <Stack
      direction={'row'}
      alignItems={'center'}
      onClick={handleLogoClick}
      sx={{
        fontSize: '12px',
        lineHeight: '16px',
        color: 'rgba(0, 0, 0, 0.45)',
        cursor: 'pointer',
        padding: '8px 12px',
        pl: 0,
        borderRadius: '4px',
        transition: 'all 0.2s ease',
        '&:hover': {
          color: 'rgba(0, 0, 0, 0.65)',
        },
      }}
      gap={0.5}
    >
      本网站由
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={'/inverse_logo-text.png'}
        alt='KoalaQA'
        width={60}
        height={9}
        style={{
          filter: 'brightness(0.45)',
          transition: 'filter 0.2s ease',
        }}
      />
      提供技术支持
    </Stack>
  )

  // 在侧边栏中使用，支持智能定位
  if (inSidebar) {
    return (
      <Box
        ref={containerRef}
        sx={{
          mt: '10px!important',
          position: isFixed ? 'sticky' : 'relative',
          bottom: isFixed ? 0 : 'auto',
          zIndex: isFixed ? 10 : 'auto',
          alignSelf: 'flex-end',
          width: '100%',
        }}
      >
        {content}
      </Box>
    )
  }

  // 固定定位模式（用于根布局，但我们现在不使用这个模式）
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1000,
        pointerEvents: 'auto',
        display: { xs: 'block', sm: 'block' },
      }}
    >
      <Box
        sx={{
          fontSize: '11px',
          lineHeight: '16px',
          color: 'rgba(255, 255, 255, 0.30)',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(4px)',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            color: 'rgba(255, 255, 255, 0.4)',
          },
        }}
        onClick={handleLogoClick}
      >
        {content}
      </Box>
    </Box>
  )
}

export default BrandAttribution
