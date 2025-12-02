'use client'
import { getRankContribute } from '@/api'
import { SvcRankContributeItem } from '@/api/types'
import CommonAvatar from '@/components/CommonAvatar'
import Icon from '@/components/icon'
import { Ellipsis } from '@ctzhian/ui'
import { Box, CircularProgress, IconButton, Paper, Stack, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type RankType = 1 | 3 // 1: 上周, 3: 总榜

export default function ContributorsRank() {
  const [rankType, setRankType] = useState<RankType>(1) // 默认显示上周
  const [contributors, setContributors] = useState<SvcRankContributeItem[]>([])
  const [contributorsLoading, setContributorsLoading] = useState(false)

  const fetchContributors = useCallback(async () => {
    try {
      setContributorsLoading(true)
      const response = await getRankContribute({ type: rankType })
      setContributors(response?.items || [])
    } catch (error) {
      console.error('Failed to fetch contributors:', error)
    } finally {
      setContributorsLoading(false)
    }
  }, [rankType])

  // 获取贡献达人榜单
  useEffect(() => {
    fetchContributors()
  }, [fetchContributors])

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: '#ffffff',
        borderRadius: 1,
        border: '1px solid #D9DEE2',
        p: 2,
        mb: 2,
      }}
    >
      <Stack direction='row' alignItems='center' justifyContent={'space-between'} sx={{ mb: 2 }}>
        <Stack direction='row' alignItems='center' gap={1}>
          <Image
            alt='crown'
            width={20}
            height={20}
            src='/crown.svg'
            style={{ position: 'relative', top: '-0.5px' }}
          />
          <Typography variant='subtitle2' sx={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
            贡献达人
          </Typography>
        </Stack>
        <Stack direction='row' alignItems='center' gap={1}>
          <IconButton
            size='small'
            aria-label='刷新贡献达人列表'
            onClick={() => {
              // 支持二次点击立即重新获取贡献达人
              fetchContributors()
            }}
            sx={{
              p: 0.5,
            }}
          >
            <Icon type='icon-shuaxin' sx={{ fontSize: 18, color: '#6b7280' }} />
          </IconButton>
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
            <Box
              onClick={() => setRankType(1)}
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: rankType === 1 ? 600 : 400,
                color: rankType === 1 ? '#111827' : 'rgba(33, 34, 45, 0.50)',
                bgcolor: rankType === 1 ? '#ffffff' : 'transparent',
                transition: 'all 0.2s',
                boxShadow: rankType === 1 ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                '&:hover': {
                  color: '#111827',
                },
              }}
            >
              上周
            </Box>
            <Box
              onClick={() => setRankType(3)}
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: rankType === 3 ? 600 : 400,
                color: rankType === 3 ? '#111827' : 'rgba(33, 34, 45, 0.50)',
                bgcolor: rankType === 3 ? '#ffffff' : 'transparent',
                transition: 'all 0.2s',
                boxShadow: rankType === 3 ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                '&:hover': {
                  color: '#111827',
                },
              }}
            >
              总榜
            </Box>
          </Stack>
        </Stack>
      </Stack>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {contributorsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={16} />
          </Box>
        ) : contributors.length === 0 ? (
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
                  <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
                    <Typography
                      variant='caption'
                      sx={{
                        fontFamily: 'Gilroy, Gilroy',
                        fontWeight: 500,
                        fontSize: '14px',
                        color: 'rgba(33, 34, 45, 1)',
                        lineHeight: '24px',
                        textAlign: 'right',
                        fontStyle: 'normal',
                      }}
                    >
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

