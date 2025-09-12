"use client";
import React, { useEffect, useState } from 'react'
import InfoRoundedIcon from '@mui/icons-material/InfoRounded'

import { TextField, Stack, Box, InputAdornment, Input, Button } from '@mui/material'
import { postPromotionWithdrawal, postPromotionCardUpload } from '@/api'
import Modal2 from '@/components/Modal2'
import { Controller, useForm } from 'react-hook-form'
import { Message } from '@cx/ui'
import Upload from './Upload'

interface WithdrawalModalProps {
  data: any
  open: boolean
  onCancel: () => void
  onOk: () => void
}

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ data, open, onCancel, onOk }) => {
  const [cardFrontLoading, setCardFrontLoading] = useState(false)
  const [cardBackLoading, setCardBackLoading] = useState(false)
  const {
    control,
    formState: { errors },
    handleSubmit,
    setValue,
    reset,
    trigger,
  } = useForm({
    defaultValues: {
      amount: '',
      card_holder: '',
      card_number: '',
      id_card: '',
      bank: '',
      phone: '',
      id_card_front_url: '',
      id_card_back_url: '',
    },
  })

  const onSubmit = handleSubmit((data) => {
    postPromotionWithdrawal(data).then(() => {
      Message.success('提现申请已提交，请耐心等待审核')
      onOk()
      onCancel()
    })
  })

  // const onChangeFile = (file: any) => {
  //   setValue('file', file)
  //   trigger('file')
  // }

  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open])

  return (
    <Modal2
      title='提现'
      width={625}
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      okText='提交'
      footer={({ OkBtn, CancelBtn }) => {
        return (
          <>
            <Stack direction='row' alignItems='center' gap={0.5} sx={{ color: 'rgba(0,0,0,0.5)', fontSize: 14, mr: 3 }}>
              <InfoRoundedIcon sx={{ color: 'primary.main', fontSize: 16 }} />
              提交后需审核，请耐心等待
            </Stack>
            {OkBtn}
          </>
        )
      }}
    >
      <Stack gap={1} sx={{ background: '#F6F8FA', p: 2 }}>
        <Box sx={{ color: 'rgba(0, 0, 0, 0.50)', fontSize: 14 }}>提现金额</Box>
        <Controller
          rules={{
            validate: (v) => {
              if (v === '') {
                return '请输入提现金额'
              }
              if (v! > data.balance) {
                return '提现金额不能大于可提现金额'
              }
              if (+v === 0 || +v % 100 !== 0) {
                return '提现金额必须为 100 的整数倍'
              }
              return true
            },
          }}
          name='amount'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              sx={{ py: 1 }}
              variant='standard'
              error={Boolean(errors.amount)}
              helperText={errors.amount?.message as string}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <Box sx={{ color: 'rgb(0, 0, 0)', fontSize: 24, fontWeight: 'bold' }}>¥</Box>
                  </InputAdornment>
                ),
                // endAdornment: (
                //   <InputAdornment position='end'>
                //     <Button
                //       onClick={() => {
                //         setValue('amount', data.balance)
                //       }}
                //     >
                //       全部提现
                //     </Button>
                //   </InputAdornment>
                // ),
              }}
            />
          )}
        />

        <Box sx={{ fontSize: 12, color: 'rgba(0,0,0,0.2)' }}>
          可提现金额
          <Box component='span' sx={{ color: 'error.main', px: 0.5 }}>
            ￥{Math.floor(data.balance / 100) * 100}
          </Box>
        </Box>
      </Stack>
      <Stack direction='row' flexWrap='wrap' gap={3} sx={{ mt: 3 }}>
        <Controller
          rules={{ required: '请输入持卡人' }}
          name='card_holder'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              placeholder='请输入持卡人'
              variant='outlined'
              label='持卡人'
              error={Boolean(errors.card_holder)}
              helperText={errors.card_holder?.message as string}
              size='small'
              autoComplete='off'
              sx={{ width: 'calc(50% - 12px)' }}
            />
          )}
        />
        <Controller
          rules={{ required: '请输入身份证号' }}
          name='id_card'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              placeholder='请输入身份证号'
              variant='outlined'
              label='身份证号'
              error={Boolean(errors.id_card)}
              helperText={errors.id_card?.message as string}
              size='small'
              autoComplete='off'
              sx={{ width: 'calc(50% - 12px)' }}
            />
          )}
        />
        <Controller
          rules={{ required: '请输入银行卡' }}
          name='card_number'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              placeholder='请输入银行卡'
              variant='outlined'
              label='银行卡'
              fullWidth
              error={Boolean(errors.card_number)}
              helperText={errors.card_number?.message as string}
              size='small'
              autoComplete='off'
            />
          )}
        />
        <Controller
          rules={{ required: '请输入开户银行' }}
          name='bank'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              placeholder='请输入开户银行,具体到支行, 例: 中国工商银行北京**支行'
              variant='outlined'
              label='开户银行'
              fullWidth
              error={Boolean(errors.bank)}
              helperText={errors.bank?.message as string}
              size='small'
              autoComplete='off'
            />
          )}
        />
        <Controller
          rules={{ required: '请输入手机号' }}
          name='phone'
          control={control}
          render={({ field }) => (
            <TextField
              required
              {...field}
              placeholder='请输入手机号'
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
          name='id_card_front_url'
          control={control}
          rules={{ required: '请上传身份证正面' }}
          render={({ field }) => {
            return (
              <Upload
                {...field}
                text='上传身份证正面'
                value=''
                // @ts-ignore
                file={field.value}
                onChange={(file) => {
                  postPromotionCardUpload({ file: file as File }).then((res) => {
                    setValue('id_card_front_url', res.url)
                    trigger('id_card_front_url')
                  })
                }}
                type='drag'
                accept='image/*'
                sx={{ width: 'calc(50% - 12px)' }}
                error={errors.id_card_front_url?.message as string}
              />
            )
          }}
        />
        <Controller
          name='id_card_back_url'
          control={control}
          rules={{ required: '请上传身份证反面' }}
          render={({ field }) => {
            return (
              <Upload
                {...field}
                text='上传身份证反面'
                value=''
                // @ts-ignore
                file={field.value}
                onChange={(file) => {
                  postPromotionCardUpload({ file: file as File }).then((res) => {
                    setValue('id_card_back_url', res.url)
                    trigger('id_card_back_url')
                  })
                }}
                type='drag'
                accept='image/*'
                sx={{ width: 'calc(50% - 12px)' }}
                error={errors.id_card_back_url?.message as string}
              />
            )
          }}
        />
      </Stack>
    </Modal2>
  )
}

export default WithdrawalModal
