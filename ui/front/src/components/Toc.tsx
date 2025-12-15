'use client'
import { TocList } from '@ctzhian/tiptap'
import { Ellipsis } from '@ctzhian/ui'
import { Box, Stack, Typography } from '@mui/material'
import { useMemo } from 'react'

interface TocProps {
  headings: TocList
}

const HeadingSx = [
  { fontSize: 14, fontWeight: 700, color: 'text.secondary' },
  { fontSize: 14, fontWeight: 400, color: 'text.auxiliary' },
  { fontSize: 14, fontWeight: 400, color: 'text.disabled' },
]

const Toc = ({ headings }: TocProps) => {
  const renderHeadings = useMemo(() => {
    // 合并计算 levels 和 renderHeadings，避免 levels 数组引用变化导致重复计算
    const levels = Array.from(new Set(headings.map((it) => it.level).sort((a, b) => a - b))).slice(0, 3)
    return headings
      .filter((it) => levels.includes(it.level))
      .map((i) => ({
        ...i,
        idx: levels.indexOf(i.level),
      }))
  }, [headings])

  return (
    <>
      <Stack
        direction={'row'}
        justifyContent={'space-between'}
        alignItems={'center'}
        sx={{
          fontSize: 14,
          fontWeight: 'bold',
          mb: 1,
          pb: 0,
        }}
      >
        <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#111827', fontSize: '14px', mb: 2 }}>
          内容大纲
        </Typography>
      </Stack>
      <Stack
        gap={1}
        sx={{
          height: 'calc(100% - 146px)',
          overflowY: 'auto',
        }}
      >
        {renderHeadings.map((it, index) => {
          return (
            <Stack
              key={index}
              direction={'row'}
              alignItems={'center'}
              gap={1}
              sx={{
                cursor: 'pointer',
                ':hover': {
                  color: 'primary.main',
                },
                ml: it.idx * 2,
                ...HeadingSx[it.idx],
                color: it.isActive ? 'primary.main' : (HeadingSx[it.idx]?.color ?? 'inherit'),
              }}
              onClick={() => {
                const element = document.getElementById(it.id)
                if (element) {
                  // 直接使用 scrollIntoView，浏览器会自动处理滚动（包括在容器内的滚动）
                  element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }
              }}
            >
              <Ellipsis arrow sx={{ flex: 1, width: 0 }}>
                {it.textContent}
              </Ellipsis>
            </Stack>
          )
        })}
      </Stack>
    </>
  )
}

export default Toc
