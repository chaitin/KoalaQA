"use client";
import React, { useState } from 'react'
import HelpIcon from '@mui/icons-material/Help'
import { Box, Stack, Button, Tooltip } from '@mui/material'
import WithdrawalModal from './WithdrawalModal'
import { Card, Text } from '../common'
import { formatNumberWithCommas } from '@/utils'

interface WalletCardProps {
  data: any
  refresh: () => void
}

const WalletCard: React.FC<WalletCardProps> = ({ data, refresh }) => {
  const [open, setOpen] = useState(false)
  return (
    <Card sx={{ width: '50%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <WithdrawalModal
        data={data}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => {
          setOpen(false)
          refresh()
        }}
      />
      <Text sx={{ fontWeight: 600 }}>您的钱包</Text>
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
        <Stack gap={1.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', fontSize: 14, gap: 1, color: 'rgba(0, 0, 0, 0.50)' }}>
            现金余额{' '}
            <Tooltip title={<Box sx={{ color: 'rgba(0,0,0,0.85)' }}>金额满 ¥ 100 才可进行提现</Box>} placement='top'>
              <HelpIcon
                sx={{
                  cursor: 'pointer',
                  color: 'rgba(0, 0, 0, 0.50)',
                  fontSize: 16,
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              />
            </Tooltip>
          </Box>
          <Box sx={{ fontSize: 24, fontWeight: 700, color: '#000' }}>
            <Box component='span' sx={{ fontSize: 18 }}>
              ￥
            </Box>{' '}
            {formatNumberWithCommas(data.balance || 0)}
          </Box>
        </Stack>
        <Button variant='contained' disabled={data.balance < 100} sx={{ width: 88 }} onClick={() => setOpen(true)}>
          提现
        </Button>
      </Stack>
      <Stack direction='row' alignItems='center' sx={{ background: '#F6F8FA', py: 3 }}>
        <Stack gap={1} sx={{ width: '50%', pl: 3 }}>
          <Box sx={{ color: 'rgba(0, 0, 0, 0.50)', fontSize: 12 }}>累计提现</Box>
          <Box sx={{ fontSize: 20, fontWeight: 700, color: '#000' }}>
            <Box component='span' sx={{ fontSize: 18 }}>
              ￥
            </Box>{' '}
            {formatNumberWithCommas(data.total_withdrawal_amount || 0)}
          </Box>
        </Stack>
        <Box sx={{ background: 'rgba(238, 238, 238, 1)', width: '1px', height: 40 }}></Box>
        <Stack gap={1} sx={{ width: '50%', pl: 3 }}>
          <Box sx={{ color: 'rgba(0, 0, 0, 0.50)', fontSize: 12 }}>提现中</Box>
          <Box sx={{ fontSize: 20, fontWeight: 700, color: '#000' }}>
            <Box component='span' sx={{ fontSize: 18 }}>
              ￥
            </Box>{' '}
            {formatNumberWithCommas(data.withdrawing_amount || 0)}
          </Box>
        </Stack>
      </Stack>
    </Card>
  )
}

export default WalletCard
