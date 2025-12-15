'use client'

import { getDiscussionDiscId, ModelDiscussionType } from '@/api'
import { postDiscussion, putDiscussionDiscId } from '@/api/Discussion'
import { ModelDiscussionDetail, ModelGroupItemInfo, SvcDiscussionCreateReq, SvcDiscussionUpdateReq } from '@/api/types'
import { Card } from '@/components'
import EditorContent from '@/components/EditorContent'
import EditorWrap, { EditorWrapRef } from '@/components/editor'
import Toc from '@/components/Toc'
import { useGroupData } from '@/contexts/GroupDataContext'
import { useForumStore } from '@/store'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { useSystemDiscussion } from '@/contexts/SystemDiscussionContext'
import Modal from '@/components/modal'
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import z from 'zod'
import DetailSidebarWrapper from '../[id]/ui/DetailSidebarWrapper'
import { useListPageCache } from '@/hooks/useListPageCache'

// 确保每个分类下至少选择一个子选项（无分类数据时跳过）
function validateGroupSelection(
  groupIds: number[],
  groups: Array<
    {
      items?: ModelGroupItemInfo[]
    } & Record<string, any>
  >,
) {
  if (!groups || groups.length === 0) return true
  for (const group of groups) {
    if (group.items && group.items.length > 0) {
      const hasSelection = group.items.some((item: ModelGroupItemInfo) => groupIds.includes(item.id!))
      if (!hasSelection) return false
    }
  }
  return true
}

// 概览限制为“纯文本”：尽量把常见 Markdown/HTML 格式符号降级为普通文本
function sanitizeSummaryPlainText(input: string) {
  let s = input || ''
  // 去掉 HTML 标签
  s = s.replace(/<[^>]*>/g, '')
  // 统一换行
  s = s.replace(/\r\n?/g, '\n')
  // 常见 Markdown：标题、引用、列表
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, '')
  s = s.replace(/^\s{0,3}>\s?/gm, '')
  s = s.replace(/^\s*(?:[-*+]|(\d+\.))\s+/gm, '')
  // 链接/图片保留可读文本
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // 行内代码、加粗/斜体/删除线
  s = s.replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1')
  s = s.replace(/\*([^*]+)\*/g, '$1')
  s = s.replace(/__([^_]+)__/g, '$1')
  s = s.replace(/_([^_]+)_/g, '$1')
  s = s.replace(/~~([^~]+)~~/g, '$1')
  // 分隔线
  s = s.replace(/^\s*(?:\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, '')
  return s
}

