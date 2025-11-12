'use client'
import {
  ModelDiscussionDetail,
  ModelDiscussionType,
  ModelGroupItemInfo,
  ModelGroupWithItem,
  SvcDiscussionCreateReq,
} from '@/api'
import { getDiscussion, postDiscussion, putDiscussionDiscId } from '@/api/Discussion'
import { ModelDiscussionListItem } from '@/api/types'
import UserAvatar from '@/components/UserAvatar'
import EditorWrap, { EditorWrapRef } from '@/components/editor/edit/Wrap'
import Modal from '@/components/modal'
import { useGroupData } from '@/contexts/GroupDataContext'
import { useForumId } from '@/hooks/useForumId'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { Ellipsis, Icon } from '@ctzhian/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  styled,
  TextField,
  Typography,
} from '@mui/material'
import { useParams } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import z from 'zod'
import { MarkDown, QaUnresolvedChip, DiscussionTypeChip } from '@/components'

export const Tag = styled(Chip)({
  borderRadius: '3px',
  height: 22,
  backgroundColor: '#F2F3F5',
})

// 相似内容项组件（与问题详情页的相关内容UI保持一致）
const SimilarContentItem = ({ data }: { data: ModelDiscussionListItem }) => {
  return (
    <Box
      sx={{
        py: 1,
        pl: 2,
        transition: 'all 0.2s',
        borderBottom: '1px solid #D9DEE2',
      }}
    >
      <Stack direction='row' alignItems='center' spacing={1}>
        <DiscussionTypeChip type={data.type} variant='default' />
        <Ellipsis
          sx={{
            fontWeight: 600,
            fontSize: 12,
            color: '#111827',
            mb: 1,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {data.title}
        </Ellipsis>
      </Stack>

      <Box
        sx={{
          mt: 1,
          color: 'rgba(33,34,45,0.5)',
          fontSize: '12px',
          lineHeight: '20px',
          height: '20px',
        }}
      >
        {data.type === ModelDiscussionType.DiscussionTypeBlog ? (
          <Ellipsis>{data.summary}</Ellipsis>
        ) : (
          <MarkDown content={data.content} sx={{
            fontSize: '12px',
            bgcolor: 'transparent',
            color: 'rgba(33,34,45,0.5)',
          }} />
        )}
      </Box>
    </Box>
  )
}

export const ImgLogo = styled('div')(({ theme: _theme }) => {
  return {
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
    padding: '2px',
    border: '1px solid #eee',
    borderRadius: '4px',
    fontSize: 14,
    lineHeight: 1,
    fontWeight: 600,
    textAlign: 'center',
    backgroundColor: '#fff',
    img: {
      display: 'block',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    },
  }
})

interface ReleaseModalProps {
  data?: ModelDiscussionDetail
  selectedTags: string[]
  status?: 'create' | 'edit'
  open: boolean
  onClose: () => void
  onOk: () => void
  initialTitle?: string
  type?: 'qa' | 'feedback' | 'blog'
  initialContent?: string
  forumInfo?: any // ModelForumInfo
  showContentEditor?: boolean
  id?: string
}
// 创建自定义验证函数，确保每个分类下至少选择一个子选项
const validateGroupSelection = (
  groupIds: number[],
  groups: (ModelGroupWithItem & {
    items?: ModelGroupItemInfo[]
  })[],
) => {
  if (!groups || groups.length === 0) {
    return true // 如果没有分类数据，跳过验证
  }

  // 检查每个分类是否至少有一个子选项被选中
  for (const group of groups) {
    if (group.items && group.items.length > 0) {
      const hasSelection = group.items.some((item: ModelGroupItemInfo) => groupIds.includes(item.id!))
      if (!hasSelection) {
        return false
      }
    }
  }

  return true
}

const schema = z.object({
  content: z.string().default(''),
  group_ids: z.array(z.number()).min(1, '请选择至少一个分类').default([]),
  title: z.string().min(1, '请输入讨论主题').default(''),
})
export const ReleaseModal: React.FC<ReleaseModalProps> = ({
  data,
  open,
  onClose,
  onOk,
  status = 'create',
  initialTitle,
  type = 'qa',
  initialContent,
  id,
  showContentEditor = true,
  forumInfo,
}) => {
  const {
    control,
    formState: { errors },
    reset,
    handleSubmit,
    register,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
  })

  // 监听表单字段变化
  const title = watch('title')
  const groupIds = watch('group_ids')
  const content = watch('content')
  const [loading, setLoading] = useState(false)
  const [groupValidationError, setGroupValidationError] = useState<string>('')
  const { getFilteredGroups } = useGroupData()

  // 相似内容相关状态
  const [similarDiscussions, setSimilarDiscussions] = useState<ModelDiscussionListItem[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 根据当前类型从 forumInfo.groups 中筛选对应的分类
  const currentType = type as 'qa' | 'feedback' | 'blog'

  // 使用 useMemo 缓存过滤后的分组数据
  const groups = useMemo(() => {
    return getFilteredGroups(undefined, forumInfo, currentType)
  }, [forumInfo, currentType, getFilteredGroups])

  const router = useRouterWithRouteName()
  const routeName = useParams()?.route_name as string
  const forumId = useForumId()

  // 获取默认选中的分类ID（所有分类的第一个子项）
  // 使用 useMemo 直接计算默认值，避免作为回调函数
  // 使用 groups.origin.length 和 groups.origin.map 来稳定依赖项
  const defaultGroupIds = useMemo(() => {
    if (!groups.origin || groups.origin.length === 0) return []
    const defaultIds: number[] = []

    groups.origin.forEach((group) => {
      if (group.items && group.items.length > 0) {
        defaultIds.push(group.items[0].id!)
      }
    })

    return defaultIds
  }, [
    groups.origin.length,
    // 使用 map 生成稳定的字符串来比较
    groups.origin.map((g) => `${g.id}-${g.items?.[0]?.id || ''}`).join(','),
  ])

  const onSubmit = handleSubmit(async (params) => {
    // 自定义验证：确保每个分类下至少选择一个子选项
    if (!validateGroupSelection(params.group_ids, groups.origin)) {
      setGroupValidationError('请确保每个分类下至少选择一个子选项')
      return // 阻止提交
    }

    // 清除验证错误
    setGroupValidationError('')
    const _params = { forum_id: forumId || undefined, ...params }
    setLoading(true)
    try {
      if (status === 'edit') {
        await putDiscussionDiscId({ discId: id + '' }, _params)
        // 编辑成功后调用 onOk 回调，其中包含页面刷新逻辑
        onOk()
      } else {
        const discussionData: SvcDiscussionCreateReq = { ..._params, type: type as ModelDiscussionType }
        const uid = await postDiscussion(discussionData)
        router.push(`/${routeName}/${uid}`)
      }
    } finally {
      setLoading(false)
    }
  })

  // 使用 useRef 存储上一次的 open 状态，避免重复调用 reset
  const prevOpenRef = useRef(open)

  useEffect(() => {
    // 只在 open 状态真正变化时才执行
    if (prevOpenRef.current === open) {
      return
    }
    prevOpenRef.current = open

    if (!open) {
      // 关闭弹窗时清空所有表单数据和验证错误
      reset({
        content: '',
        group_ids: [],
        title: '',
      })
      setGroupValidationError('')
    } else if (status === 'create' && initialTitle) {
      // 当打开创建模态框且有初始标题时，设置标题并清空其他字段
      reset({
        title: initialTitle,
        content: initialContent || '',
        group_ids: defaultGroupIds,
      })
    } else if (status === 'create') {
      // 当打开创建模态框但没有初始标题时，清空所有字段
      reset({
        content: initialContent || '',
        group_ids: defaultGroupIds,
        title: '',
      })
    }
  }, [open, initialTitle, initialContent, status, reset, defaultGroupIds])

  useEffect(() => {
    if (status === 'edit' && data && open) {
      reset(data)
    }
  }, [data, open, reset, status])

  const editorRef = useRef<EditorWrapRef>(null)

  // 查询相似内容的函数
  const searchSimilarDiscussions = useCallback(
    async (searchText: string, categoryIds?: number[]) => {
      if (!searchText.trim() || !forumId) {
        setSimilarDiscussions([])
        return
      }

      setSimilarLoading(true)
      try {
        const params: any = {
          forum_id: forumId,
          keyword: searchText.trim(),
          size: 5, // 只获取前5个结果
          type: 'qa', // 只查询问答类型
        }

        // 如果提供了分类，添加到查询参数中
        if (categoryIds && categoryIds.length > 0) {
          params.group_ids = categoryIds
        }

        const result = await getDiscussion(params)
        // 根据 API 实际返回结构，items 直接在 result 上（与 SearchResultModal 保持一致）
        // @ts-ignore - API 返回结构可能与类型定义不完全一致
        const items = result.items || result.data?.items || []
        setSimilarDiscussions(items)
      } catch (error) {
        console.error('查询相似内容失败:', error)
        setSimilarDiscussions([])
      } finally {
        setSimilarLoading(false)
      }
    },
    [forumId],
  )

  // 监听标题变化，触发查询（仅当 type === 'qa' 且 status === 'create' 时）
  useEffect(() => {
    if (status === 'create' && type === 'qa' && open) {
      // 清除之前的定时器
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // 如果标题有内容，延迟500ms后查询（防抖），同时传入分类信息
      if (title && title.trim()) {
        searchTimeoutRef.current = setTimeout(() => {
          searchSimilarDiscussions(title, groupIds)
        }, 500)
      } else {
        setSimilarDiscussions([])
      }

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
      }
    }
  }, [title, groupIds, status, type, open, searchSimilarDiscussions])

  // 监听分类变化，当分类改变且标题已填写时，触发查询
  useEffect(() => {
    if (status === 'create' && type === 'qa' && open && title && title.trim() && groupIds && groupIds.length > 0) {
      // 清除之前的定时器
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // 延迟300ms后查询（防抖）
      searchTimeoutRef.current = setTimeout(() => {
        searchSimilarDiscussions(title, groupIds)
      }, 300)

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
      }
    }
  }, [groupIds, title, status, type, open, searchSimilarDiscussions])

  // 标题输入完成（失去焦点）时立即调用一次接口
  const handleTitleBlur = useCallback(() => {
    if (status === 'create' && type === 'qa' && open && title && title.trim()) {
      // 清除防抖定时器
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      // 立即查询，传入分类信息
      searchSimilarDiscussions(title, groupIds)
    }
  }, [title, groupIds, status, type, open, searchSimilarDiscussions])

  // 编辑器内容变化状态
  const [editorContent, setEditorContent] = useState('')

  // 当标题、分类、内容都填写后，再次查询（更精准）
  useEffect(() => {
    if (status === 'create' && type === 'qa' && open) {
      // 清除之前的定时器
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // 如果标题、分类、内容都有内容，延迟800ms后查询（防抖）
      const hasTitle = title && title.trim()
      const hasGroups = groupIds && groupIds.length > 0
      const hasContent = editorContent.trim() || content?.trim()

      if (hasTitle && hasGroups && hasContent) {
        // 组合标题和内容进行更精准的查询，同时传入分类信息
        const combinedText = `${title} ${editorContent || content || ''}`
        searchTimeoutRef.current = setTimeout(() => {
          searchSimilarDiscussions(combinedText, groupIds)
        }, 800)
      }

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
      }
    }
  }, [title, groupIds, content, editorContent, status, type, open, searchSimilarDiscussions])

  // 关闭弹窗时清空相似内容
  useEffect(() => {
    if (!open) {
      setSimilarDiscussions([])
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [open])

  // 处理点击相似内容，在新标签页打开
  const handleSimilarItemClick = useCallback(
    (item: ModelDiscussionListItem) => {
      if (item.uuid) {
        const url = `/${routeName}/${item.uuid}`
        window.open(url, '_blank')
      }
    },
    [routeName],
  )

  // 判断是否显示相似内容栏
  const showSimilarContent = status === 'create' && type === 'qa'

  return (
    <Modal
      title={`${
        status === 'create' ? (type === 'feedback' ? '提交反馈' : type === 'blog' ? '发布文章' : '发帖提问') : '编辑'
      }`}
      open={open}
      onCancel={onClose}
      onOk={() => {
        if (showContentEditor) {
          const content = editorRef.current?.getHTML() || ''
          setValue('content', content, { shouldValidate: true, shouldDirty: true })
        }
        onSubmit()
      }}
      okText='发布'
      width={800}
      okButtonProps={{
        loading,
        id: 'submit-discussion-id',
      }}
    >
      <Box
        sx={{
          display: showSimilarContent ? 'flex' : 'block',
          gap: showSimilarContent ? 3 : 0,
          alignItems: showSimilarContent ? 'stretch' : 'flex-start',
          position: 'relative',
          minHeight: showSimilarContent ? '60vh' : 'auto',
        }}
      >
        <Box sx={{ flex: showSimilarContent ? 1 : 'none', minWidth: 0, width: showSimilarContent ? 'auto' : '100%', display: 'flex', flexDirection: 'column', minHeight: showSimilarContent ? '60vh' : 'auto' }}>
          <Stack gap={3} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <TextField
              {...register('title')}
              required
              variant='outlined'
              label={type === 'feedback' ? '反馈标题' : type === 'blog' ? '文章标题' : '你遇到了什么问题？'}
              fullWidth
              error={Boolean(errors.title)}
              helperText={errors.title?.message as string}
              size='small'
              autoComplete='off'
              onBlur={showSimilarContent ? handleTitleBlur : undefined}
            />
            <Controller
              name='group_ids'
              control={control}
              render={({ field }) => {
                const list = typeof groups.origin !== 'undefined' ? groups.origin : []

                const getId = (item: ModelGroupItemInfo) => item?.id as number
                const getLabel = (item: any) => item?.name ?? item?.title ?? item?.label ?? ''
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {list.map((topic) => {
                      const options = topic.items || []
                      const valueForTopic = topic.items?.filter((i) => field.value?.includes(i.id!))
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
                            error={Boolean(errors.group_ids) || Boolean(groupValidationError)}
                          >
                            <InputLabel>{topic.name}</InputLabel>
                            <Select
                              value={valueForTopic?.[0]?.id?.toString() || ''}
                              label={topic.name}
                              onChange={(e) => {
                                const existing = Array.isArray(field.value) ? [...(field.value as number[])] : []
                                const otherIds = existing.filter(
                                  (id) => !options.some((o: ModelGroupItemInfo) => getId(o) === id),
                                )
                                const newId = e.target.value ? parseInt(e.target.value as string, 10) : null
                                // 合并来自各个 Select 的选择，去重后回传
                                const merged = newId ? Array.from(new Set([...otherIds, newId])) : otherIds
                                field.onChange(merged)
                                // 清除验证错误
                                setGroupValidationError('')
                              }}
                            >
                              {options.map((option) => (
                                <MenuItem key={getId(option)} value={getId(option).toString()}>
                                  {getLabel(option)}
                                </MenuItem>
                              ))}
                            </Select>
                            {(errors.group_ids || groupValidationError) && (
                              <FormHelperText>
                                {(errors.group_ids?.message as string) || groupValidationError}
                              </FormHelperText>
                            )}
                          </FormControl>
                        </Box>
                      )
                    })}
                  </Box>
                )
              }}
            />
            {showContentEditor && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Box
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    overflow: 'hidden',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    '& > div': {
                      borderRadius: '8px !important',
                      overflow: 'hidden',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                    },
                  }}
                >
                  {/* 编辑器内容 */}
                  <Box sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, '& .tiptap': { flex: 1, minHeight: 0, overflow: 'auto' } }}>
                    <Controller
                      rules={{ required: '请输入内容' }}
                      name='content'
                      control={control}
                      render={({ field }) => (
                        <EditorWrap
                          ref={editorRef}
                          showToolbar={false}
                          value={field.value || ''}
                          showActions={false}
                          onChange={
                            // 只在问答类型时添加 onChange，用于相似内容查询
                            showSimilarContent
                              ? (content) => {
                                  // 更新编辑器内容状态，用于相似内容查询
                                  setEditorContent(content)
                                  // 同时更新表单字段
                                  field.onChange(content)
                                }
                              : field.onChange
                          }
                        />
                      )}
                    />
                  </Box>
                </Box>
                {errors.content?.message && (
                  <FormHelperText error id='component-error-text'>
                    {errors.content?.message as string}
                  </FormHelperText>
                )}
              </Box>
            )}
          </Stack>
        </Box>
        {/* 相似内容栏 - 右侧 */}
        {showSimilarContent && (
          <Box
            sx={{
              width: 320,
              minHeight: 200,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              background: 'rgba(0,99,151,0.03)',
              borderRadius: 1,
              border: '1px solid #D9DEE2',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                p: 2,
                flexShrink: 0,
              }}
            >
              <Stack
                direction='row'
                alignItems='center'
                gap={1}
                sx={{ fontSize: '12px', fontWeight: 400, color: 'primary.main' }}
              >
                {similarLoading ? (
                  <>
                    <img src='/search_loading.gif' alt='loading' style={{ width: 18, height: 18 }} />
                    <Box>相似帖子搜集中...</Box>
                  </>
                ) : (
                  <>
                    <Icon type='icon-xingxingzuhe' sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Box>相似帖子推荐</Box>
                  </>
                )}
              </Stack>
            </Box>

            {similarDiscussions.length > 0 && (
              <Box
                sx={{
                  maxHeight: 'calc(60vh - 60px)',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  flex: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    overflowX: 'hidden',
                    p: 2,
                    pt: 0,
                  }}
                >
                  {similarDiscussions.map((item, index) => (
                    <Box
                      key={item.id || index}
                      onClick={() => handleSimilarItemClick(item)}
                      sx={{
                        cursor: 'pointer',
                        overflow: 'hidden',
                        '&:hover .similar-item': {
                          bgcolor: '#f3f4f6',
                          borderColor: '#d1d5db',
                        },
                      }}
                    >
                      <Box className='similar-item'>
                        <SimilarContentItem data={item} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Modal>
  )
}

export const Avatar = ({ src, size = 20 }: { src?: string; size: number }) => {
  // 构造用户对象以适配 UserAvatar 组件
  const user = src && src.trim() !== '' ? { avatar: src } : undefined

  return (
    <UserAvatar
      user={user}
      fallbackSrc='/logo.png'
      showSkeleton={false}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        objectPosition: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '50%',
      }}
    />
  )
}
