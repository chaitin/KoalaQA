"use client";
import React, { useMemo } from 'react'
import { Box, LinearProgress, styled, linearProgressClasses, Stack, alpha, Tooltip } from '@mui/material'

import level_1_label from '@/asset/img/promotion/level_1_label.png'
import level_2_label from '@/asset/img/promotion/level_2_label.png'
import level_3_label from '@/asset/img/promotion/level_3_label.png'
import level_4_label from '@/asset/img/promotion/level_4_label.png'
import level_5_label from '@/asset/img/promotion/level_5_label.png'
import level_6_label from '@/asset/img/promotion/level_6_label.png'

import level_1_invite from '@/asset/img/promotion/level_1_invite.png'
import level_2_invite from '@/asset/img/promotion/level_2_invite.png'
import level_3_invite from '@/asset/img/promotion/level_3_invite.png'
import level_4_invite from '@/asset/img/promotion/level_4_invite.png'
import level_5_invite from '@/asset/img/promotion/level_5_invite.png'
import level_6_invite from '@/asset/img/promotion/level_6_invite.png'

import level_1_register from '@/asset/img/promotion/level_1_register.png'
import level_2_register from '@/asset/img/promotion/level_2_register.png'
import level_3_register from '@/asset/img/promotion/level_3_register.png'
import level_4_register from '@/asset/img/promotion/level_4_register.png'
import level_5_register from '@/asset/img/promotion/level_5_register.png'
import level_6_register from '@/asset/img/promotion/level_6_register.png'

import level_1_promote from '@/asset/img/promotion/level_1_promote.png'
import level_2_promote from '@/asset/img/promotion/level_2_promote.png'
import level_3_promote from '@/asset/img/promotion/level_3_promote.png'
import level_4_promote from '@/asset/img/promotion/level_4_promote.png'
import level_5_promote from '@/asset/img/promotion/level_5_promote.png'
import level_6_promote from '@/asset/img/promotion/level_6_promote.png'

import level_1_diamond from '@/asset/img/promotion/level_1_diamond.png'
import level_2_diamond from '@/asset/img/promotion/level_2_diamond.png'
import level_3_diamond from '@/asset/img/promotion/level_3_diamond.png'
import level_4_diamond from '@/asset/img/promotion/level_4_diamond.png'
import level_5_diamond from '@/asset/img/promotion/level_5_diamond.png'
import level_6_diamond from '@/asset/img/promotion/level_6_diamond.png'

import { Card } from '../common'
import getBlockGradient from '@/utils/getBlockGradient'
import { formatNumberWithCommas } from '@/utils'

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  flex: 1,
  height: 6,
  borderRadius: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: '#F2F2F2',
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    background: 'linear-gradient( 90deg, #BCD8FF 0%, #7DA1D3 100%)',
  },
}))

const StyledTextBold = styled('span')(({ theme }) => ({
  fontWeight: 700,
  fontSize: 16,
}))

interface LevelCardProps {
  data: any
}

const LEVEL_MAP = {
  1: {
    labelImg: level_1_label,
    cardBackground: 'linear-gradient( 180deg, #E8F0FF 0%, rgba(232,240,255,0) 40%, #fff 100%)',
    color: '#6094C3',
    registerImg: level_1_register,
    inviteImg: level_1_invite,
    diamondImg: level_1_diamond,
    promptImg: level_1_promote,
    commission: '5%',
    threshold: 0,
    levelColor: ['#83CDFA', '#6BA4EB'],
  },
  2: {
    labelImg: level_2_label,
    cardBackground: 'linear-gradient( 180deg, #C2D3ED 0%, rgba(194,211,237,0) 40%, #fff 100%)',
    color: '#6094C3',
    registerImg: level_2_register,
    inviteImg: level_2_invite,
    diamondImg: level_2_diamond,
    promptImg: level_2_promote,
    commission: '10%',
    threshold: 3000,
    levelColor: ['#BCD8FF', '#7DA1D3'],
  },
  3: {
    labelImg: level_3_label,
    cardBackground: 'linear-gradient( 180deg, #F6DDC4 0%, rgba(246,221,196,0) 40%, #fff 100%)',
    color: '#E2836E',
    registerImg: level_3_register,
    inviteImg: level_3_invite,
    diamondImg: level_3_diamond,
    promptImg: level_3_promote,
    commission: '15%',
    threshold: 10000,
    levelColor: ['#F0AF83', '#E2836E'],
  },
  4: {
    labelImg: level_4_label,
    cardBackground: 'linear-gradient( 180deg, #F8CF65 0%, rgba(248,207,101,0) 40%, #fff 100%)',
    color: '#D78E32',
    registerImg: level_4_register,
    inviteImg: level_4_invite,
    diamondImg: level_4_diamond,
    promptImg: level_4_promote,
    commission: '20%',
    threshold: 30000,
    levelColor: ['#F6CA51', '#E68639'],
  },
  5: {
    labelImg: level_5_label,
    cardBackground: 'linear-gradient( 180deg, #CDCCEC 0%, rgba(205,204,236,0) 40%, #fff 100%)',
    color: '#170D42',
    registerImg: level_5_register,
    inviteImg: level_5_invite,
    diamondImg: level_5_diamond,
    promptImg: level_5_promote,
    commission: '25%',
    threshold: 100000,
    levelColor: ['#8372B9', '#170D42'],
  },
  6: {
    labelImg: level_6_label,
    cardBackground: 'linear-gradient( 180deg, #090D20 0%, #212549 100%)',
    color: '#C8B8C8',
    registerImg: level_6_register,
    inviteImg: level_6_invite,
    diamondImg: level_6_diamond,
    promptImg: level_6_promote,
    commission: '30%',
    threshold: 300000,
    levelColor: ['#E1E0FD', '#F6D3DB'],
  },
}