export default function EditPage() {
  const [discussion, setDiscussion] = useState<ModelDiscussionDetail | null>(null)
  const params = useSearchParams()
  const routeParams = useParams()
  const routeName = routeParams?.route_name as string
  const forums = useForumStore((s) => s.forums)
  const forumId = useForumStore((s) => s.selectedForumId)
  const router = useRouterWithRouteName()
  const { config: systemConfig } = useSystemDiscussion()
  const queryId = useMemo(() => params.get('id') || params.get('discId') || undefined, [params]) as string | undefined
  const urlType = params.get('type')
  const urlTitle = params.get('title')
  const editorRef = useRef<EditorWrapRef>(null)
  const titleInitializedRef = useRef(false)
  const { getFilteredGroups } = useGroupData()
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const [summaryDraft, setSummaryDraft] = useState('')

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, '标题不能为空').default(''),
        summary: z.string().default(''),
        content: z.string().default(''),
        group_ids: z.array(z.number()).min(1, '请选择至少一个分类').default([]),
        type: z.nativeEnum(ModelDiscussionType).default(ModelDiscussionType.DiscussionTypeBlog),
      }),
    [],
  )

  const {
    control,
    formState: { errors, isSubmitting, submitCount },
    reset,
    handleSubmit,
    register,
    watch,
    setError,
    clearErrors,
    setValue,
    getValues,
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      summary: '',
      content: '',
      group_ids: [],
      type: ModelDiscussionType.DiscussionTypeBlog,
    },
  })

  // summary 字段没有显式输入框，依赖侧边栏 setValue 写入；
  // 这里主动 register，确保 handleSubmit 的 vals 中能拿到最新的 summary。
  useEffect(() => {
    register('summary')
  }, [register])

  const title = watch('title')
  const summaryValue = watch('summary')
  const contentValue = watch('content')
  const { clearCache } = useListPageCache()
  const isBlogPost = (watch('type') || (urlType as any)) === ModelDiscussionType.DiscussionTypeBlog

  // 根据 route_name 获取对应的 forumInfo
  const forumInfo = useMemo(() => {
    if (!routeName || !forums || forums.length === 0) return null
    return forums.find((f) => f.route_name === routeName) || null
  }, [routeName, forums])

  const groups = useMemo(() => {
    return getFilteredGroups(undefined, forumInfo, urlType as 'qa' | 'blog' | 'issue')
  }, [getFilteredGroups, forumInfo, urlType])

  // 默认选中每个分类下的第一个子项（仅在新建且未选择分类时）
  const defaultGroupIds = useMemo(() => {
    if (!groups?.origin || groups.origin.length === 0) return []
    const ids: number[] = []
    groups.origin.forEach((g) => {
      const firstId = g.items?.[0]?.id
      if (typeof firstId === 'number') ids.push(firstId)
    })
    return ids
  }, [groups])
  useEffect(() => {
    // 仅在“新建”且当前没有选择任何分类时，填充默认值
    if (queryId) return
    const current = getValues('group_ids') || []
    if (Array.isArray(current) && current.length > 0) return
    if (defaultGroupIds.length === 0) return

    setValue('group_ids', defaultGroupIds, { shouldDirty: true, shouldValidate: true })
  }, [defaultGroupIds, queryId, getValues, setValue])

  useEffect(() => {
    async function run() {
      if (!queryId) return
      const detail = await getDiscussionDiscId({ discId: queryId })
      if (detail) {
        setDiscussion(detail as ModelDiscussionDetail)
        editorRef.current?.setContent(detail.content || '')
        reset({
          title: detail.title || '',
          summary: detail.summary || '',
          content: detail.content || '',
          group_ids: detail.group_ids || [],
          type: (detail.type as ModelDiscussionType) || ModelDiscussionType.DiscussionTypeBlog,
        })
      }
    }
    run()
  }, [queryId, reset])

  // 从 URL 参数读取 type 和 title（仅在新建时）
  useEffect(() => {
    if (!queryId && !titleInitializedRef.current) {
      // 设置标题（如果 URL 中有）
      setValue('type', urlType as any, { shouldDirty: true })
      if (urlTitle) {
        setValue('title', decodeURIComponent(urlTitle), { shouldDirty: true, shouldValidate: true })
        titleInitializedRef.current = true
      }
    }
  }, [queryId, urlType, urlTitle, setValue])

  // 当systemConfig加载完成时，如果是新建Q&A帖子且内容为空，则设置默认内容
  useEffect(() => {
    if (
      !queryId &&
      systemConfig?.content_placeholder &&
      !getValues('content') &&
      urlType === ModelDiscussionType.DiscussionTypeQA
    ) {
      setValue('content', systemConfig.content_placeholder, { shouldDirty: true })
    }
  }, [systemConfig, queryId, getValues, setValue, urlType])

  const submit = handleSubmit(async (vals) => {
    // 将编辑器内容同步进表单，再提交
    const editorContent = editorRef.current?.getContent() || ''
    setValue('content', editorContent, { shouldDirty: true, shouldValidate: true })

    const title = (vals.title || '').trim()
    // 用 getValues 拿最新值，避免 vals 快照没有包含侧边栏刚写入的 summary
    const summary = ((getValues('summary') as string) || vals.summary || '').trim()
    const selected = Array.isArray(vals.group_ids) ? vals.group_ids : []
    const list = groups?.origin || []
    if (list.length > 0 && !validateGroupSelection(selected, list)) {
      setError('group_ids', { type: 'manual', message: '请确保每个分类下至少选择一个子选项' })
      return
    }
    clearErrors('group_ids')

    try {
      if (queryId) {
        const payload: SvcDiscussionUpdateReq = {
          title,
          content: editorContent,
          group_ids: selected,
          summary: summary || undefined,
        }
        await putDiscussionDiscId({ discId: queryId + '' }, payload)
        router.push(`/${routeName}/${queryId}`)
        return
      }

      const payload: SvcDiscussionCreateReq = {
        forum_id: forumId || undefined,
        title,
        summary: isBlogPost && summary ? summary : undefined,
        content: editorContent,
        group_ids: selected,
        type: vals.type,
      }
      // 这里的 request 包装在项目内会直接返回 data（见 ReleaseModal 的用法）
      const uid: any = await postDiscussion(payload)

      if (vals.type === ModelDiscussionType.DiscussionTypeBlog) {
        const { showPointNotification, PointActionType } = await import('@/utils/pointNotification')
        showPointNotification(PointActionType.CREATE_ARTICLE)
      }
      clearCache()
      router.push(`/${routeName}/${uid}`)
    } finally {}
  })

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
          <Typography variant='h6'>
            {urlType === ModelDiscussionType.DiscussionTypeBlog
              ? queryId
                ? '编辑文章'
                : '发表文章'
              : urlType === ModelDiscussionType.DiscussionTypeIssue
                ? queryId
                  ? '编辑 Issue'
                  : '提交 Issue'
                : queryId
                  ? '编辑问题'
                  : '发帖提问'}
          </Typography>
          <TextField
            {...register('title')}
            size={'small'}
            label='标题'
            variant={'outlined'}
            placeholder={'请输入标题'}
            fullWidth
            required
            error={Boolean(errors.title)}
            helperText={(errors.title?.message as string) || ''}
            slotProps={{
              inputLabel: {
                shrink: Boolean(watch('title')),
              },
            }}
            sx={{
              m: 0,
              '& fieldset': {
                borderColor: '#D9DEE2!important',
              },
            }}
          />

        

          {/* 分类填写（页面内） */}
          <Controller
            name='group_ids'
            control={control}
            render={({ field }) => {
              const list = typeof groups.origin !== 'undefined' ? groups.origin : []
              const getId = (item: ModelGroupItemInfo) => item?.id as number
              const getLabel = (item: any) => item?.name ?? item?.title ?? item?.label ?? ''
              const selectedIds = Array.isArray(field.value) ? (field.value as number[]) : []

              return (
                <>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {list.map((topic) => {
                      const options = topic.items || []
                      const selectedForTopic = options.find(
                        (i) => typeof i?.id === 'number' && selectedIds.includes(i.id),
                      )
                      const hasError = submitCount > 0 && options.length > 0 && !selectedForTopic

                      return (
                        <Box
                          key={topic.id ?? topic.name}
                          sx={{
                            width: 'calc(50% - 8px)',
                            boxSizing: 'border-box',
                          }}
                        >
                          <FormControl
                            fullWidth
                            size='small'
                            required
                            error={Boolean(errors.group_ids) || hasError}
                            sx={{
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#D9DEE2',
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#D9DEE2',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#D9DEE2',
                              },
                            }}
                          >
                            <InputLabel>{topic.name}</InputLabel>
                            <Select
                              value={selectedForTopic?.id?.toString() || ''}
                              label={topic.name}
                              sx={{ fontSize: '12px' }}
                              onChange={(e) => {
                                const existing = Array.isArray(field.value) ? [...(field.value as number[])] : []
                                const otherIds = existing.filter(
                                  (id) => !options.some((o: ModelGroupItemInfo) => getId(o) === id),
                                )
                                const newId = e.target.value ? parseInt(e.target.value as string, 10) : null
                                const merged = newId ? Array.from(new Set([...otherIds, newId])) : otherIds
                                field.onChange(merged)
                                clearErrors('group_ids')
                              }}
                            >
                              {options.map((option) => (
                                <MenuItem key={getId(option)} value={getId(option).toString()}>
                                  {getLabel(option)}
                                </MenuItem>
                              ))}
                            </Select>
                            {hasError && <FormHelperText>请选择 {topic.name}</FormHelperText>}
                          </FormControl>
                        </Box>
                      )
                    })}
                  </Box>

                  {errors.group_ids?.message && (
                    <FormHelperText error sx={{ mt: 1 }}>
                      {errors.group_ids?.message as string}
                    </FormHelperText>
                  )}
                </>
              )
            }}
          />

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
              value={contentValue}
              onChange={(val) => {
                setValue('content', val || '', { shouldDirty: true })
              }}
              onTocUpdate={true}
              key={`editor-${queryId || 'new'}`}
            />
          </Box>
          <Stack direction={'row'} alignItems={'center'} justifyContent={'flex-end'} gap={2}>
            <Button
              variant={'text'}
              color={'primary'}
              onClick={() => {
                router.back()
              }}
              sx={{ flexShrink: 0 }}
            >
              取消
            </Button>
            <Button
              variant={'contained'}
              color={'primary'}
              onClick={submit}
              disabled={(title || '').trim() === '' || isSubmitting}
              sx={{ flexShrink: 0 }}
            >
              发布
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* 右侧边栏 - 仅在桌面端显示 */}
      <DetailSidebarWrapper
        type={(urlType as ModelDiscussionType) || discussion?.type}
        discussion={discussion ?? undefined}
        discId={discussion?.uuid ?? queryId}
        title={title}
        content={contentValue}
        groupIds={getValues('group_ids')}
        summary={summaryValue}
        onSummaryChange={(val) => {
          setValue('summary', val, { shouldDirty: true, shouldValidate: true })
        }}
      />

      {/* 概览编辑弹窗 */}
      <Modal
        title='文章概览'
        open={summaryModalOpen}
        onCancel={() => setSummaryModalOpen(false)}
        onOk={() => {
          setValue('summary', sanitizeSummaryPlainText(summaryDraft), { shouldDirty: true, shouldValidate: true })
          setSummaryModalOpen(false)
        }}
        okText='保存'
        cancelText='取消'
        width={720}
        okButtonProps={{
          disabled: false,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            value={summaryDraft}
            onChange={(e) => setSummaryDraft(sanitizeSummaryPlainText(e.target.value))}
            placeholder='请输入概览'
            fullWidth
            multiline
            minRows={10}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '13px',
              },
            }}
          />
          <Typography variant='body2' sx={{ color: 'text.secondary', fontSize: '12px' }}>
            留空则发布后自动生成概览
          </Typography>
        </Box>
      </Modal>
    </Box>
  )
}
