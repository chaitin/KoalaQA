"use client";
import React, { useState, useId } from 'react'
import { Message } from '@cx/ui'
import { styled, TextField, InputAdornment, IconButton, TextFieldProps, Box, Stack } from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import useBindCaptcha from '@/hooks/useBindCaptcha'

export const Card = styled('div')(() => ({
  padding: '24px',
  borderRadius: '8px',
  backgroundColor: '#fff',
}))

export const Text = styled('div')(() => ({
  fontSize: '16px',
  color: '#000',
}))

export const Row = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  padding: '32px 16px',
}))

export const Text2 = styled('div')(() => ({
  fontSize: '14px',
  fontWeight: 300,
  color: 'rgba(255,255,255,0.5)',
}))

export const TextWhite2 = styled('div')(() => ({
  fontSize: '14px',
  color: '#fff',
  fontWeight: 300,
}))

export const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
})

export const PasswordInput = React.forwardRef<HTMLDivElement, TextFieldProps>((props, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <TextField
      ref={ref}
      InputProps={{
        endAdornment: (
          <InputAdornment position='end'>
            <IconButton size='small' onClick={() => setShowPassword((prev) => !prev)} edge='end'>
              {showPassword ? (
                <Visibility sx={{ fontSize: 16, color: 'rgba(0,0,0,0.5)' }} />
              ) : (
                <VisibilityOff sx={{ fontSize: 16, color: 'rgba(0,0,0,0.5)' }} />
              )}
            </IconButton>
          </InputAdornment>
        ),
      }}
      type={showPassword ? 'text' : 'password'}
      {...props}
    />
  )
})

export interface VerifyRes {
  token: string
}

type AuthCodeInputProps = TextFieldProps & {
  getPhoneCode: (verify: (callback: (p: VerifyRes) => Promise<void>) => void) => Promise<void>
  countDown: number
  onVerify?: () => Promise<boolean>
}

export const AuthCodeInput = React.forwardRef<HTMLDivElement, AuthCodeInputProps>((props, ref) => {
  const { getPhoneCode, countDown, onVerify, ...reset } = props
  const [modalOpen, setModalOpen] = useState(false)
  const domId = useId()
  const [captcha] = useBindCaptcha(domId)
  const verify = (token: string) => (callback: (p: VerifyRes) => Promise<void>) => {
    callback({
      token: token,
    }).then(() => {
      setModalOpen(false)
    })
    setModalOpen(false)
  }

  const onSuccessCallback = (token: string) => {
    getPhoneCode(verify(token))
  }

  return (
    <Stack gap={5} sx={{ minHeight: '64px', width: '100%', alignItems: 'center' }}>
      <TextField
        ref={ref}
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position='end'>
              <Box
                id={domId}
                sx={{
                  color: countDown > 0 ? 'rgba(0,0,0,0.5)' : 'primary.main',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
                onClick={async (e) => {
                  if (onVerify && !(await onVerify())) {
                    return
                  }
                  captcha!.current!.start(e).then((token: string) => {
                    onSuccessCallback(token)
                  })
                }}
              >
                {countDown && countDown > 0 ? `${countDown}s 后重新获取` : '获取验证码'}
              </Box>
            </InputAdornment>
          ),
        }}
        {...reset}
      />
    </Stack>
  )
})
