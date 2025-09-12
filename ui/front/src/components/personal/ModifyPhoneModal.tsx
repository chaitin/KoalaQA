"use client";
import React from 'react'
import { TextField, Stack, Box, InputAdornment } from '@mui/material'
import { postUserPhoneCode, postUserPhoneChange } from '@/api/user'
import Modal2 from '@/components/Modal2'
import { Controller, useForm } from 'react-hook-form'
import { Text2 } from './common'
import useCountDown from '@/hooks/useCountDown'
import { AuthCodeInput, VerifyRes } from './common'
import { Message } from '@cx/ui'

interface ModifyPhoneModalProps {
  open: boolean
  onCancel: () => void
  onOk: () => void
  oldPhone?: string
}

const ModifyPhoneModal: React.FC<ModifyPhoneModalProps> = ({ open, onCancel, onOk, oldPhone }) => {
  const {
    control,
    formState: { errors },
    handleSubmit,
    getValues,
    trigger,
  } = useForm({
    defaultValues: {
      old_code: '',
      new_phone: '',
      new_code: '',
    },
  })

  const [oldCountDown, startOld] = useCountDown('MODIFY_PHONE_OLD_COUNT_DOWN')
  const [newCountDown, startNew] = useCountDown('MODIFY_PHONE_NEW_COUNT_DOWN')

  const getOldPhoneCode = async (verify: (callback: (p: VerifyRes) => Promise<void>) => void) => {
    if (oldCountDown > 0) return
    const requestCode = (p: VerifyRes) =>
      postUserPhoneCode({ phone: oldPhone!, kind: 3, ...p }).then(() => {
        startOld()
      })
    verify(requestCode)
  }

  const getNewPhoneCode = async (verify: (callback: (p: VerifyRes) => Promise<void>) => void) => {
    if (newCountDown > 0) return
    trigger('new_phone').then((res) => {
      if (res) {
        const requestCode = (p: VerifyRes) =>
          postUserPhoneCode({ phone: getValues('new_phone'), kind: 3, ...p }).then(() => {
            startNew()
          })

        verify(requestCode)
      }
    })
  }

  const onSubmit = handleSubmit((data) => {
    postUserPhoneChange({ ...data, old_phone: oldPhone! }).then(() => {
      onOk()
      onCancel()
      Message.success('绑定成功')
    })
  })

  return (
    <Modal2 title='修改手机' width={625} open={open} onCancel={onCancel} onOk={onSubmit}>
      <Text2 sx={{ color: 'rgba(0, 0, 0, 0.50)', mb: 1 }}>将发送验证码至绑定手机 {oldPhone}</Text2>
      <Stack gap={3}>
        <Controller
          rules={{ required: '请输入验证码' }}
          name='old_code'
          control={control}
          render={({ field }) => (
            <AuthCodeInput
              required
              {...field}
              placeholder='请输入验证码'
              variant='outlined'
              label='验证码'
              fullWidth
              error={Boolean(errors.old_code)}
              helperText={errors.old_code?.message as string}
              size='small'
              autoComplete='off'
              countDown={oldCountDown}
              getPhoneCode={getOldPhoneCode}
            />
          )}
        />

        <Controller
          rules={{
            required: '请输入新手机号',
            validate: (value) => /^1[3-9]\d{9}$/.test(value) || '手机号格式错误',
          }}
          name='new_phone'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              variant='outlined'
              label='新手机号'
              fullWidth
              error={Boolean(errors.new_phone)}
              helperText={errors.new_phone?.message as string}
              size='small'
              autoComplete='off'
            />
          )}
        />
        <Controller
          rules={{ required: '请输入验证码' }}
          name='new_code'
          control={control}
          render={({ field }) => (
            <AuthCodeInput
              required
              {...field}
              variant='outlined'
              label='验证码'
              placeholder='请输入验证码'
              fullWidth
              error={Boolean(errors.new_code)}
              helperText={errors.new_code?.message as string}
              size='small'
              autoComplete='off'
              countDown={newCountDown}
              onVerify={() => {
                return trigger('new_phone')
              }}
              getPhoneCode={getNewPhoneCode}
            />
          )}
        />
      </Stack>
    </Modal2>
  )
}

export default ModifyPhoneModal
