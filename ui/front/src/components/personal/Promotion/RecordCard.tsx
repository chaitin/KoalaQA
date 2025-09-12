"use client";
import React, { useRef, useImperativeHandle, useContext, useEffect } from 'react'
import { DatePicker } from 'antd'
import { Card } from '../common'
import { useRequest } from 'ahooks'
import dayjs from 'dayjs'
import { Tabs, Tab, Stack } from '@mui/material'
import RegisterTable from './RegisterTable'
import ReturnCashTable from './ReturnCashTable'
import WithdrawalTable from './WithdrawalTable'
import DailyStatisticsTable from './DailyStatisticsTable'
import { AuthContext } from '@/layout/Auth'

import { getAllApplications } from '@/api'

const { RangePicker } = DatePicker
const dateFormat = 'YYYY/MM/DD'

interface RecordCardProps {
  data: any
  refresh: () => void
}
const RecordCard = React.forwardRef(({ data, refresh }: RecordCardProps, ref) => {
  const { authInfo } = useContext(AuthContext)
  const orgInfo = authInfo?.orgInfo
  // const [range, setRange] = React.useState([dayjs().subtract(1, 'months'), dayjs()])
  const [value, setValue] = React.useState(0)
  const withdrawalTableRef = useRef<{ refresh: (p: any) => void }>(null)
  // const dailyStatisticsTableRef = useRef<{ setPage: (page: number) => void }>(null)
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }
  const { data: appData, run } = useRequest(getAllApplications, { manual: true })

  useEffect(() => {
    if (orgInfo?.id) {
      run({ org_id: orgInfo?.id })
    }
  }, [orgInfo?.id])

  useImperativeHandle(ref, () => ({
    refresh: () => {
      if (value === 2) {
        withdrawalTableRef.current?.refresh({ page: 1 })
      }
    },
  }))

  return (
    <Card>
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
        <Tabs value={value} onChange={handleChange} sx={{ mb: 3 }}>
          <Tab label='邀请注册名单' />
          <Tab label='订单返现记录' />
          <Tab label='提现记录' />
          <Tab label='每日统计' />
        </Tabs>
        {/* {value === 3 && (
          <RangePicker
            // @ts-ignore
            value={range}
            style={{ marginTop: '6px' }}
            format={dateFormat}
            allowClear={false}
            disabledDate={(current) => current > dayjs().endOf('day')}
            onChange={(e, data) => {
              // @ts-ignore
              setRange(e)
              dailyStatisticsTableRef.current?.setPage(1)
            }}
          />
        )} */}
      </Stack>

      {value === 0 && <RegisterTable data={data} apps={appData?.data} />}
      {value === 1 && <ReturnCashTable data={data} refresh={refresh} apps={appData?.data} />}
      {value === 2 && <WithdrawalTable ref={withdrawalTableRef} />}
      {value === 3 && (
        <DailyStatisticsTable
        // ref={dailyStatisticsTableRef}
        // from={range[0].startOf('day').unix()}
        // to={range[1].endOf('day').unix()}
        />
      )}
    </Card>
  )
})

export default RecordCard
