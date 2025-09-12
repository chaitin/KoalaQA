"use client";
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Table } from '@cx/ui'
import dayjs from 'dayjs'
import { formatNumberWithCommas } from '@/utils'
import { getPromotionStatistics } from '@/api'
import { useRequest } from 'ahooks'

const DailyStatisticsTable = forwardRef(
  (
    props,
    // {
    //   from,
    //   to,
    // }: {
    //   from: number
    //   to: number
    // },
    ref,
  ) => {
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const {
      data: { detail: dataSource, total } = { detail: [], total: 0 },
      loading,
      run,
    } = useRequest(
      ({ p = page, size = pageSize } = {}) =>
        getPromotionStatistics({
          page: p,
          size: size,
          // from,
          // to,
        }),
      {
        manual: true,
      },
    )
    const columns = [
      {
        dataIndex: 'date',
        title: '日期',
        width: 180,
      },
      {
        dataIndex: 'click_count',
        title: '点击数',
        width: 120,
        render(v: number) {
          return formatNumberWithCommas(v)
        },
      },
      {
        dataIndex: 'register_count',
        title: '注册数',
        width: 120,
        render(v: number) {
          return formatNumberWithCommas(v)
        },
      },
      {
        dataIndex: 'referral_order_count',
        title: '推荐下单数',
        width: 120,
        render(v: number) {
          return formatNumberWithCommas(v)
        },
      },
      {
        dataIndex: 'referral_order_amount',
        title: '推荐码下单总金额',
        width: 120,
        render(v: number) {
          return `￥${formatNumberWithCommas(v)}`
        },
      },
      {
        dataIndex: 'invite_order_count',
        title: '邀请用户下单数',
        width: 120,
        render(v: number) {
          return formatNumberWithCommas(v)
        },
      },
      {
        dataIndex: 'invite_order_amount',
        title: '邀请用户下单总金额',
        width: 120,
        render(v: number) {
          return `￥${formatNumberWithCommas(v)}`
        },
      },
    ]

    useImperativeHandle(ref, () => ({
      setPage,
    }))

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
  },
)

export default DailyStatisticsTable
