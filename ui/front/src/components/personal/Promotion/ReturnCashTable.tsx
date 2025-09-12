"use client";
import React, { useState, useEffect } from 'react'
import { Table, Ellipsis } from '@cx/ui'
import dayjs from 'dayjs'
import { Box, Stack, useTheme, Tooltip } from '@mui/material'
import HelpRoundedIcon from '@mui/icons-material/HelpRounded'
import { getPromotionOrders } from '@/api'
import { useRequest } from 'ahooks'
import defaultAvatar from '@/asset/img/default_avatar.png'
import { ApplicationInfo } from '@/types'
import { formatNumberWithCommas } from '@/utils'

interface ReturnCashTableProps {
  data: any
  refresh: () => void
  apps?: ApplicationInfo[]
}

const ReturnCashTable: React.FC<ReturnCashTableProps> = ({ data, apps, refresh }) => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const {
    data: { detail: dataSource, total } = { detail: [], total: 0 },
    loading,
    run,
  } = useRequest(
    ({ p = page, size = pageSize } = {}) =>
      getPromotionOrders({
        page: p,
        size: size,
      }),
    {
      manual: true,
    },
  )
  const columns = [
    {
      dataIndex: 'user',
      title: '用户名',
      render(value: any, record: any) {
        return (
          <Stack direction='row' alignItems='center' gap={1}>
            <Box
              component='img'
              sx={{ width: 22, height: 22, borderRadius: '50%' }}
              src={value.head_img || defaultAvatar}
            />
            <Ellipsis sx={{ width: 'calc(100% - 32px)', pt: '2px' }}>{value.username || '-'}</Ellipsis>
          </Stack>
        )
      },
    },
    {
      dataIndex: 'product_name',
      title: '产品',
    },
    {
      dataIndex: 'amount',
      title: '实付金额',
      width: 120,
      render(v: number) {
        return `¥ ${formatNumberWithCommas(v || 0)}`
      },
    },
    {
      dataIndex: 'payment_time',
      title: '购买日期',
      width: 180,
      render(v: number) {
        return dayjs.unix(v).format('YYYY-MM-DD HH:mm:ss')
      },
    },
    {
      dataIndex: 'source',
      title: '抽成形式',
      width: 120,
      render(v: 1 | 2) {
        const vToText = {
          1: '推荐码下单',
          2: '邀请用户下单',
        }
        return vToText[v] || '-'
      },
    },
    {
      dataIndex: 'rebate_amount',
      title: (
        <Stack direction='row' alignItems='center' gap={1}>
          <Box>返现金额</Box>
          <Tooltip
            slotProps={{
              tooltip: {
                sx: {
                  color: 'rgba(0, 0, 0, 0.7)',
                  fontSize: 14,
                },
              },
            }}
            title={
              <>
                邀请注册下单：（下单产品价格*5%订单折扣）*5%订单抽成 <br />
                推荐码下单：下单产品价格*（5%～30%）订单抽成
              </>
            }
            placement='top'
          >
            <HelpRoundedIcon
              sx={{
                fontSize: 16,
                cursor: 'pointer',
                color: 'rgba(0, 0, 0, 0.50)',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            ></HelpRoundedIcon>
          </Tooltip>
        </Stack>
      ),
      width: 180,
      render(v: number) {
        return `￥${formatNumberWithCommas(v || 0)}`
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
    />
  )
}

export default ReturnCashTable
