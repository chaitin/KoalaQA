'use client'

import { getUserUserId, ModelUserInfo, ModelUserRole, putUser } from '@/api'
import { SvcUserStatisticsRes } from '@/api/types'
import { Message } from '@/components'
import { AuthContext } from '@/components/authProvider'
import UserAvatar from '@/components/UserAvatar'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import {
  Box,
  Button,
  Card,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { usePathname, useSearchParams } from 'next/navigation'
import { useContext, useEffect, useMemo, useState } from 'react'
import BindEmailModal from './BindEmailModal'
import ChangePasswordModal from './ChangePasswordModal'
import NotificationCenter from './NotificationCenter'
import ProfileHeroCard from './ProfileHeroCard'
import UserTrendList from './UserTrendList'

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
      {value === index && <Box sx={{ px: 3, pb: 0 }}>{children}</Box>}
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
  const [statistics, setStatistics] = useState<SvcUserStatisticsRes | null>(null)
  const metrics = useMemo(
    () => [
      { label: '问答', value: statistics?.qa_count ?? 0 },
      { label: '文章', value: statistics?.blog_count ?? 0 },
      { label: '回答', value: statistics?.answer_count ?? 0 },
    ],
    [statistics],
  )

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
      setEditName(initialUser.username || '')
    }
  }, [initialUser, setUser])

  useEffect(() => {
    const userId = user?.uid || initialUser?.uid
    if (!userId) return

    let cancelled = false
    ;(async () => {
      try {
        const response = await getUserUserId({ userId })
        if (!cancelled) {
          setStatistics(response)
        }
      } catch (error) {
        console.error('获取用户统计信息失败', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.uid, initialUser?.uid])

  // 监听 URL 参数变化，同步 tab 值
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab') ? parseInt(searchParams.get('tab')!, 10) : 0
    setTabValue(tabFromUrl)
  }, [searchParams])

  const handleTabChange = (_event: React.MouseEvent<HTMLElement>, newValue: string | null) => {
    if (newValue === null) return
    const tabIndex = parseInt(newValue, 10)
    setTabValue(tabIndex)
    // 更新 URL 参数
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (tabIndex === 0) {
      // 如果回到默认 tab，移除参数
      params.delete('tab')
    } else {
      params.set('tab', tabIndex.toString())
    }
    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(newUrl)
  }

  const toggleButtonSx = {
    height: 30,
    fontWeight: 500,
    fontSize: '14px',
    color: '#21222D',
    border: '1px solid transparent',
    '&.Mui-selected': {
      bgcolor: 'rgba(0,99,151,0.06)',
      border: '1px solid rgba(0,99,151,0.1)',
      color: 'primary.main',
      '&.Mui-focusVisible': {
        bgcolor: '#000000',
        color: '#ffffff',
        outline: '2px solid #000000',
        outlineOffset: '2px',
      },
    },
    '&:hover': { bgcolor: '#f3f4f6', color: '#000000' },
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
    <Box sx={{ maxWidth: 748, margin: '0 auto' }}>
      {/* 头部背景区域 */}
      <ProfileHeroCard
        avatar={
          <Box sx={{ position: 'relative' }}>
            <Box
              sx={{
                borderRadius: '50%',
                width: 88,
                height: 88,
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserAvatar
                user={user}
                sx={{
                  width: 96,
                  height: 96,
                }}
              />
            </Box>
            <IconButton
              component='label'
              sx={{
                position: 'absolute',
                bottom: -5,
                right: -5,
                backgroundColor: 'primary.main',
                color: '#fff',
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
        }
        title={user?.username || initialUser?.username || '用户'}
        metrics={metrics}
      />

      {/* 标签页 */}
      <Card sx={{ borderRadius: 2, boxShadow: 'none' }}>
        <Box sx={{ p: 3 }}>
          <ToggleButtonGroup
            value={tabValue.toString()}
            onChange={handleTabChange}
            exclusive
            aria-label='个人中心标签页'
            sx={{
              '& .MuiToggleButtonGroup-grouped': {
                borderRadius: '6px !important',
                mr: 1,
              },
            }}
          >
            <ToggleButton value='0' sx={toggleButtonSx}>
              动态
            </ToggleButton>
            <ToggleButton value='1' sx={toggleButtonSx}>
              基本信息
            </ToggleButton>
            <ToggleButton value='2' sx={toggleButtonSx}>
              通知中心
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {/* 子元素 role=tabpanel 的加个 border */}
        <Box
          sx={{
            '& > [role=tabpanel]': {
              border: '1px solid #eee',
              borderRadius: 1,
              mb: 2,
              mt: 0,
              p: 0,
            },
          }}
        >
          <TabPanel value={tabValue} index={0}>
            <UserTrendList
              userId={user?.uid || initialUser?.uid || 0}
              ownerName={user?.username || initialUser?.username}
            />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <Stack
              sx={{
                '& > div': {
                  height: '60px',
                  alignItems: 'center',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': {
                    borderBottom: 'none',
                  },
                },
              }}
            >
              <Stack direction='row' alignItems='center'>
                <Typography variant='body2' sx={{ width: '26%', color: '#666' }}>
                  昵称
                </Typography>
                {isEditingName ? (
                  <>
                    <TextField
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      size='small'
                      slotProps={{
                        input: { sx: { fontSize: '13px' } },
                      }}
                      sx={{ flex: 1, maxWidth: 300, ml: 'auto!important', py: 0 }}
                    />
                    <Button onClick={handleSaveName} variant='text' size='small'>
                      保存
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      sx={{ color: 'rgba(33, 34, 45, 1)' }}
                      variant='text'
                      size='small'
                    >
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    <Typography sx={{ flex: 1 }} variant='subtitle2'>
                      {user?.username || '-'}
                    </Typography>
                    <Button onClick={() => setIsEditingName(true)} size='small' sx={{ minWidth: 60 }}>
                      修改
                    </Button>
                  </>
                )}
              </Stack>

              <Stack direction='row' alignItems='center'>
                <Typography variant='body2' sx={{ width: '26%', color: '#666' }}>
                  邮箱
                </Typography>
                <Typography sx={{ flex: 1 }} variant='subtitle2'>
                  {user?.email || '未绑定'}
                </Typography>
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

              <Stack direction='row' alignItems='center'>
                <Typography variant='body2' sx={{ width: '26%', color: '#666' }}>
                  用户角色
                </Typography>
                <Stack direction='row' spacing={1} alignItems='center' sx={{ flex: 1 }}>
                  <Typography variant='subtitle2'>
                    {roleConfig[user?.role || ModelUserRole.UserRoleUnknown].name}
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction='row' alignItems='center'>
                <Typography variant='body2' sx={{ width: '26%', color: '#666' }}>
                  账号密码
                </Typography>
                <Typography sx={{ flex: 1, color: '#999' }}>••••••••</Typography>
                {user?.builtin ? (
                  <Button
                    size='small'
                    disabled
                    sx={{
                      color: '#999',
                    }}
                    title='内置用户不允许修改密码'
                  >
                    修改
                  </Button>
                ) : (
                  <Button onClick={handleChangePasswordClick} size='small'>
                    修改
                  </Button>
                )}
              </Stack>
            </Stack>
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <NotificationCenter />
          </TabPanel>
        </Box>
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
    </Box>
  )
}
