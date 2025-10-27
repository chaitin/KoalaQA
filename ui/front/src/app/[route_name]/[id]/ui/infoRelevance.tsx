'use client'
import { Box, Stack, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import { ModelDiscussionDetail } from '@/api/types'
import { useDebounceFn } from 'ahooks'

// import { MarkDown } from '@/components';
import EditorContent from '@/components/EditorContent'

interface MarkdownHeader {
  text: string
  level: string
  node: HTMLElement
}

const InfoRelevance = (props: { data: ModelDiscussionDetail }) => {
  const { data } = props
  const isClickRef = useRef(false)
  const [viewHTag, setViewTag] = useState<HTMLElement>()
  const [markdownTitle, setMarkdownTitle] = useState<MarkdownHeader[]>([])

  const getAllHTag = () => {
    const headers = document.getElementById('comment-card')!.querySelectorAll('h1, h2, h3, h4, h5, h6')

    const headersWithLevel = Array.from(headers).map((header) => {
      return {
        text: (header as HTMLElement).innerText, // 标题文本
        level: header.tagName.toLowerCase().charAt(1), // 标题级别（1 表示 h1, 2 表示 h2, 依此类推）
        node: header as HTMLElement,
      }
    })
    const hash = decodeURI(location.hash.slice(1))
    if (hash) {
      const target = headersWithLevel.find((item) => item.text.replaceAll('\n', '') === hash)
      if (target) {
        target.node.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })

        setViewTag(target.node as HTMLElement)
      }
    } else {
      run(headersWithLevel)
    }

    setMarkdownTitle(headersWithLevel)
  }

  const { run } = useDebounceFn(
    (mt = markdownTitle) => {
      if (isClickRef.current) {
        isClickRef.current = false
        return
      }
      const viewHeight = window.innerHeight || document.documentElement.clientHeight
      for (let i = 0; i < mt.length - 1; i++) {
        const { top, bottom } = mt[i].node.getBoundingClientRect()

        if (top > 100 && bottom < viewHeight) {
          setViewTag(mt[i].node)
          location.hash = mt[i].text
          break
        }
      }
    },
    {
      wait: 100,
    },
  )

  useEffect(() => {
    getAllHTag()
    // h1 标签重写为 h2 标签, 会导致dom引用不正确，需要重新获取
    // setTimeout(() => {
    //   // getAllHTag();
    // }, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => {
    const handleScroll = () => {
      run()
    }
    document.addEventListener('scroll', handleScroll)
    return () => {
      document.removeEventListener('scroll', handleScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <Stack
      gap={3}
      sx={{
        width: 280,
        position: 'sticky',
        top: 80,
        display: { xs: 'none', sm: 'flex' },
        flexDirection: 'column',
        alignSelf: 'flex-start',
      }}
    >
      {markdownTitle.length > 0 && (
        <Box
          sx={{
            width: '100%',
            borderRadius: 2,
            backgroundColor: '#fff',
            p: 2,
            pb: 2.5,
          }}
        >
          <Box sx={{ fontWeight: 600, fontSize: 16, color: '#000', mb: 2 }}>目录</Box>
          <Stack gap={1.5}>
            {markdownTitle.map((item) => (
              <Typography
                className='text-ellipsis'
                key={item.text}
                sx={{
                  pl: 2,
                  position: 'relative',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: item.node === viewHTag ? 'primary.main' : 'rgba(0,0,0,0.8)',
                  fontFamily: 'var(--font-mono)',
                  '&:hover': {
                    color: 'primary.main',
                    fontWeight: 500,
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 8,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: item.node === viewHTag ? 'primary.main' : '#eee',
                  },
                }}
                onClick={() => {
                  setViewTag(item.node)
                  location.hash = item.text
                  isClickRef.current = true
                  item.node.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  })
                }}
              >
                {item.text}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}
      <Box
        sx={{
          width: '100%',
          borderRadius: 2,
          backgroundColor: '#fff',
          p: 2,
          pb: 2.5,
        }}
      >
        <Box sx={{ fontWeight: 600, fontSize: 16, color: '#000', mb: 2 }}>AI 总结</Box>
        <EditorContent content={data.summary} />
      </Box>
    </Stack>
  )
}

export default InfoRelevance
