"use client";
import React, { useState, useContext, useEffect } from 'react'
import { Box, Tabs, Tab, Stack, Button, TextField } from '@mui/material'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { grayBg } from '@/constant'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { getUserInfo, updateUserName, getPromotionInfo } from '@/api'
import { AuthContext } from '@/layout/Auth'
import { useBoolean, useRequest } from 'ahooks'
import { CheckCircleFilled } from '@/icon'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import Icon from '@/components/Icon'
import { Card, Text, Row, Text2, TextWhite2, VisuallyHiddenInput } from './common'
import History from '../Account/Notifications/History'
import BindPhoneModal from './BindPhoneModal'
import PasswordModal from './PasswordModal'
import WriteOffModal from './WriteOffModal'
import ModifyPhoneModal from './ModifyPhoneModal'
import BindEmailModal from './BindEmailModal'
import RealNameAuthModal from './RealNameAuthModal'
import CropImageModal from './CropImageModal'
// import AdvertisingModal from './Promotion/AdvertisingModal'
import Promotion from './Promotion'
import personBg from '@/asset/img/personal_bg.png'
import defaultAvatar from '@/asset/img/default_avatar.png'
import { Message } from '@cx/ui'

export enum TabValue {
  Base = 'base',
  Message = 'message',
  Promotion = 'promotion',
}

