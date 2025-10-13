'use client'
import { Stack } from '@mui/material'
import { useEffect, useState } from 'react'

const Footer = () => {
  const [showFooter, setShowFooter] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // 当滚动到页面底部附近时显示 footer
      if (scrollTop + windowHeight >= documentHeight - 100) {
        setShowFooter(true)
      } else {
        setShowFooter(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogoClick = () => {
    window.open('https://koalaqa.docs.baizhi.cloud', '_blank')
  }

  return (
    <Stack
      direction='row'
      justifyContent='center'
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'background.footer',
        maxWidth: '100%',
        minWidth: 0,
        zIndex: 2,
        height: 40,
        opacity: showFooter ? 1 : 0,
        visibility: showFooter ? 'visible' : 'hidden',
        transition: 'opacity 0.3s ease, visibility 0.3s ease',
      }}
    >
      <Stack
        direction={'row'}
        alignItems={'center'}
        sx={{
          fontSize: '14px',
          lineHeight: '40px',
          color: 'rgba(255, 255, 255, 0.30)',
          cursor: 'pointer',
        }}
        onClick={handleLogoClick}
        gap={0.5}
      >
        本网站由
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={'/inverse_logo-text.png'} 
          alt='KoalaQA' 
          width={70} 
          height={12}
          style={{ 
            filter: 'brightness(0.3)',
            transition: 'filter 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(0.3)'
          }}
        />
         提供技术支持
      </Stack>
    </Stack>
  )
}

export default Footer
