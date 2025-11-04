'use client'

import {
  ModelUserInfo,
  ModelUserRole,
  putUser,
} from '@/api'
import { AuthContext } from '@/components/authProvider'
import {
  Box,
  Button,
  Card,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import { useContext, useEffect, useState } from 'react'
import ChangePasswordModal from './ChangePasswordModal'
import BindEmailModal from './BindEmailModal'
import UserAvatar from '@/components/UserAvatar'
import { Message } from '@/components'
import { useSearchParams, usePathname } from 'next/navigation'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import NotificationCenter from './NotificationCenter'

const roleConfig = {
  [ModelUserRole.UserRoleUnknown]: {
    name: '未知',
    description: '',
    color: 'default' as const,
  },
  [ModelUserRole.UserRoleAdmin]: {
    name: '管理员',
    description: '平台管理员，主要负责平台相关的配置，所有功能所有权限',
    color: 'error' as const,
  },
  [ModelUserRole.UserRoleOperator]: {
    name: '客服运营',
    description: '平台内容的运营，主要对平台内容质量和响应速度负责，前台所有权限',
    color: 'primary' as const,
  },
  [ModelUserRole.UserRoleUser]: {
    name: '用户',
    description: '普通用户',
    color: 'default' as const,
  },
  [ModelUserRole.UserRoleMax]: {
    name: '未知',
    description: '',
    color: 'default' as const,
  },
}
interface ProfileContentProps {
  initialUser: ModelUserInfo
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export default function ProfileContent({ initialUser }: ProfileContentProps) {
  const { user, setUser, fetchUser } = useContext(AuthContext)
  const routerWithRouteName = useRouterWithRouteName()
  const router = routerWithRouteName.router
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // 从 URL 参数读取 tab 值，默认为 0
  const initialTabValue = searchParams?.get('tab') ? parseInt(searchParams.get('tab')!, 10) : 0
  const [tabValue, setTabValue] = useState(initialTabValue)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(user?.username || '')
  const [isUploading, setIsUploading] = useState(false)
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false)
  const [bindEmailModalOpen, setBindEmailModalOpen] = useState(false)

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
      setEditName(initialUser.username || '')
    }
  }, [initialUser, setUser])

  // 监听 URL 参数变化，同步 tab 值
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab') ? parseInt(searchParams.get('tab')!, 10) : 0
    setTabValue(tabFromUrl)
  }, [searchParams])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
    // 更新 URL 参数
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (newValue === 0) {
      // 如果回到默认 tab，移除参数
      params.delete('tab')
    } else {
      params.set('tab', newValue.toString())
    }
    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(newUrl)
  }

  const handleSaveName = async () => {
    if (!editName.trim()) return

    try {
      await putUser({ name: editName })
      setUser({ ...user, username: editName })
      setIsEditingName(false)
    } catch (error) {
      console.error('更新用户名失败:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditName(user?.username || '')
    setIsEditingName(false)
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件类型和大小
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB')
      return
    }

    setIsUploading(true)
    try {
      await putUser({ avatar: file })

      // 头像上传成功后，重新获取用户信息以获取最新的头像URL
      await fetchUser()
    } catch (error) {
      console.error('头像上传失败:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleChangePasswordClick = () => {
    // 如果用户没有绑定邮箱，提示先绑定邮箱
    if (!user?.email) {
      Message.warning('请先绑定邮箱后再修改密码')
      setBindEmailModalOpen(true)
      return
    }
    // 如果已绑定邮箱，打开修改密码模态框
    setChangePasswordModalOpen(true)
  }

  return (
    <Container maxWidth='lg'>
      {/* 头部背景区域 */}
      <Card
        sx={{
          backgroundImage: "url('/auth.png')",
          backgroundSize: 'cover',
          color: 'white',
          p: 4,
          mb: 3,
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
          height: 170,
        }}
      >
        <Stack direction='row' spacing={3} alignItems='center' sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ position: 'relative' }}>
            <Box
              sx={{
                borderRadius: '50%',
                width: 100,
                height: 100,
                background: '#fff',
              }}
            >
              <UserAvatar
                user={user}
                sx={{
                  width: 100,
                  height: 100,
                }}
              />
            </Box>
            <IconButton
              component='label'
              sx={{
                position: 'absolute',
                bottom: -5,
                right: -5,
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: '#666',
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: 'white',
                },
              }}
              disabled={isUploading}
            >
              <PhotoCameraIcon fontSize='small' />
              <input type='file' hidden accept='image/*' onChange={handleAvatarUpload} />
            </IconButton>
          </Box>
        </Stack>
      </Card>

      {/* 标签页 */}
      <Card sx={{ borderRadius: 2, boxShadow: 'none' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label='个人中心标签页'>
            <Tab label='基本信息' />
            <Tab label='通知中心' />
          </Tabs>
        </Box>
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={3}>
            {/* 昵称 */}
            <Box>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Typography sx={{ width: 100, color: '#666' }}>昵称</Typography>
                {isEditingName ? (
                  <>
                    <TextField
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      size='small'
                      sx={{ flex: 1, maxWidth: 300 }}
                    />
                    <Button onClick={handleSaveName} variant='contained' size='small'>
                      保存
                    </Button>
                    <Button onClick={handleCancelEdit} variant='text' size='small'>
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    <Typography sx={{ flex: 1 }}>{user?.username || '-'}</Typography>
                    <Button onClick={() => setIsEditingName(true)} size='small' sx={{ minWidth: 60 }}>
                      修改
                    </Button>
                  </>
                )}
              </Stack>
              <Divider sx={{ mt: 2 }} />
            </Box>

            {/* 邮箱 */}
            <Box>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Typography sx={{ width: 100, color: '#666' }}>邮箱</Typography>
                <Typography sx={{ flex: 1 }}>{user?.email || '未绑定'}</Typography>
                {!user?.email ? (
                  <Button size='small' sx={{ minWidth: 60 }} onClick={() => setBindEmailModalOpen(true)}>
                    绑定
                  </Button>
                ) : (
                  <Button
                    size='small'
                    disabled
                    sx={{
                      minWidth: 60,
                      color: '#999',
                    }}
                    title='不支持修改已绑定的邮箱'
                  >
                    修改
                  </Button>
                )}
              </Stack>
              <Divider sx={{ mt: 2 }} />
            </Box>

            {/* 用户角色 */}
            <Box>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Typography sx={{ width: 100, color: '#666' }}>用户角色</Typography>
                <Stack direction='row' spacing={1} alignItems='center' sx={{ flex: 1 }}>
                  <Typography>{roleConfig[user?.role || ModelUserRole.UserRoleUnknown].name}</Typography>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <NotificationCenter />
        </TabPanel>
      </Card>
      <Card sx={{ borderRadius: 2, mt: 3, boxShadow: 'none' }}>
        <TabPanel value={tabValue} index={0}>
          {/* 修改密码 */}
          <Stack direction='row' spacing={2} alignItems='center'>
            <Typography sx={{ width: 100, color: '#666' }}>账号密码</Typography>
            <Typography sx={{ flex: 1, color: '#999' }}>••••••••</Typography>
            {user?.builtin ? (
              <Button
                size='small'
                disabled
                sx={{
                  minWidth: 80,
                  color: '#999',
                }}
                title='内置用户不允许修改密码'
              >
                修改
              </Button>
            ) : (
              <Button onClick={handleChangePasswordClick} size='small' sx={{ minWidth: 80 }}>
                修改
              </Button>
            )}
          </Stack>
        </TabPanel>
      </Card>

      {/* 修改密码模态框 */}
      <ChangePasswordModal
        open={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        onSuccess={() => {
          // 密码修改成功
        }}
        user={user}
      />

      {/* 绑定邮箱模态框 */}
      <BindEmailModal
        open={bindEmailModalOpen}
        onClose={() => setBindEmailModalOpen(false)}
        onSuccess={async () => {
          // 绑定邮箱成功后，重新获取用户信息
          await fetchUser()
        }}
      />
    </Container>
  )
}
