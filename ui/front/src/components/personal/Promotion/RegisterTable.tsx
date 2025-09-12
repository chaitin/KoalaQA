"use client";
import React, { useState, useEffect } from 'react'
import { Table, Ellipsis } from '@cx/ui'
import dayjs from 'dayjs'
import { Box, Stack } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { getPromotionInvitedUsers } from '@/api'
import { useRequest } from 'ahooks'
import defaultAvatar from '@/asset/img/default_avatar.png'
import { ApplicationInfo } from '@/types'

interface RegisterTableProps {
  data: any
  apps?: ApplicationInfo[]
}

const RegisterTable: React.FC<RegisterTableProps> = ({ data, apps }) => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const {
    data: { users: dataSource, total } = { users: [], total: 0 },
    loading,
    run,
  } = useRequest(
    ({ p = page, size = pageSize } = {}) =>
      getPromotionInvitedUsers({
        page: p,
        size,
      }),
    {
      manual: true,
    },
  )

  const columns = [
    {
      dataIndex: 'username',
      title: '用户名',
      render(value: string, record: any) {
        return (
          <Stack direction='row' alignItems='center' gap={1}>
            <Box
              component='img'
              sx={{ width: 22, height: 22, borderRadius: '50%' }}
              src={record.head_img || defaultAvatar}
            />
            <Ellipsis sx={{ width: 'calc(100% - 32px)', pt: '2px' }}>{value || '-'}</Ellipsis>
          </Stack>
        )
      },
    },

    {
      dataIndex: 'created_at',
      title: '注册日期',
      render(v: number) {
        return dayjs.unix(v).format('YYYY-MM-DD HH:mm:ss')
      },
    },
    {
      dataIndex: 'rebate_amount',
      title: '返现金额',
      width: 180,
      render(v: number) {
        return `￥${v}`
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

export default RegisterTable
