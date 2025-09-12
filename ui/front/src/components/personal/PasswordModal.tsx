"use client";
import React from 'react'

import { Text2, AuthCodeInput, VerifyRes } from './common'
import { postUserPhoneCode, putUserPassword, postUserPhoneChange } from '@/api/user'
import { TextField, Stack, Box, InputAdornment } from '@mui/material'
import { PasswordInput } from './common'
import Modal2 from '@/components/Modal2'
import { Controller, useForm } from 'react-hook-form'
import useCountDown from '@/hooks/useCountDown'
import { Message } from '@cx/ui'

interface PasswordModalProps {
  open: boolean
  onCancel: () => void
  onOk: () => void
  oldPhone?: string
}

const PasswordModal: React.FC<PasswordModalProps> = ({ open, onCancel, onOk, oldPhone }) => {
  const {
    control,
    formState: { errors },
    handleSubmit,
    watch,
  } = useForm({
    defaultValues: {
      code: '',
      new_password: '',
      confirm_password: '',
    },
  })

  const new_password = watch('new_password')

  const [oldCountDown, startOld] = useCountDown('MODIFY_PHONE_OLD_COUNT_DOWN')

  const getOldPhoneCode = async (verify: (callback: (p: VerifyRes) => Promise<void>) => void) => {
    if (oldCountDown > 0) return
    const requestCode = (p: VerifyRes) =>
      postUserPhoneCode({ phone: oldPhone!, kind: 4, ...p }).then(() => {
        startOld()
      })
    verify(requestCode)
  }

  const onSubmit = handleSubmit((data) => {
    putUserPassword({ ...data, phone: oldPhone! }).then(() => {
      onOk()
      onCancel()
      Message.success('修改成功')
    })
  })

  return (
    <Modal2 title='修改密码' width={625} open={open} onCancel={onCancel} onOk={onSubmit}>
      <Text2 sx={{ color: 'rgba(0, 0, 0, 0.50)', mb: 1 }}>将发送验证码至绑定手机 {oldPhone}</Text2>
      <Stack gap={3}>
        <Controller
          rules={{ required: '请输入验证码' }}
          name='code'
          control={control}
          render={({ field }) => (
            <AuthCodeInput
              required
              {...field}
              placeholder='请输入验证码'
              variant='outlined'
              label='验证码'
              fullWidth
              error={Boolean(errors.code)}
              helperText={errors.code?.message as string}
              size='small'
              autoComplete='off'
              countDown={oldCountDown}
              getPhoneCode={getOldPhoneCode}
            />
          )}
        />
        <Controller
          rules={{
            required: '请输入新密码',
          }}
          name='new_password'
          control={control}
          render={({ field }) => (
            <PasswordInput
              required
              {...field}
              variant='outlined'
              label='新密码'
              fullWidth
              error={Boolean(errors.new_password)}
              helperText={errors.new_password?.message as string}
              size='small'
              autoComplete='off'
            />
          )}
        />
        <Controller
          rules={{
            required: '请输入确认密码',
            validate: (value) => value === new_password || '两次密码不一致',
          }}
          name='confirm_password'
          control={control}
          render={({ field }) => (
            <PasswordInput
              required
              {...field}
              variant='outlined'
              label='确认密码'
              fullWidth
              error={Boolean(errors.confirm_password)}
              helperText={errors.confirm_password?.message as string}
              size='small'
              autoComplete='off'
            />
          )}
        />
      </Stack>
    </Modal2>
  )
}

export default PasswordModal
