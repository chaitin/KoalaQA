'use client'

import { getDiscussionDiscId, ModelDiscussionType } from '@/api'
import { ModelDiscussionDetail } from '@/api/types'
import { Card } from '@/components'
import { ReleaseModal } from '@/components/discussion'
import EditorWrap, { EditorWrapRef } from '@/components/editor/edit/Wrap'
import Toc from '@/components/Toc'
import { useForum } from '@/contexts/ForumContext'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { Box, Button, Stack, TextField } from '@mui/material'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

export default function EditPage() {
  const [headings, setHeadings] = useState<any[]>([])
  const params = useSearchParams()
  const routeParams = useParams()
  const routeName = routeParams?.route_name as string
  const { forums } = useForum()
  const router = useRouterWithRouteName()
  const queryId = useMemo(() => params.get('id') || params.get('discId') || undefined, [params]) as string | undefined
  const [data, setData] = useState<ModelDiscussionDetail>({
    title: '',
    content: '',
    tags: [],
    type: ModelDiscussionType.DiscussionTypeBlog,
  })
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [titleTouched, setTitleTouched] = useState(false)
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
        display: 'flex',
        gap: { xs: 0, lg: 3 },
        justifyContent: { lg: 'center' },
        alignItems: { lg: 'flex-start' },
      }}
    >
      {/* 主内容区域 */}
      <Card
        sx={{
          flex: 1,
          minWidth: 0,
          maxWidth: { xs: '100%', lg: 798 },
          width: { xs: '100%', lg: 'auto' },
          px: { xs: 0, md: 3 },
        }}
      >
        <h1 style={{ display: 'none' }}>编辑讨论</h1>
        <Stack spacing={2} sx={{ py: 2 }}>
          <Stack direction={'row'} alignItems={'baseline'} gap={2}>
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
              sx={{ m: 0 }}
            />
            <Button
              variant={'contained'}
              color={'primary'}
              onClick={() => {
                const content = editorRef.current?.getHTML() || ''
                setData({ ...data, content })
                setReleaseOpen(true)
              }}
              disabled={(data.title || '').trim() === ''}
              sx={{ flexShrink: 0 }}
            >
              发布
            </Button>
          </Stack>
          <Box
            sx={{
              minHeight: '600px',
              '& .tiptap': {
                minHeight: '600px',
              },
              '& .tiptap:focus': {
                background: '#fff!important',
              },
            }}
          >
            <EditorWrap
              ref={editorRef}
              aiWriting
              value={data.content}
              onTocUpdate={setHeadings}
              showActions={false}
              key={`editor-${queryId || 'new'}-${data.content ? 1 : 0}`}
            />
          </Box>
        </Stack>
      </Card>

      {/* 右侧边栏 - 仅在桌面端显示 */}
      <Box
        sx={{
          width: 300,
          flexShrink: 0,
          display: { xs: 'none', lg: 'block' },
          pb: 3,
          pr: 3,
          position: 'sticky',
          top: 63,
          height: 'calc(100vh - 73px)',
        }}
      >
        <Stack spacing={3}>
          <Card
            sx={{
              top: 63,
              border: '1px solid #D9DEE2',
            }}
          >
            <Toc headings={headings} />
          </Card>
        </Stack>
      </Box>

      <ReleaseModal
        open={releaseOpen}
        onClose={() => setReleaseOpen(false)}
        onOk={() => {
          setReleaseOpen(false)
          // 如果是编辑模式，跳转到帖子详情页
          if (queryId) {
            router.push(`/${routeName}/${queryId}`)
          }
        }}
        selectedTags={[]}
        status={queryId ? 'edit' : 'create'}
        initialTitle={data.title}
        data={data}
        id={queryId}
        initialContent={data.content}
        type={modalType}
        forumInfo={forumInfo}
        showContentEditor={false}
      />
    </Box>
  )
}
