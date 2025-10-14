'use client'
import { Stack } from '@mui/material'
import { useEffect, useState } from 'react'

const Footer = () => {
  // 作为页面普通内容展示（不固定、不显隐）

  const handleLogoClick = () => {
    window.open('https://koalaqa.docs.baizhi.cloud', '_blank')
  }

  return (
    <Stack
      direction='row'
      justifyContent='center'
      sx={{
        width: '100%',
        bgcolor: 'background.footer',
        height: 32,
        mt: 4,
      }}
    >
      <Stack
        direction={'row'}
        alignItems={'center'}
        sx={{
          fontSize: '12px',
          lineHeight: '32px',
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
          height={10}
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