const LevelCard: React.FC<LevelCardProps> = ({ data }) => {
  const level = data.level || 1

  const cur = LEVEL_MAP[level as keyof typeof LEVEL_MAP]

  const calcProgressValue = (index: number, level: number, diff_amount: number) => {
    let currentIndexAdd = index + 1
    if (currentIndexAdd === level) {
      const threshold = LEVEL_MAP[(level + 1) as keyof typeof LEVEL_MAP].threshold
      return ((threshold - data.diff_amount) / threshold) * 100
    } else if (currentIndexAdd < level) {
      return 100
    } else if (currentIndexAdd > level) {
      return 0
    }
  }

  const blockColors = useMemo(() => getBlockGradient(cur.levelColor[0], cur.levelColor[1], Math.min(level, 5)), [data])

  return (
    <Card sx={{ width: '50%', p: 0, pb: 3, position: 'relative', background: cur.cardBackground }}>
      <Box component='img' src={cur.diamondImg} sx={{ position: 'absolute', right: 20, top: -32, width: 130 }} />
      <Box sx={{ pt: 3, px: 4, borderRadius: 2 }}>
        <Stack direction='row' alignItems='flex-end' gap={2}>
          <Box component='img' src={cur.labelImg} sx={{ width: 60 }} />
          <Stack>
            <Box sx={{ color: cur.color, fontSize: 12, fontWeight: 300, mb: 0.5 }}>
              累计带动
              <Box component='span' sx={{ color: cur.color, fontWeight: 700, px: 0.5 }}>
                {formatNumberWithCommas(data.total_referral_amount || 0)}
              </Box>
              元订单
            </Box>
            {data.level !== 6 ? (
              <>
                <Box sx={{ color: alpha(cur.color, 0.5), fontSize: 12, mb: 1 }}>
                  还差
                  <Box component='span' sx={{ color: cur.color, fontWeight: 700, px: 0.5 }}>
                    {formatNumberWithCommas(data.diff_amount || 0)}
                  </Box>
                  元可升级
                </Box>
              </>
            ) : (
              <Box sx={{ color: cur.color, fontSize: 12, fontWeight: 300, mb: 1 }}>已达到最高等级，畅享最高权益</Box>
            )}
          </Stack>
        </Stack>
        <Stack direction='row' justifyContent='space-between' alignItems='center' gap={0.4} sx={{ mt: 4 }}>
          {new Array(5).fill(0).map((_, index) => (
            <BorderLinearProgress
              key={index}
              variant='determinate'
              value={calcProgressValue(index, level, data.diff_amount)}
              sx={{
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient( 90deg, ${blockColors[index] ? blockColors[index][0] : '#F2F2F2'} 0%, ${
                    blockColors[index] ? blockColors[index][1] : '#F2F2F2'
                  } 100%)`,
                },
              }}
            />
          ))}
        </Stack>
        <Stack direction='row' justifyContent='space-between' sx={{ mt: 0.5 }}>
          {new Array(6).fill(0).map((_, index) => (
            <Tooltip
              key={index}
              title={`￥${formatNumberWithCommas(
                LEVEL_MAP[(index + 1) as keyof typeof LEVEL_MAP].threshold,
              )} 可升级，享 ${LEVEL_MAP[(index + 1) as keyof typeof LEVEL_MAP].commission} 订单抽成`}
              placement='top'
            >
              <Box sx={{ fontSize: 12, color: alpha(cur.color, 0.5), cursor: 'pointer' }}>v{index + 1}</Box>
            </Tooltip>
          ))}
        </Stack>

        <Stack sx={{ mt: 3 }} gap={2}>
          <Stack direction='row' alignItems='center' gap={1}>
            <Box component='img' src={cur.inviteImg} sx={{ width: 40, height: 40 }} />
            <Stack>
              <Box sx={{ color: cur.color, fontWeight: 600, fontSize: 12 }}>邀请注册</Box>
              <Box sx={{ color: alpha(cur.color, 0.5), fontSize: 12 }}>
                每邀请一位用户可得 <StyledTextBold sx={{ color: cur.color }}>2</StyledTextBold> 元，
                <Box component='span' sx={{ pl: 1 }}>
                  永久享受被邀请用户在平台消费金额 <StyledTextBold sx={{ color: cur.color }}>5%</StyledTextBold> 的抽成
                </Box>
              </Box>
            </Stack>
          </Stack>
          <Stack direction='row' alignItems='center' gap={1}>
            <Box component='img' src={cur.promptImg} sx={{ width: 40, height: 40 }} />
            <Stack>
              <Box sx={{ color: cur.color, fontWeight: 600, fontSize: 12 }}>推荐码下单奖励</Box>
              <Box sx={{ color: alpha(cur.color, 0.5), fontSize: 12 }}>
                任意用户使用您的推荐码下单，您可获得订单金额
                <StyledTextBold sx={{ color: cur.color }}> {cur.commission} </StyledTextBold> 的抽成
              </Box>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Card>
  )
}

export default LevelCard
