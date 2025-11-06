'use client'
import { postUserLogout } from '@/api'
import { clearAuthData } from '@/api/httpClient'
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack } from '@mui/material'
import { useLocalStorageState } from 'ahooks'
import { useRouter } from 'next/navigation'
import { useContext } from 'react'
import { AuthContext } from '../authProvider'
import Icon from '../icon'
import UserAvatar from '../UserAvatar'
import { IdCard, IdInfo, InfoCard } from './components'

export const OPT_LIST = [
  {
    name: '个人中心',
    icon: 'icon-iconfontgerenzhongxin',
    link: '/profile',
  },
]
const ProfilePanel = () => {
  const [, setToken] = useLocalStorageState<string>('auth_token')
  const { user } = useContext(AuthContext)
  const router = useRouter()

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
      setToken('')
      router.push('/login')
    } catch (error) {
      console.error('Failed to clear auth data:', error)
      // 即使清理失败，也要重定向到登录页
      setToken('')
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
        {OPT_LIST.map((item) => {
          return (
            <ListItem
              key={item.name}
              disablePadding
              sx={{
                height: 40,
                borderRadius: '4px',
                marginBottom: '4px',
                transition: 'background 0.3s',
                '&:hover': {
                  background: 'rgba(32,108,255,0.1)',
                },
              }}
              onClick={() => {
                router.push(item.link)
              }}
            >
              <ListItemButton
                sx={{
                  '&:hover': {
                    background: 'transparent',
                  },
                }}
                dense
              >
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <Icon type={item.icon} sx={{ fontSize: 16 }} />
                </ListItemIcon>
                <ListItemText sx={{ color: '#000' }} primary={item.name} />
              </ListItemButton>
            </ListItem>
          )
        })}
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
            onClick={handleLogout}
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
