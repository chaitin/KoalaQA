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

    const avatar = user.avatar.trim()

    // 如果是完整URL，直接返回
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar
    }

    // 如果是相对路径（以/开头），优先使用环境变量构建完整URL
    if (avatar.startsWith('/')) {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      
      // 如果有环境变量，使用环境变量构建完整URL
      if (baseUrl) {
        return `${baseUrl}${avatar}`;
      }
      
      // 如果没有环境变量，直接返回相对路径让Next.js处理
      // 这样可以避免服务器端和客户端的URL不一致
      return avatar;
    }

    // 其他情况，添加/前缀并构建完整URL
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    // 如果有环境变量，使用环境变量构建完整URL
    if (baseUrl) {
      return `${baseUrl}/${avatar}`;
    }
    
    // 如果没有环境变量，添加/前缀后返回
    return `/${avatar}`;
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
        src={avatarSrc}
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
