"use client";
import React from 'react'
import { TextField, Stack } from '@mui/material'
import { postUserPhoneCode, postUserPhoneBind } from '@/api/user'
import Modal2 from '@/components/Modal2'
import useCountDown from '@/hooks/useCountDown'
import { Controller, useForm } from 'react-hook-form'
import { AuthCodeInput, VerifyRes } from './common'
import { Message } from '@cx/ui'

interface BindPhoneModalProps {
  open: boolean
  onCancel: () => void
  onOk: () => void
}

const BindPhoneModal: React.FC<BindPhoneModalProps> = ({ open, onCancel, onOk }) => {
  const {
    control,
    formState: { errors },
    handleSubmit,
    getValues,
    trigger,
  } = useForm({
    defaultValues: {
      phone: '',
      code: '',
    },
  })
  const [countDown, start] = useCountDown('BIND_PHONE_COUNT_DOWN')
  const getPhoneCode = async (verify: (callback: (p: VerifyRes) => Promise<void>) => void) => {
    if (countDown > 0) return
    trigger('phone').then((res) => {
      if (res) {
        const requestCode = (p: VerifyRes) =>
          postUserPhoneCode({ phone: getValues('phone'), kind: 2, ...p }).then(() => {
            start()
          })

        verify(requestCode)
      }
    })
  }

  const onSubmit = handleSubmit((data) => {
    postUserPhoneBind(data).then(() => {
      onOk()
      onCancel()
      Message.success('绑定成功')
    })
  })

  return (
    <Modal2 title='绑定手机' width={625} open={open} onCancel={onCancel} onOk={onSubmit}>
      <Stack gap={3}>
        <Controller
          rules={{
            required: '请输入手机号',
            validate: (value) => /^1[3-9]\d{9}$/.test(value) || '手机号格式错误',
          }}
          name='phone'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              variant='outlined'
              label='手机号'
              fullWidth
              error={Boolean(errors.phone)}
              helperText={errors.phone?.message as string}
              size='small'
              autoComplete='off'
            />
          )}
        />

        <Controller
          rules={{ required: '请输入验证码' }}
          name='code'
          control={control}
          render={({ field }) => (
            <AuthCodeInput
              required
              {...field}
              variant='outlined'
              label='验证码'
              fullWidth
              error={Boolean(errors.code)}
              helperText={errors.code?.message as string}
              size='small'
              autoComplete='off'
              onVerify={() => {
                return trigger('phone')
              }}
              countDown={countDown}
              getPhoneCode={getPhoneCode}
            />
          )}
        />
      </Stack>
    </Modal2>
  )
}

export default BindPhoneModal
