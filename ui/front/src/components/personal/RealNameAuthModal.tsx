"use client";
import React, { useEffect, useState, useRef } from 'react'
import ReactQRCode from 'react-qr-code'
import { IdentificationType } from '@/types'
import { primary } from '@/constant'
import { TextField, Stack, Box, Button, MenuItem } from '@mui/material'
import { checkVerification, userVerification } from '@/api'
import { Exclamation } from '@/icon'
import Modal2 from '@/components/Modal2'
import { Controller, useForm } from 'react-hook-form'
import { Message } from '@cx/ui'

interface RealNameAuthModalProps {
  open: boolean
  onCancel: () => void
  onOk: () => void
}

interface AuthTipModalProps {
  open: boolean
  onCancel: () => void
  totalSeconds: number
}

const AuthTipModal: React.FC<AuthTipModalProps> = ({ open, onCancel, totalSeconds }) => {
  const [countdown, setCountdown] = useState('00:00:00')

  useEffect(() => {
    let remainingSeconds = totalSeconds
    const interval = setInterval(() => {
      if (remainingSeconds > 0) {
        const hours = Math.floor(remainingSeconds / 3600)
        const minutes = Math.floor((remainingSeconds % 3600) / 60)
        const seconds = remainingSeconds % 60
        const formattedHours = hours.toString().padStart(2, '0')
        const formattedMinutes = minutes.toString().padStart(2, '0')
        const formattedSeconds = seconds.toString().padStart(2, '0')
        setCountdown(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`)
        remainingSeconds--
      } else {
        clearInterval(interval)
        setCountdown('00:00:00')
        onCancel()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [totalSeconds])

  return (
    <Modal2 title='提示' open={open} onCancel={onCancel} showCancel={false} okText='关闭' onOk={onCancel}>
      <Box sx={{ fontSize: 14 }}>
        该账号正处于 7 天实名保护期，还剩
        <Box component='span' sx={{ color: 'primary.main', px: 0.5 }}>
          {countdown}
        </Box>
        可重新实名
      </Box>
    </Modal2>
  )
}

const RealNameAuthModal: React.FC<RealNameAuthModalProps> = ({ open, onCancel, onOk }) => {
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({
    defaultValues: {
      cert_type: 'IDENTITY_CARD' as IdentificationType,
      cert_no: '',
      cert_name: '',
    },
  })
  const timerRef = useRef<NodeJS.Timeout>()
  const [url, setUrl] = useState<string | null>()
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false)
  const [authTipModalOpen, setAuthTipModalOpen] = useState(false)
  const [authTipTime, setAuthTipTime] = useState(0)

  const poolStatus = () => {
    timerRef.current = setTimeout(() => {
      checkVerification().then((res) => {
        if (res?.certify_status === 1) {
          clearInterval(timerRef.current)
          onCancel()
          onOk()
          setQrCodeModalOpen(false)
          Message.success('认证成功')
        } else {
          poolStatus()
        }
      })
    }, 3000)
  }

  const onSubmit = handleSubmit((data) => {
    userVerification(data).then((res) => {
      if (res.code === 0) {
        setUrl(res.url)
        poolStatus()
        setQrCodeModalOpen(true)
      } else if (res.code === 1001) {
        setAuthTipTime(res.second)
        setAuthTipModalOpen(true)
      }
    })
  })

  useEffect(() => {
    if (!open) {
      reset()
      clearTimeout(timerRef.current)
    }
  }, [open])

  return (
    <Modal2
      title='实名认证'
      width={625}
      open={open}
      onCancel={onCancel}
      onOk={onCancel}
      showCancel={false}
      okText='关闭'
    >
      <Modal2
        title='实名认证'
        open={qrCodeModalOpen}
        onCancel={() => setQrCodeModalOpen(false)}
        onOk={() => setQrCodeModalOpen(false)}
        showCancel={false}
        okText='关闭'
      >
        <Stack direction='row' alignItems='center' sx={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', mb: 3 }} gap={1}>
          <Stack
            direction='row'
            alignItems='center'
            sx={{
              width: 500,
              py: 1,
              px: 2,
              backgroundColor: 'rgba(32, 108, 255, 0.06)',
              borderRadius: 1,
            }}
          >
            <Exclamation sx={{ color: primary }} /> 请打开支付宝扫码， 若失败，请确认信息无误后重新认证
          </Stack>
        </Stack>
        <Stack gap={1} alignItems='center'>
          {url && <ReactQRCode value={url} size={240} />}
        </Stack>
      </Modal2>
      <AuthTipModal
        open={authTipModalOpen}
        onCancel={() => {
          setAuthTipModalOpen(false)
        }}
        totalSeconds={authTipTime}
      />
      <Stack gap={3}>
        <Stack
          direction='row'
          alignItems='flex-start'
          gap={1}
          sx={{
            py: 1,
            px: 2,
            backgroundColor: 'rgba(32, 108, 255, 0.06)',
            borderRadius: 1,
          }}
        >
          <Exclamation sx={{ color: primary, mt: '-2px' }} />
          <Box sx={{ fontSize: 14 }}>
            请填写您的真实身份信息，仅需 1～3 分钟即可完成认证。若您在认证过程中遇到任何问题，请联系官方客服
          </Box>
        </Stack>
        <Controller
          rules={{
            required: '请选择证件类型',
          }}
          name='cert_type'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              select
              variant='outlined'
              label='证件类型'
              fullWidth
              error={Boolean(errors.cert_type)}
              helperText={errors.cert_type?.message as string}
              size='small'
              autoComplete='off'
            >
              {Object.entries(IdentificationType).map(([key, value]) => (
                <MenuItem key={value} value={key}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          rules={{ required: '请输入证件号码' }}
          name='cert_no'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              variant='outlined'
              placeholder='请输入证件号码'
              label='证件号码'
              fullWidth
              error={Boolean(errors.cert_no)}
              helperText={errors.cert_no?.message as string}
              size='small'
              autoComplete='off'
            />
          )}
        />
        <Controller
          rules={{ required: '请输入真实姓名' }}
          name='cert_name'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              variant='outlined'
              placeholder='请输入真实姓名'
              label='真实姓名'
              fullWidth
              error={Boolean(errors.cert_name)}
              helperText={errors.cert_name?.message as string}
              size='small'
              autoComplete='off'
            />
          )}
        />
        <Box>
          <Stack direction='row' alignItems='center' sx={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', mb: 3 }} gap={1}>
            人脸认证 <Box sx={{ color: 'error.main' }}>*</Box>
            <Stack direction='row' alignItems='center'>
              <Exclamation sx={{ color: primary }} /> 请打开支付宝扫码， 若失败，请确认信息无误后重新认证
            </Stack>
          </Stack>
          <Stack gap={1} alignItems='flex-start'>
            <Button variant='contained' onClick={onSubmit}>
              {url ? '重新' : '点击'}生成二维码
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Modal2>
  )
}

export default RealNameAuthModal
