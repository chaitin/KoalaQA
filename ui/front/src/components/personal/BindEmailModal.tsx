"use client";
import React, { useEffect } from 'react'
import { TextField, Stack, Box, InputAdornment } from '@mui/material'
import { getBindMailCode, bindMail } from '@/api'
import useCountDown from '@/hooks/useCountDown'
import Modal2 from '@/components/Modal2'
import { Controller, useForm } from 'react-hook-form'
import { Message } from '@cx/ui'

interface BindPhoneModalProps {
  open: boolean
  onCancel: () => void
  onOk: () => void
}

const BindEmailModal: React.FC<BindPhoneModalProps> = ({ open, onCancel, onOk }) => {
  const {
    control,
    formState: { errors },
    handleSubmit,
    getValues,
    trigger,
    reset,
  } = useForm({
    defaultValues: {
      mail: '',
      code: '',
    },
  })
  const [countDown, start, stop] = useCountDown('BIND_EMAIL_COUNT_DOWN')

  const getEmailCode = async () => {
    if (countDown > 0) return
    trigger('mail').then((res) => {
      if (res) {
        getBindMailCode({ mail: getValues('mail').trim() }).then(() => {
          start()
        })
      }
    })
  }

  const onSubmit = handleSubmit((data) => {
    bindMail(data).then(() => {
      onOk()
      onCancel()
      Message.success('绑定成功')
      stop()
    })
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open])

  return (
    <Modal2 title='绑定邮箱' width={625} open={open} onCancel={onCancel} onOk={onSubmit}>
      <Stack gap={3}>
        <Controller
          rules={{
            required: '请输入邮箱',
          }}
          name='mail'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              variant='outlined'
              placeholder='请输入邮箱'
              label='邮箱'
              fullWidth
              error={Boolean(errors.mail)}
              helperText={errors.mail?.message as string}
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
            <TextField
              required
              {...field}
              variant='outlined'
              placeholder='请输入验证码'
              label='验证码'
              fullWidth
              error={Boolean(errors.code)}
              helperText={errors.code?.message as string}
              size='small'
              autoComplete='off'
              InputProps={{
                endAdornment: (
                  <InputAdornment position='end'>
                    <Box
                      sx={{
                        color: countDown > 0 ? 'rgba(0,0,0,0.5)' : 'primary.main',
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                      onClick={getEmailCode}
                    >
                      {countDown && countDown > 0 ? `${countDown}s 后重新获取` : '获取验证码'}
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
      </Stack>
    </Modal2>
  )
}

export default BindEmailModal
