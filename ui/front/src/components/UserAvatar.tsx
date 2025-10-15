'use client'

import React, { useState, useEffect } from 'react'
import { Avatar, AvatarProps, Skeleton, Box } from '@mui/material'
import { ModelUserInfo } from '@/api/types'

interface UserAvatarProps extends Omit<AvatarProps, 'src'> {
  user?: ModelUserInfo
  fallbackSrc?: string
  showSkeleton?: boolean
}

/**
 * 支持SSR的用户头像组件
 * 解决头像在服务端渲染时无法正常显示的问题
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  fallbackSrc = '/logo.png',
  showSkeleton = true,
  sx,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // 检测组件是否已挂载（客户端）
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 获取头像URL
  const getAvatarSrc = () => {
    if (!user?.avatar) {
      return fallbackSrc
    }

    // 如果是相对路径，确保以/开头
    if (user.avatar.startsWith('/')) {
      return user.avatar
    }

    // 如果是完整URL，直接返回
    if (user.avatar.startsWith('http')) {
      return user.avatar
    }

    // 其他情况，添加/前缀
    return `/${user.avatar}`
  }

  const avatarSrc = getAvatarSrc()
  const shouldShowSkeleton = showSkeleton && isLoading && !isMounted
  const handleImageLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  // 在SSR阶段或加载中显示骨架屏
  if (shouldShowSkeleton) {
    return (
      <Skeleton
        variant='rounded'
        width={40}
        height={40}
        sx={{
          ...sx,
          borderRadius: '50%',
        }}
      />
    )
  }

  return (
    <Box sx={{ position: 'relative', ...sx }}>
      <Avatar
        src={hasError ? fallbackSrc : avatarSrc}
        onLoad={handleImageLoad}
        onError={handleImageError}
        sx={{
          ...sx,
          '& img': {
            objectFit: 'contain!important',
          },
          // 确保头像在加载失败时有默认样式
          backgroundColor: hasError ? 'grey.300' : undefined,
        }}
        {...props}
      />
    </Box>
  )
}

export default UserAvatar