const Personal = () => {
  const {
    authInfo: { userInfo, verified, promotionInfo },
    updateAuthInfo,
  } = useContext(AuthContext)
  const { id } = useParams() as { id: TabValue }
  const [value, setValue] = useState<TabValue>(id || TabValue.Base)
  const [image, setImage] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [nickname, setNickname] = useState<string>(userInfo?.nickname || '')
  const [editNicknameStatus, { setTrue: openEditNicknameStatus, setFalse: closeEditNicknameStatus }] = useBoolean(false)
  const [bindPhoneModalVisible, setBindPhoneModalVisible] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [writeOffModalVisible, setWriteOffModalVisible] = useState(false)
  const [modifyPhoneModalVisible, setModifyPhoneModalVisible] = useState(false)
  const [bindEmailModalVisible, setBindEmailModalVisible] = useState(false)
  const [cropImageModalVisible, setCropImageModalVisible] = useState(false)
  // const [adModalVisible, setAdModalVisible] = useState(false)
  const [realNameAuthModalVisible, setRealNameAuthModalVisible] = useState(false)

  const handleChange = (event: React.SyntheticEvent, newValue: TabValue) => {
    setValue(newValue)
    navigate(`/console/personal/${newValue}`)
  }

  const getUserInfoQuery = () => {
    return getUserInfo()
      .then((result) => {
        updateAuthInfo({
          auth: true,
          userInfo: result,
          verified: result?.is_certified === 1,
        })
      })
      .catch(() => {
        updateAuthInfo({
          auth: false,
          userInfo: null,
          verified: false,
          orgInfo: null,
        })
      })
  }

  const onUpdateUserName = () => {
    return updateUserName({ nickname }).then(() => {
      Message.success('修改成功')
      getUserInfoQuery()
      closeEditNicknameStatus()
    })
  }

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // @ts-ignore
    const file = e.target.files[0]

    const reader = new FileReader()
    reader.onload = (e) => {
      setImage(e.target?.result as string)
      setCropImageModalVisible(true)
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    setNickname(userInfo?.nickname || '')
  }, [userInfo])

  useEffect(() => {
    if (!Object.values(TabValue).includes(id)) {
      navigate(`/console/personal/${TabValue.Base}`)
      setValue(TabValue.Base)
    } else {
      setValue(id)
    }
  }, [id])

  // useEffect(() => {
  //   if (searchParams.get('join') === '1') {
  //     setAdModalVisible(true)
  //   }
  // }, [searchParams])

  return (
    <Box
      sx={{
        pt: 13,
        backgroundColor: grayBg,
        height: '100vh',
        overflowY: 'auto',
        pb: 5,
      }}
    >
      <CropImageModal
        open={cropImageModalVisible}
        onOk={(img) => {
          updateUserName({ nickname, head_img_url: img })
            .then(() => {
              getUserInfoQuery()
              setCropImageModalVisible(false)
            })
            .catch((err) => {
              setCropImageModalVisible(false)
            })
        }}
        onCancel={() => {
          setCropImageModalVisible(false)
        }}
        url={image}
      />
      {/* <AdvertisingModal
        onAuth={() => setRealNameAuthModalVisible(true)}
        verified={verified}
        open={adModalVisible}
        onCancel={() => {
          setAdModalVisible(false)
        }}
      /> */}
      <BindPhoneModal
        open={bindPhoneModalVisible}
        onOk={getUserInfoQuery}
        onCancel={() => {
          setBindPhoneModalVisible(false)
        }}
      />
      <ModifyPhoneModal
        oldPhone={userInfo?.phone}
        open={modifyPhoneModalVisible}
        onOk={getUserInfoQuery}
        onCancel={() => {
          setModifyPhoneModalVisible(false)
        }}
      />
      <WriteOffModal
        verified={verified}
        open={writeOffModalVisible}
        onCancel={() => {
          setWriteOffModalVisible(false)
        }}
      />
      <PasswordModal
        oldPhone={userInfo?.phone}
        open={passwordModalVisible}
        onOk={getUserInfoQuery}
        onCancel={() => {
          setPasswordModalVisible(false)
        }}
      />
      <BindEmailModal
        open={bindEmailModalVisible}
        onOk={getUserInfoQuery}
        onCancel={() => {
          setBindEmailModalVisible(false)
        }}
      />
      <RealNameAuthModal
        open={realNameAuthModalVisible}
        onOk={getUserInfoQuery}
        onCancel={() => {
          setRealNameAuthModalVisible(false)
        }}
      />
      <Stack gap={3} sx={{ width: 1120, mx: 'auto', position: 'relative' }}>
        <Box
          sx={{
            top: -24,
            position: 'absolute',
            right: 0,
            color: 'rgba(0,0,0,0.5)',
            cursor: 'pointer',
            fontSize: 12,
            '&:hover': { color: 'primary.main' },
          }}
          onClick={() => {
            navigate(
              value === TabValue.Base ? '/console/account/profile/basic' : '/console/account/notifications/history',
            )
          }}
        >
          返回旧版
        </Box>
        <Card sx={{ p: 0 }}>
          <Box
            sx={{
              position: 'relative',
              height: 144,
              backgroundSize: '100% auto',
              backgroundImage: `url(${personBg})`,
              borderRadius: '8px 8px 0px 0px',
            }}
          >
            <Stack direction='row' justifyContent='space-between' sx={{ pt: '50px', pl: 5, pr: 3 }}>
              <Stack direction='row' gap={3}>
                <Box
                  sx={{
                    position: 'relative',
                    width: 126,
                    height: 126,
                    borderRadius: '50%',
                    border: '3px solid #fff',
                  }}
                >
                  <img
                    src={userInfo?.head_img_url || defaultAvatar}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      borderRadius: '50%',
                    }}
                  />

                  <Box
                    component='label'
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      position: 'absolute',
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      border: '5px solid #fff',
                      bottom: 0,
                      right: -5,
                      backgroundColor: 'primary.main',
                      cursor: 'pointer',
                    }}
                  >
                    <VisuallyHiddenInput type='file' accept='image/*' onChange={onImageChange} />
                    <Icon type='icon-photo' sx={{ color: '#fff', fontSize: 18 }} />
                  </Box>
                </Box>
                <Box
                  sx={{
                    color: '#fff',
                    position: 'absolute',
                    bottom: 16,
                    left: 198,
                  }}
                >
                  <Box sx={{ fontSize: 26, fontWeight: 600 }}>{userInfo?.nickname}</Box>

                  <Stack direction='row' alignItems='center' gap={1}>
                    <Text2> {userInfo?.id}</Text2>
                    <CopyToClipboard
                      text={userInfo?.id?.toString() || ''}
                      onCopy={() => {
                        Message.success('用户ID已复制到剪贴板')
                      }}
                    >
                      <Icon
                        type='icon-copy'
                        sx={{
                          width: '12px',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      ></Icon>
                    </CopyToClipboard>
                  </Stack>
                </Box>
              </Stack>

              <Stack direction='row' gap={5} sx={{ position: 'absolute', bottom: 16, right: 24 }}>
                <Stack direction='row' gap={1.5} alignItems='baseline'>
                  <Text2>注册时间</Text2>
                  <TextWhite2>{userInfo?.created_at}</TextWhite2>
                </Stack>
                <Stack direction='row' gap={1.5} alignItems='baseline'>
                  <Text2>最后登录时间</Text2>
                  <TextWhite2>{userInfo?.last_logined_at}</TextWhite2>
                </Stack>
              </Stack>
            </Stack>
          </Box>
          <Stack direction='row' gap={2} justifyContent='flex-end' alignItems='center' sx={{ pr: 3 }}>
            <Tabs value={value} onChange={handleChange}>
              <Tab
                disableRipple
                value={TabValue.Base}
                icon={<Icon type='icon-xiaolian' />}
                iconPosition='start'
                label='基本信息'
              />
              <Tab
                disableRipple
                value={TabValue.Message}
                icon={<Icon type='icon-tongzhi' />}
                iconPosition='start'
                label='消息中心'
              />
              {promotionInfo?.referral_code && (
                <Tab
                  disableRipple
                  value={TabValue.Promotion}
                  icon={
                    <Icon
                      sx={{ fontSize: 24, mt: '-8px' }}
                      type={
                        value === TabValue.Promotion
                          ? 'icon-tuiguangdashiicon-xuanzhong'
                          : 'icon-tuiguangdashiicon-weixuanzhong'
                      }
                    />
                  }
                  iconPosition='start'
                  label='推广大使'
                />
              )}
            </Tabs>
          </Stack>
        </Card>
        {value === TabValue.Base && (
          <>
            <Card>
              <Text>基本信息</Text>
              <Row sx={{ borderBottom: '1px solid #EEEEEE' }}>
                <Text sx={{ width: 300, color: 'rgba(0,0,0,0.5)' }}>昵称</Text>
                {editNicknameStatus ? (
                  <TextField
                    variant='outlined'
                    sx={{ width: 590 }}
                    size='small'
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    error={nickname.length > 20}
                    helperText={nickname.length > 20 ? '昵称不能超过20字' : ''}
                  />
                ) : (
                  <Text sx={{ width: 590 }}>{userInfo?.nickname}</Text>
                )}
                <Stack direction='row' sx={{ flex: 1 }} gap={2} justifyContent='flex-end'>
                  {!editNicknameStatus ? (
                    <Button size='small' onClick={openEditNicknameStatus}>
                      修改
                    </Button>
                  ) : (
                    <>
                      <Button size='small' disabled={nickname.trim().length === 0} onClick={onUpdateUserName}>
                        保存
                      </Button>
                      <Button
                        size='small'
                        onClick={() => {
                          setNickname(userInfo?.nickname || '')
                          closeEditNicknameStatus()
                        }}
                      >
                        取消
                      </Button>
                    </>
                  )}
                </Stack>
              </Row>
              <Row sx={{ borderBottom: '1px solid #EEEEEE' }}>
                <Text sx={{ width: 300, color: 'rgba(0,0,0,0.5)' }}>手机号</Text>
                <Text sx={{ width: 590 }}>{userInfo?.phone || '-'}</Text>
                <Stack direction='row' sx={{ flex: 1 }} justifyContent='flex-end'>
                  <Button
                    size='small'
                    onClick={() => {
                      if (!userInfo?.phone) {
                        setBindPhoneModalVisible(true)
                      } else {
                        setModifyPhoneModalVisible(true)
                      }
                    }}
                  >
                    {userInfo?.phone ? '修改' : '绑定'}
                  </Button>
                </Stack>
              </Row>
              <Row sx={{ borderBottom: '1px solid #EEEEEE' }}>
                <Text sx={{ width: 300, color: 'rgba(0,0,0,0.5)' }}>邮箱</Text>
                <Text sx={{ width: 590 }}>{userInfo?.mail}</Text>
                <Stack direction='row' sx={{ flex: 1 }} justifyContent='flex-end'>
                  {!userInfo?.mail && (
                    <Button
                      size='small'
                      onClick={() => {
                        setBindEmailModalVisible(true)
                      }}
                    >
                      绑定
                    </Button>
                  )}
                </Stack>
              </Row>
            </Card>
            <Card>
              <Row sx={{ py: 0 }}>
                <Text sx={{ width: 300 }}>实名认证</Text>

                {verified ? (
                  <Stack
                    direction='row'
                    alignItems='center'
                    gap={1}
                    sx={{
                      color: 'success.main',
                      width: 590,
                    }}
                  >
                    <CheckCircleFilled />
                    已实名
                  </Stack>
                ) : (
                  <Stack
                    direction='row'
                    alignItems='center'
                    gap={1}
                    sx={{
                      width: 590,
                      color: 'warning.main',
                    }}
                  >
                    <ErrorRoundedIcon sx={{ fontSize: 20 }} />
                    未实名认证
                  </Stack>
                )}

                <Stack direction='row' sx={{ flex: 1 }} justifyContent='flex-end'>
                  {!verified && (
                    <Button
                      size='small'
                      onClick={() => {
                        setRealNameAuthModalVisible(true)
                      }}
                    >
                      去认证
                    </Button>
                  )}
                </Stack>
              </Row>
            </Card>
            <Card>
              <Row sx={{ py: 0 }}>
                <Text sx={{ width: 300 }}>账号密码</Text>
                <Text
                  sx={{
                    width: 590,
                    color: 'warning.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {userInfo?.phone ? (
                    ''
                  ) : (
                    <>
                      <ErrorRoundedIcon sx={{ fontSize: 18 }} />
                      未绑定手机号
                    </>
                  )}
                </Text>
                <Stack direction='row' sx={{ flex: 1 }} justifyContent='flex-end'>
                  <Button
                    size='small'
                    onClick={() => {
                      if (!userInfo?.phone) {
                        setBindPhoneModalVisible(true)
                        return
                      } else {
                        setPasswordModalVisible(true)
                      }
                    }}
                  >
                    {userInfo?.phone ? '修改' : '去绑定'}
                  </Button>
                </Stack>
              </Row>
            </Card>
            <Card>
              <Row sx={{ py: 0, alignItems: 'flex-start' }}>
                <Text sx={{ width: 300 }}>
                  账号注销
                  <Text2 sx={{ color: 'rgba(0,0,0,0.5)' }}>永久删除账号和所有数据，请谨慎操作</Text2>
                </Text>
                <Stack direction='row' sx={{ flex: 1 }} justifyContent='flex-end'>
                  <Button size='small' color='error' onClick={() => setWriteOffModalVisible(true)}>
                    注销
                  </Button>
                </Stack>
              </Row>
            </Card>
          </>
        )}
        {value === TabValue.Message && <History />}
        {value === TabValue.Promotion && <Promotion />}
      </Stack>
    </Box>
  )
}

export default Personal
