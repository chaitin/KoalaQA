"use client";
import React, { useState, useEffect, useImperativeHandle } from 'react'
import { Table, Icon, Ellipsis, Message } from '@cx/ui'
import dayjs from 'dayjs'
import DoDisturbOnRoundedIcon from '@mui/icons-material/DoDisturbOnRounded'
import HelpRoundedIcon from '@mui/icons-material/HelpRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import { Box, Button, Stack, alpha, useTheme, styled, Tooltip } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { getPromotionWithdrawalRecords } from '@/api'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { useRequest } from 'ahooks'
import defaultAvatar from '@/asset/img/default_avatar.png'
import { render } from 'react-dom'

const Text = styled('span')(() => {
  return {
    color: 'rgba(0, 0, 0, 1)',
    fontSize: 14,
  }
})

const Text2 = styled('span')(() => {
  return {
    color: 'rgba(0, 0, 0, 0.20)',
    fontSize: 14,
  }
})

const WithdrawalTable = React.forwardRef((props, ref) => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const {
    data: { detail: dataSource, total } = { detail: [], total: 0 },
    loading,
    run,
  } = useRequest(
    ({ p = page, size = pageSize } = {}) =>
      getPromotionWithdrawalRecords({
        page: p,
        size,
      }),
    {
      manual: true,
    },
  )

  useImperativeHandle(ref, () => ({
    refresh: () => {
      run({ page: 1 })
    },
  }))

  const columns = [
    {
      dataIndex: 'amount',
      title: '金额',
      render(value: string, record: any) {
        return (
          <Stack gap={0.5}>
            <Stack direction='row' gap={1}>
              <Text2>提现金额</Text2>
              <Text>￥ {record.amount}</Text>
            </Stack>
            <Stack direction='row' gap={1}>
              <Text2>扣税金额</Text2>
              <Text>￥ {record.tax_deduction}</Text>
            </Stack>
            <Stack direction='row' gap={1}>
              <Text2>到账金额</Text2>
              <Text>￥ {record.arrival_amount}</Text>
            </Stack>
          </Stack>
        )
      },
    },

    {
      dataIndex: 'apply_time',
      title: '申请时间',
      render(v: number) {
        return dayjs.unix(v).format('YYYY-MM-DD HH:mm:ss')
      },
    },
    {
      dataIndex: 'release_time',
      title: '发放时间',
      render(v: number) {
        return v ? dayjs.unix(v).format('YYYY-MM-DD HH:mm:ss') : <Box sx={{ color: 'rgba(0,0,0,0.2)' }}>-</Box>
      },
    },
    {
      dataIndex: 'status',
      title: '状态',
      width: 180,
      render(v: 1 | 2 | 3, record: any) {
        return (
          <>
            {v === 1 && (
              <Stack direction='row' alignItems='center' gap={1} sx={{ color: 'rgba(0,0,0,0.2)' }}>
                <DoDisturbOnRoundedIcon sx={{ fontSize: 16 }} /> 未发放
              </Stack>
            )}
            {v === 2 && (
              <Stack direction='row' alignItems='center' gap={1} sx={{ color: 'success.main' }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                已发放
              </Stack>
            )}
            {v === 3 && (
              <Stack direction='row' alignItems='center' gap={1} sx={{ color: 'error.main' }}>
                <CancelRoundedIcon sx={{ fontSize: 16 }} /> 被拒绝
                <Tooltip title={<Box sx={{ color: 'rgba(0,0,0,0.5)' }}>{record.reason}</Box>} placement='top'>
                  <HelpRoundedIcon sx={{ fontSize: 16 }} />
                </Tooltip>
              </Stack>
            )}
          </>
        )
      },
    },
  ]

  const changePage = (page: number, pageSize: number) => {
    setPage(page)
    setPageSize(pageSize)
  }

  useEffect(() => {
    run()
  }, [page, pageSize])

  return (
    <Table
      loading={loading}
      columns={columns}
      dataSource={dataSource || []}
      PaginationProps={{
        sx: { m: 3 },
      }}
      sx={{
        mx: -3,
        '.MuiTableCell-root': {
          pl: 0,
          '&:first-of-type': {
            pl: 3,
          },
        },
      }}
      pagination={{
        sx: { mt: 2 },
        total,
        page,
        pageSize,
        onChange: changePage,
      }}
    ></Table>
  )
})

export default WithdrawalTable
