'use client'
import { H1Icon, H2Icon, H3Icon, H4Icon, H5Icon, H6Icon, TocList } from '@ctzhian/tiptap'
import { Ellipsis } from '@ctzhian/ui'
import { Box, Stack, Typography } from '@mui/material'

interface TocProps {
  headings: TocList
}

const HeadingIcon = [
  <H1Icon sx={{ fontSize: 12 }} key='h1' />,
  <H2Icon sx={{ fontSize: 12 }} key='h2' />,
  <H3Icon sx={{ fontSize: 12 }} key='h3' />,
  <H4Icon sx={{ fontSize: 12 }} key='h4' />,
  <H5Icon sx={{ fontSize: 12 }} key='h5' />,
  <H6Icon sx={{ fontSize: 12 }} key='h6' />,
]

const HeadingSx = [
  { fontSize: 14, fontWeight: 700, color: 'text.secondary' },
  { fontSize: 14, fontWeight: 400, color: 'text.auxiliary' },
  { fontSize: 14, fontWeight: 400, color: 'text.disabled' },
]

const Toc = ({ headings }: TocProps) => {
  const levels = Array.from(new Set(headings.map((it) => it.level).sort((a, b) => a - b))).slice(0, 3)
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
        {headings
          .filter((it) => levels.includes(it.level))
          .map((it) => {
            const idx = levels.indexOf(it.level)
            return (
              <Stack
                key={it.id}
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  cursor: 'pointer',
                  ':hover': {
                    color: 'primary.main',
                  },
                  ml: idx * 2,
                  ...HeadingSx[idx],
                  color: it.isActive ? 'primary.main' : (HeadingSx[idx]?.color ?? 'inherit'),
                }}
                onClick={() => {
                  const element = document.getElementById(it.id)
                  if (element) {
                    const offset = 100
                    const elementPosition = element.getBoundingClientRect().top
                    const offsetPosition = elementPosition + window.pageYOffset - offset
                    window.scrollTo({
                      top: offsetPosition,
                      behavior: 'smooth',
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
