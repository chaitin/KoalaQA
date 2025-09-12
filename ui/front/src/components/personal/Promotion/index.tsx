"use client";
import { useRef } from 'react'
import { Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { getPromotionInfo } from '@/api'
import LevelCard from './LevelCard'
import PromotionCodeCard from './PromotionCodeCard'
import RecordCard from './RecordCard'
import WalletCard from './WalletCard'

const Promotion = () => {
  const navigate = useNavigate()
  const recordCardRef = useRef<{ refresh: () => void }>(null)
  const {
    data = {
      level: 1,
    },
    refresh,
  } = useRequest(getPromotionInfo, {
    onSuccess: (res) => {
      if (!res.referral_code) {
        navigate('/console/personal/base?join=1')
      }
    },
  })

  return data.referral_code ? (
    <Stack gap={3}>
      <Stack direction='row' gap={3}>
        <LevelCard data={data} />
        <WalletCard
          data={data}
          refresh={() => {
            refresh()
            recordCardRef.current?.refresh()
          }}
        />
      </Stack>
      <PromotionCodeCard data={data} />
      <RecordCard data={data} ref={recordCardRef} refresh={refresh} />
    </Stack>
  ) : null
}

export default Promotion
