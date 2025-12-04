'use client'

import { ModelDiscussionListItem } from '@/api/types'
import { Box, IconButton } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useState, useEffect, useCallback, useRef } from 'react'
import AnnouncementCard from './AnnouncementCard'

interface AnnouncementCarouselProps {
  announcements: ModelDiscussionListItem[]
  routeName: string
}

export default function AnnouncementCarousel({ announcements, routeName }: AnnouncementCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  // 自动轮播（仅在非拖动状态下）
  useEffect(() => {
    if (announcements.length <= 1 || isDragging) return

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length)
    }, 5000) // 每5秒切换一次

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
      }
    }
  }, [announcements.length, isDragging])

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
    }
  }, [])

  // 触摸移动
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return
      e.preventDefault() // 防止页面滚动
      const currentX = e.touches[0].clientX
      const diff = currentX - startX
      
      // translateX 是相对于当前索引的偏移量（像素）
      // 向右滑动（diff > 0）时，translateX 为正
      // 向左滑动（diff < 0）时，translateX 为负
      
      // 边界限制：在第一张时不能向右滑动，在最后一张时不能向左滑动
      let boundedDiff = diff
      if (currentIndex === 0 && diff > 0) {
        // 第一张，限制向右滑动
        boundedDiff = diff * 0.3 // 允许少量滑动，提供视觉反馈
      } else if (currentIndex === announcements.length - 1 && diff < 0) {
        // 最后一张，限制向左滑动
        boundedDiff = diff * 0.3
      }
      
      setTranslateX(boundedDiff)
    },
    [isDragging, startX, currentIndex, announcements.length]
  )

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return

    const threshold = 50 // 滑动阈值（像素）
    const percentageThreshold = 15 // 百分比阈值（屏幕宽度的15%）
    
    // 计算滑动百分比
    const slidePercentage = (Math.abs(translateX) / (typeof window !== 'undefined' ? window.innerWidth : 375)) * 100
    
    if (Math.abs(translateX) > threshold || slidePercentage > percentageThreshold) {
      if (translateX > 0 && currentIndex > 0) {
        // 向右滑动，显示上一个
        setCurrentIndex((prev) => prev - 1)
      } else if (translateX < 0 && currentIndex < announcements.length - 1) {
        // 向左滑动，显示下一个
        setCurrentIndex((prev) => prev + 1)
      }
    }

    setIsDragging(false)
    setTranslateX(0)
  }, [isDragging, translateX, currentIndex, announcements.length])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length)
  }, [announcements.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length)
  }, [announcements.length])

  // 指示器点击
  const handleIndicatorClick = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  if (announcements.length === 0) {
    return null
  }

  // 如果只有一个公告，直接显示，不需要轮播
  if (announcements.length === 1) {
    return <AnnouncementCard announcement={announcements[0]} routeName={routeName} />
  }

  // 卡片之间的间隔（像素）
  const cardGap = 16

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        borderRadius: '6px',
      }}
    >
      {/* 轮播容器 */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          display: 'flex',
          gap: `${cardGap}px`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-in-out',
          // 计算时需要考虑间隔：每个卡片宽度是 100% + gap
          transform: `translateX(calc(-${currentIndex} * (100% + ${cardGap}px) + ${translateX}px))`,
          willChange: 'transform',
          touchAction: 'pan-x', // 允许水平滑动，阻止垂直滚动
          userSelect: 'none', // 防止文本选择
        }}
      >
        {announcements.map((announcement, index) => (
          <Box
            key={announcement.uuid}
            sx={{
              minWidth: '100%',
              width: '100%',
              flexShrink: 0,
            }}
          >
            <AnnouncementCard announcement={announcement} routeName={routeName} />
          </Box>
        ))}
      </Box>

      {/* 左右切换按钮 - 移动端隐藏，桌面端显示 */}
      {announcements.length > 1 && (
        <>
          <IconButton
            onClick={handlePrevious}
            sx={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              zIndex: 2,
              width: { xs: 28, sm: 32 },
              height: { xs: 28, sm: 32 },
              display: { xs: 'none', sm: 'flex' }, // 移动端隐藏，桌面端显示
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 1)',
              },
              '&:active': {
                transform: 'translateY(-50%) scale(0.95)',
              },
            }}
            aria-label="上一个公告"
          >
            <ChevronLeftIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
          </IconButton>

          <IconButton
            onClick={handleNext}
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              zIndex: 2,
              width: { xs: 28, sm: 32 },
              height: { xs: 28, sm: 32 },
              display: { xs: 'none', sm: 'flex' }, // 移动端隐藏，桌面端显示
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 1)',
              },
              '&:active': {
                transform: 'translateY(-50%) scale(0.95)',
              },
            }}
            aria-label="下一个公告"
          >
            <ChevronRightIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
          </IconButton>
        </>
      )}

      {/* 指示器 */}
      {announcements.length > 1 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 1,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {announcements.map((_, index) => (
            <Box
              key={index}
              onClick={() => handleIndicatorClick(index)}
              sx={{
                width: currentIndex === index ? 24 : 8,
                height: 8,
                borderRadius: '4px',
                bgcolor: currentIndex === index ? 'primary.main' : 'rgba(0, 0, 0, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  bgcolor: currentIndex === index ? 'primary.dark' : 'rgba(0, 0, 0, 0.3)',
                },
              }}
              aria-label={`切换到第 ${index + 1} 个公告`}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

