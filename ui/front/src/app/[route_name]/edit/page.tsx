'use client'

import { getDiscussionDiscId, ModelDiscussionType } from '@/api'
import { ModelDiscussionDetail } from '@/api/types'
import { Card } from '@/components'
import { ReleaseModal } from '@/components/discussion'
import EditorWrap, { EditorWrapRef } from '@/components/editor'
import Toc from '@/components/Toc'
import { useForumStore } from '@/store'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { useSystemDiscussion } from '@/contexts/SystemDiscussionContext'
import { Box, Button, Stack, TextField } from '@mui/material'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

export default function EditPage() {
  const [headings, setHeadings] = useState<any[]>([])
  const params = useSearchParams()
  const routeParams = useParams()
  const routeName = routeParams?.route_name as string
  const setRouteName = useForumStore((s) => s.setRouteName)
  const forums = useForumStore((s) => s.forums)
  const router = useRouterWithRouteName()
  const { config: systemConfig } = useSystemDiscussion()
  const queryId = useMemo(() => params.get('id') || params.get('discId') || undefined, [params]) as string | undefined
  const urlType = params.get('type')
  const urlTitle = params.get('title')
  const [data, setData] = useState<ModelDiscussionDetail>({
    title: '',
    content: '',
    tags: [],
    type: ModelDiscussionType.DiscussionTypeBlog,
  })
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [titleTouched, setTitleTouched] = useState(false)
  const editorRef = useRef<EditorWrapRef>(null)
  const titleInitializedRef = useRef(false)

  // 根据 route_name 获取对应的 forumInfo
  const forumInfo = useMemo(() => {
    if (!routeName || !forums || forums.length === 0) return null
    return forums.find((f) => f.route_name === routeName) || null
  }, [routeName, forums])

  useEffect(() => {
    async function run() {
      if (!queryId) return
      const detail = await getDiscussionDiscId({ discId: queryId })
      if (detail) setData(detail)
    }
    run()
  }, [queryId])

  // Ensure forumStore knows current route_name (robustness against race)
  useEffect(() => {
    if (routeName) {
      setRouteName(routeName)
    }
  }, [routeName, setRouteName])

  // 从 URL 参数读取 type 和 title（仅在新建时）
  useEffect(() => {
    if (!queryId && !titleInitializedRef.current) {
      // 设置帖子类型
      if (urlType === 'qa') {
        setData((prev) => ({ ...prev, type: ModelDiscussionType.DiscussionTypeQA }))
      } else if (urlType === 'issue') {
        setData((prev) => ({ ...prev, type: ModelDiscussionType.DiscussionTypeIssue }))
      } else if (urlType === 'blog') {
        setData((prev) => ({ ...prev, type: ModelDiscussionType.DiscussionTypeBlog }))
      }

      // 设置标题（如果 URL 中有）
      if (urlTitle) {
        setData((prev) => ({ ...prev, title: decodeURIComponent(urlTitle) }))
        titleInitializedRef.current = true
      }
    }
  }, [queryId, urlType, urlTitle])

  // 当systemConfig加载完成时，如果是新建Q&A帖子且内容为空，则设置默认内容
  useEffect(() => {
    if (
      !queryId &&
      systemConfig?.content_placeholder &&
      !data.content &&
      data.type === ModelDiscussionType.DiscussionTypeQA
    ) {
      setData((prev) => ({
        ...prev,
        content: systemConfig.content_placeholder,
      }))
    }
  }, [systemConfig, queryId, data.content, data.type])

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
          pt: 0,
          minWidth: 0,
          maxWidth: { xs: '100%', lg: 798 },
          width: { xs: '100%', lg: 'auto' },
          px: { xs: 0, md: 3 },
        }}
      >
        <h1 style={{ display: 'none' }}>编辑讨论</h1>
        <Stack spacing={2}>
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
              sx={{ m: 0, '& fieldset': {
                borderColor: '#D9DEE2!important',
              }, }}
            />
            <Button
              variant={'contained'}
              color={'primary'}
              onClick={() => {
                const content = editorRef.current?.getContent() || ''
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
              border: '1px solid #D9DEE2',
              p: 2,
              borderRadius: 1,
              '& .md-container .MuiIconButton-root': {
                display: 'none',
              },
              '& .tiptap': {
                minHeight: '560px',
              },
              '& .editor-toolbar': {
                borderBottom: '1px solid #D9DEE2',
              },
            }}
          >
            <EditorWrap
              ref={editorRef}
              aiWriting
              mode='advanced'
              value={data.content}
              onTocUpdate={setHeadings}
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
          top: 24,
          height: 'calc(100vh - 64px)',
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
        type={data.type}
        forumInfo={forumInfo}
        showContentEditor={false}
      />
    </Box>
  )
}
