'use client'

import { getDiscussionDiscId, ModelDiscussionType } from '@/api'
import { ModelDiscussionDetail } from '@/api/types'
import { Card } from '@/components'
import { ReleaseModal } from '@/components/discussion'
import EditorWrap, { EditorWrapRef } from '@/components/editor/edit/Wrap'
import Toc from '@/components/Toc'
import { useForum } from '@/contexts/ForumContext'
import { Box, Button, Stack, TextField } from '@mui/material'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

export default function EditPage() {
  const [headings, setHeadings] = useState<any[]>([])
  const params = useSearchParams()
  const routeParams = useParams()
  const routeName = routeParams?.route_name as string
  const { forums } = useForum()
  const queryId = useMemo(() => params.get('id') || params.get('discId') || undefined, [params]) as string | undefined
  const [data, setData] = useState<ModelDiscussionDetail>({
    title: '',
    content: '',
    tags: [],
    type: ModelDiscussionType.DiscussionTypeBlog,
  })
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [titleTouched, setTitleTouched] = useState(false)
  const [modalContent, setModalContent] = useState('')
  const editorRef = useRef<EditorWrapRef>(null)

  // 根据 route_name 获取对应的 forumInfo
  const forumInfo = useMemo(() => {
    if (!routeName || !forums || forums.length === 0) return null
    return forums.find((f) => f.route_name === routeName) || null
  }, [routeName, forums])

  // 根据 data.type 转换为 ReleaseModal 需要的 type
  const modalType = useMemo(() => {
    if (data.type === ModelDiscussionType.DiscussionTypeQA) return 'qa'
    if (data.type === ModelDiscussionType.DiscussionTypeFeedback) return 'feedback'
    return 'blog'
  }, [data.type])

  useEffect(() => {
    async function run() {
      if (!queryId) return
      const detail = await getDiscussionDiscId({ discId: queryId })
      if (detail) setData(detail)
    }
    run()
  }, [queryId])
  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(circle at 20% 80%, rgba(32, 108, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(32, 108, 255, 0.05) 0%, transparent 50%)',
          zIndex: -1,
          pointerEvents: 'none',
        },
      }}
    >
      <Box
        sx={{
          mt: '64px',
          width: '100%',
          height: 200,
          backgroundImage: 'url(/banner.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      />
      <Stack
        sx={{
          position: 'relative',
          top: '-100px',
          px: 3,
        }}
        direction={'row'}
        justifyContent='center'
        alignItems='flex-start'
        gap={3}
      >
        <Box sx={{ width: '290px', display: { xs: 'none', lg: 'block' } }} />
        <Box sx={{ width: { xs: '100%', sm: 800 } }}>
          <h1 style={{ display: 'none' }}>讨论详情</h1>
          <Card
            sx={{
              boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
              cursor: 'auto',
              maxWidth: '100%',
              minHeight: '90vh',
              '& .tiptap:focus': {
                background: '#fff!important',
              },
            }}
          >
            <Stack direction={'row'} alignItems={'baseline'} gap={3}>
              <TextField
                size={'small'}
                label={'标题'}
                variant={'outlined'}
                placeholder={'请输入标题'}
                fullWidth
                value={data.title || ''}
                onChange={(e) => setData({ ...data, title: e.target.value })}
                onBlur={() => setTitleTouched(true)}
                required
                error={titleTouched && (data.title || '').trim() === ''}
                helperText={titleTouched && (data.title || '').trim() === '' ? '标题不能为空' : ' '}
                sx={{ my: 1 }}
              />
              <Button
                variant={'contained'}
                color={'primary'}
                onClick={() => {
                  const content = editorRef.current?.getMarkdown() || ''
                  setModalContent(content)
                  setReleaseOpen(true)
                }}
                disabled={(data.title || '').trim() === ''}
              >
                发布
              </Button>
            </Stack>
            <EditorWrap
              ref={editorRef}
              aiWriting
              value={data.content}
              onTocUpdate={setHeadings}
              showActions={false}
              key={`editor-${queryId || 'new'}-${data.content ? 1 : 0}`}
            />
          </Card>
        </Box>
        <ReleaseModal
          open={releaseOpen}
          onClose={() => setReleaseOpen(false)}
          onOk={() => setReleaseOpen(false)}
          selectedTags={[]}
          status={queryId ? 'edit' : 'create'}
          initialTitle={data.title}
          data={data}
          id={queryId}
          initialContent={modalContent}
          type={modalType}
          forumInfo={forumInfo}
          showContentEditor={false}
        />
        <Card
          sx={{
            position: 'sticky',
            top: 90,
            maxHeight: '70vh',
            overflowY: 'auto',
            flexShrink: 0,
            width: '242px',
            display: { xs: 'none', lg: 'block' },
          }}
        >
          <Toc headings={headings} />
        </Card>
      </Stack>
    </Box>
  )
}
