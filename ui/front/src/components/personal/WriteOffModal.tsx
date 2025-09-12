"use client";
import React, { useEffect } from 'react'

import { TextField, Stack, Box } from '@mui/material'
import { deleteUserCloseAccount } from '@/api/user'
import Modal2 from '@/components/Modal2'
import { Text } from './common'
import { Controller, useForm } from 'react-hook-form'

interface BindPhoneModalProps {
  open: boolean
  verified: boolean
  onCancel: () => void
}

const BindPhoneModal: React.FC<BindPhoneModalProps> = ({ open, onCancel, verified }) => {
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({
    defaultValues: {
      code: '',
    },
  })

  const onSubmit = handleSubmit(() => {
    deleteUserCloseAccount().then(() => {
      onCancel()
      window.location.href = '/login'
    })
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open])

  return (
    <Modal2
      title='提示'
      width={625}
      okText='注销'
      okButtonProps={{ color: 'error' }}
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
    >
      <Text sx={{ fontSize: 14 }}>确定注销当前账号吗？</Text>
      <Text sx={{ fontSize: 14, color: 'error.main', mt: 2, mb: 3 }}>
        1. 注销后，此账号的所有数据都将被删除且不可逆，请谨慎操作！
        {verified && <Box sx={{ mt: 1 }}>2. 一旦注销账户，你需要等待7天后才能重新进行实名认证</Box>}
      </Text>
      <Text sx={{ fontSize: 14, color: 'error.main', mt: 2, mb: 3 }}></Text>
      <Stack direction='row' alignItems='center' sx={{ fontSize: 14, mt: 2, mb: 1, color: 'rgba(0,0,0,0.5)' }}>
        输入 “<Text sx={{ color: '#000', fontWeight: 500 }}>确认注销</Text>” 以确认操作
      </Stack>
      <Stack gap={3}>
        <Controller
          rules={{
            required: '请输入确认注销',
            validate: (value) => value === '确认注销' || '请输入确认注销',
          }}
          name='code'
          control={control}
          render={({ field }) => (
            <TextField
              required
              placeholder='请输入'
              {...field}
              variant='outlined'
              fullWidth
              error={Boolean(errors.code)}
              helperText={errors.code?.message as string}
              size='small'
              autoComplete='off'
            />
          )}
        />
      </Stack>
    </Modal2>
  )
}

export default BindPhoneModal
