'use client'
import { getRankContribute } from '@/api'
import { SvcRankContributeItem } from '@/api/types'
import CommonAvatar from '@/components/CommonAvatar'
import { Ellipsis } from '@ctzhian/ui'
import { Box, Divider, Paper, Stack, Typography } from '@mui/material'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type RankType = 1 | 3 // 1: 上周, 3: 总榜

export default function ContributorsRank() {
  const [rankType, setRankType] = useState<RankType>(1) // 默认显示上周
  // 存储两种类型的数据
  const [contributorsData, setContributorsData] = useState<{
    1: SvcRankContributeItem[]
    3: SvcRankContributeItem[]
  }>({
    1: [],
    3: [],
  })
  const [contributorsLoading, setContributorsLoading] = useState(false)

  // 获取当前选中类型的数据
  const contributors = contributorsData[rankType]

  // 获取指定类型的数据
  const fetchContributorsByType = useCallback(async (type: RankType) => {
    try {
      const response = await getRankContribute({ type })
      setContributorsData((prev) => ({
        ...prev,
        [type]: response?.items || [],
      }))
    } catch (error) {
      console.error(`Failed to fetch contributors (type ${type}):`, error)
    }
  }, [])

  // 获取所有类型的数据
  const fetchAllContributors = useCallback(async () => {
    try {
      setContributorsLoading(true)
      // 同时请求两种类型的数据
      await Promise.all([fetchContributorsByType(1), fetchContributorsByType(3)])
    } catch (error) {
      console.error('Failed to fetch all contributors:', error)
    } finally {
      setContributorsLoading(false)
    }
  }, [fetchContributorsByType])

  // 初始加载时获取所有数据
  useEffect(() => {
    fetchAllContributors()
  }, [fetchAllContributors])

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: '#ffffff',
        borderRadius: 1,
        border: (theme) => `1px solid ${theme.palette.mode === 'light' ? '#EAECF0' : '#393939'}`,
        p: 2,
        mb: 2,
      }}
    >
      <Stack direction='row' alignItems='center' justifyContent={'space-between'} sx={{ mb: 2 }}>
        <Stack direction='row' alignItems='center' gap={1}>
          <Typography variant='subtitle2' sx={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
            贡献达人
          </Typography>
        </Stack>
        <Stack direction='row' alignItems='center' gap={1}>
          {/* 切换标签 */}
          <Stack
            direction='row'
            alignItems='center'
            sx={{
              bgcolor: '#f3f4f6',
              borderRadius: '3px',
              p: 0.125,
              gap: 0,
            }}
          >
            {[
              { type: 1 as RankType, label: '上周' },
              { type: 3 as RankType, label: '总榜' },
            ].map(({ type, label }) => {
              const isActive = rankType === type
              return (
                <Box
                  key={type}
                  onClick={() => setRankType(type)}
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#111827' : 'rgba(33, 34, 45, 0.50)',
                    bgcolor: isActive ? '#ffffff' : 'transparent',
                    boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                  }}
                >
                  {label}
                </Box>
              )
            })}
          </Stack>
        </Stack>
      </Stack>
      <Divider />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pt: 1 }}>
        {contributorsLoading ? null : contributors.length === 0 ? (
          <Typography
            variant='caption'
            sx={{
              color: '#6b7280',
              fontSize: '0.7rem',
              lineHeight: 1.5,
            }}
          >
            暂无数据
          </Typography>
        ) : (
          contributors.map((contributor, index) => {
            const contributorProfileHref = contributor.id ? `/profile/${contributor.id}` : undefined
            return (
              <Box
                key={contributor.id || index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 0.75,
                  pl: 0,
                  borderRadius: '4px',
                  bgcolor: 'transparent',
                  border: 'none',
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '3px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    flexShrink: 0,
                    fontFamily: 'Gilroy',
                    fontStyle: 'italic',
                    letterSpacing: '-0.02em',
                    textRendering: 'optimizeLegibility',
                    WebkitFontSmoothing: 'antialiased',
                    background:
                      index === 0
                        ? 'linear-gradient(to bottom, #F64E54, #FB868D)'
                        : index === 1
                          ? 'linear-gradient(to bottom, #FC8664, #FBAD86)'
                          : index === 2
                            ? 'linear-gradient(to bottom, #FBC437, #FFE0A9)'
                            : 'linear-gradient(to bottom, #BCBCBC, #E1E1E1)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {index + 1}
                </Box>
                <Box
                  tabIndex={0}
                  sx={{
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 1,
                    transition: 'box-shadow 0.2s, border-color 0.2s, background 0.2s',
                    color: 'text.primary',
                    '&:focus-within, &:hover ': {
                      color: 'primary.main',
                    },
                    my: '-2px',
                    ml: '-4px',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {contributorProfileHref ? (
                    <Link href={contributorProfileHref} style={{ display: 'inline-flex' }} tabIndex={-1}>
                      <CommonAvatar src={contributor.avatar} name={contributor.name} />
                    </Link>
                  ) : (
                    <CommonAvatar src={contributor.avatar} name={contributor.name} />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', ml: 1 }}>
                    {contributorProfileHref ? (
                      <Link
                        href={contributorProfileHref || '/'}
                        style={{
                          fontWeight: 600,
                          color: 'inherit',
                          fontSize: '0.875rem',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textDecoration: 'none',
                          display: 'block',
                        }}
                        tabIndex={-1}
                      >
                        <Ellipsis>{contributor.name || '未知用户'}</Ellipsis>
                      </Link>
                    ) : (
                      <Typography
                        variant='body2'
                        sx={{
                          fontWeight: 600,
                          color: 'inherit',
                          fontSize: '0.875rem',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Ellipsis>{contributor.name || '未知用户'}</Ellipsis>
                      </Typography>
                    )}
                  </Box>
                </Box>
                {contributor.score !== undefined && (
                  <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0, alignItems: 'center' }}>
                    <Typography
                      variant='caption'
                      sx={{
                        fontFamily: 'Gilroy',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: 'rgba(33, 34, 45, 1)',
                        lineHeight: '24px',
                        textAlign: 'right',
                        fontStyle: 'normal',
                      }}
                    >
                      {contributor.score >= 0 && rankType === 1 ? '+' : ''}
                      {Math.ceil(contributor.score)}
                    </Typography>
                  </Box>
                )}
              </Box>
            )
          })
        )}
      </Box>
    </Paper>
  )
}
