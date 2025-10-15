'use client'

import { ModelUserInfo, ModelUserRole, putUser } from '@/api'
import { AuthContext } from '@/components/authProvider'
import { Avatar, Box, Button, Card, Container, Divider, Stack, TextField, Typography, IconButton } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import { useContext, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import ChangePasswordModal from './ChangePasswordModal'
import UserAvatar from '@/components/UserAvatar'

dayjs.locale('zh-cn')

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
  const { user, setUser } = useContext(AuthContext)
  const tabValue = 0
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(user?.username || '')
  const [isUploading, setIsUploading] = useState(false)
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false)

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
      setEditName(initialUser.username || '')
    }
  }, [initialUser, setUser])

  const handleSaveName = async () => {
    if (!editName.trim()) return

    try {
      await putUser({ name: editName })
      setUser({ ...user, username: editName })
      setIsEditingName(false)
    } catch (error) {
      console.error('更新用户名失败:', error)
      alert('更新用户名失败，请重试')
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

      // 创建本地预览URL
      const previewUrl = URL.createObjectURL(file)
      setUser({ ...user, avatar: previewUrl })

      // TODO: 实际项目中应该从API响应中获取新的头像URL
    } catch (error) {
      console.error('头像上传失败:', error)
      alert('头像上传失败，请重试')
    } finally {
      setIsUploading(false)
    }
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
        }}
      >
        <Stack direction='row' spacing={3} alignItems='center' sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ borderRadius: '50%', border: '1px solid rgba(255,255,255,0.6)' }}>
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
        <TabPanel value={tabValue} index={0}>
          {/* 基本信息 */}
          <Typography variant='h6' sx={{ mb: 3, fontWeight: 600 }}>
            基本信息
          </Typography>
          <Divider sx={{ mb: 2 }} />
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
                {/* <Button size='small' disabled sx={{ minWidth: 60 }}>
                  {user?.email ? '修改' : '绑定'}
                </Button> */}
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
              <Button onClick={() => setChangePasswordModalOpen(true)} size='small' sx={{ minWidth: 80 }}>
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
      />
    </Container>
  )
}
