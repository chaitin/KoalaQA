'use client'

import React from 'react'
import { Avatar, AvatarProps } from '@mui/material'

interface CommonAvatarProps extends Omit<AvatarProps, 'src'> {
  src?: string
  name?: string
  defaultSrc?: string
}

/**
 * 通用头像组件
 * 默认使用 '/logo.png' 作为头像
 * 支持传入 src 和 name（用于显示首字母）
 */
export const CommonAvatar: React.FC<CommonAvatarProps> = ({
  src,
  name,
  defaultSrc = '/logo.png',
  sx,
  children,
  ...props
}) => {
  // 获取头像URL，如果 src 为空或无效，使用默认头像
  const avatarSrc = src && src.trim() ? src : defaultSrc

  // 获取首字母，优先使用 children，其次使用 name 的首字母
  const getInitial = () => {
    if (children) return children
    if (name) return name.charAt(0).toUpperCase()
    return undefined
  }

  return (
    <Avatar
      src={avatarSrc}
      sx={{
        '& img': {
          objectFit: 'contain',
          objectPosition: 'center',
        },
        width: 22,
        height: 22,
        fontSize: '14px',
        ...sx,
      }}
      {...props}
    >
      {getInitial()}
    </Avatar>
  )
}

export default CommonAvatar

