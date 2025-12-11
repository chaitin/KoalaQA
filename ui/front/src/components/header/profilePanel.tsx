'use client'
import { postUserLogout } from '@/api'
import { clearAuthData } from '@/api/httpClient'
import { ModelUserRole } from '@/api/types'
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useContext } from 'react'
import { AuthContext } from '../authProvider'
import UserAvatar from '../UserAvatar'
import { IdCard, IdInfo, InfoCard } from './components'
import SettingsIcon from '@mui/icons-material/Settings'
import { Icon } from '@ctzhian/ui'
interface ProfilePanelProps {
  onClose?: () => void
  adminHref?: string
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ onClose, adminHref }) => {
  const { user } = useContext(AuthContext)
  const router = useRouter()

  const isAdmin = user?.role === ModelUserRole.UserRoleAdmin

  const handleNavigate = (href?: string) => {
    if (!href) return
    try {
      const url = new URL(href, window.location.href)
      window.location.href = url.toString()
    } catch (error) {
      router.push(href)
    }
  }

  const handleLogout = async () => {
    try {
      // 先调用后端登出API
      await postUserLogout()
    } catch (error) {
      console.warn('Backend logout failed:', error)
      // 即使后端登出失败，也要继续清理本地数据
    }

    try {
      // 使用统一的清除认证信息函数（不调用服务端登出API，因为已经调用过了）
      await clearAuthData(false)
      router.push('/login')
    } catch (error) {
      console.error('Failed to clear auth data:', error)
      // 即使清理失败，也要重定向到登录页
      router.push('/login')
    }
  }

  return (
    <InfoCard>
      <IdCard>
        <IdInfo>
          <UserAvatar user={user} sx={{ width: 40, height: 40 }} />
          <Stack>
            <Box
              sx={{
                fontSize: '14px',
                textOverflow: 'ellipsis',
                maxWidth: '10rem',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                fontWeight: 700,
                color: '#000',
              }}
              title={user?.username}
            >
              {user?.username}
            </Box>
          </Stack>
        </IdInfo>
      </IdCard>

      <Box sx={{ borderBottom: '1px dashed #EEEEEE', my: 2.5 }}></Box>

      <List
        sx={{
          width: '100%',
          maxWidth: 360,
          py: 0,
          bgcolor: 'background.paper',
        }}
      >
        <ListItem
          key={'个人中心'}
          disablePadding
          sx={{
            height: 40,
            borderRadius: '4px',
            marginBottom: '4px',
            transition: 'background 0.3s',
            '&:hover, &:focus': {
              background: 'rgba(0,0,0,0.04)', // 使用灰色
            },
          }}
          onClick={(e) => {
            e.stopPropagation()
            onClose?.()
            router.push('/profile?tab=1')
          }}
        >
          <ListItemButton
            sx={{
              '&:hover, &:focus': {
                background: 'transparent',
              },
            }}
            dense
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              <Icon type='icon-iconfontgerenzhongxin' sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText sx={{ color: '#000' }} primary='个人中心' />
          </ListItemButton>
        </ListItem>

        {isAdmin && adminHref && (
          <ListItem
            disablePadding
            sx={{
              height: 40,
              borderRadius: '4px',
              marginBottom: '4px',
              transition: 'background 0.3s',
              '&:hover, &:focus': {
                background: 'rgba(0,0,0,0.04)', // 使用灰色
              },
            }}
            onClick={(e) => {
              e.stopPropagation()
              onClose?.()
              handleNavigate(adminHref)
            }}
          >
            <ListItemButton
              sx={{
                '&:hover, &:focus': {
                  background: 'transparent',
                },
              }}
              dense
            >
              <ListItemIcon sx={{ minWidth: 34 }}>
                <SettingsIcon sx={{ fontSize: 18, color: 'text.primary' }} />
              </ListItemIcon>
              <ListItemText sx={{ color: '#000' }} primary='后台管理' />
            </ListItemButton>
          </ListItem>
        )}

        <ListItem
          disablePadding
          sx={{
            height: 40,
            borderRadius: '4px',
            marginBottom: '4px',
            transition: 'background 0.3s',
            '&:hover': {
              background: 'rgba(246,78,84,0.06)',
            },
          }}
        >
          <ListItemButton
            onClick={(e) => {
              e.stopPropagation()
              handleLogout()
            }}
            dense
            sx={{
              '&:hover': {
                background: 'transparent',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              <Icon type={'icon-tuichu'} sx={{ fontSize: 16, color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }} primary='退出' />
          </ListItemButton>
        </ListItem>
      </List>
    </InfoCard>
  )
}

export default ProfilePanel
