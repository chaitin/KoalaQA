'use client'
import UserAvatar from '@/components/UserAvatar'
import {
  Chip,
  styled
} from '@mui/material'

export const Tag = styled(Chip)({
  borderRadius: '3px',
  height: 22,
  backgroundColor: '#F2F3F5',
})

export const ImgLogo = styled('div')(({ theme: _theme }) => {
  return {
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
    padding: '2px',
    border: '1px solid #eee',
    borderRadius: '4px',
    fontSize: 14,
    lineHeight: 1,
    fontWeight: 600,
    textAlign: 'center',
    backgroundColor: '#fff',
    img: {
      display: 'block',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    },
  }
})


export const Avatar = ({ src, size = 20 }: { src?: string; size: number }) => {
  // 构造用户对象以适配 UserAvatar 组件
  const user = src && src.trim() !== '' ? { avatar: src } : undefined

  return (
    <UserAvatar
      user={user}
      fallbackSrc='/logo.png'
      showSkeleton={false}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        objectPosition: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '50%',
      }}
    />
  )
}
