"use client";
import React from 'react'
import { Stack, Box, Button, styled } from '@mui/material'
import { Message } from '@cx/ui'
import { Card, Text } from '../common'
import { CopyToClipboard } from 'react-copy-to-clipboard'

const StyledCodeWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  flexBasis: '50%',
  minWidth: 0,
}))

const StyledCode = styled('div')(({ theme }) => ({
  flex: 1,
  padding: '8px 16px',
  fontSize: 14,
  color: '#000',
  backgroundColor: '#F2F3F5',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}))

const PromotionCodeCard = ({ data }: { data: any }) => {
  return (
    <Card>
      <Stack direction='row' alignItems='center' spacing={3}>
        <Text>邀请码/推荐码</Text>
        <Box sx={{ fontSize: 14, color: 'rgba(0,0,0,0.5)' }}>分享邀请码或推荐码，可获取奖励</Box>
      </Stack>
      <Stack direction='row' alignItems='center' spacing={3} sx={{ mt: 3 }}>
        <StyledCodeWrapper>
          <StyledCode>邀请码: {`${location.origin}/register?rc=${data.referral_code}`}</StyledCode>
          <CopyToClipboard
            text={`${location.origin}/register?rc=${data.referral_code}`}
            onCopy={() => {
              Message.success('已复制到剪贴板')
            }}
          >
            <Button variant='contained'>复制</Button>
          </CopyToClipboard>
        </StyledCodeWrapper>
        <StyledCodeWrapper>
          <StyledCode>推荐码: {data.referral_code}</StyledCode>
          <CopyToClipboard
            text={data.referral_code}
            onCopy={() => {
              Message.success('已复制到剪贴板')
            }}
          >
            <Button variant='contained'>复制</Button>
          </CopyToClipboard>
        </StyledCodeWrapper>
      </Stack>
    </Card>
  )
}

export default PromotionCodeCard
