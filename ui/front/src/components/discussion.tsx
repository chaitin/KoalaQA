'use client'
import {
  ModelDiscussionDetail,
  ModelDiscussionType,
  ModelGroupWithItem,
  ModelGroupItemInfo,
  SvcDiscussionCreateReq,
} from '@/api'
import { postDiscussion, putDiscussionDiscId } from '@/api/Discussion'
// import { Icon } from '@/components'
import UserAvatar from '@/components/UserAvatar'
import EditorWrap, { EditorWrapRef } from '@/components/editor/edit/Wrap'
import Modal from '@/components/modal'
import { useForum } from '@/contexts/ForumContext'
import { useForumId } from '@/hooks/useForumId'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { zodResolver } from '@hookform/resolvers/zod'
import { Autocomplete, Box, Chip, FormHelperText, Stack, styled, TextField } from '@mui/material'
import { useParams } from 'next/navigation'
import React, { useCallback, useContext, useEffect, useRef, useState, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import z from 'zod'
import { CommonContext } from './commonProvider'

export const Tag = styled(Chip)({
  borderRadius: '3px',
  height: 22,
  backgroundColor: '#F2F3F5',
})

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
  tags: z.array(z.string()).default([]).optional(),
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
    watch: _watch,
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
  })
  const [loading, setLoading] = useState(false)
  const [groupValidationError, setGroupValidationError] = useState<string>('')
  const { groups: contextGroups } = useContext(CommonContext)

  // 根据当前类型从 forumInfo.groups 中筛选对应的分类
  const currentType = type as 'qa' | 'feedback' | 'blog'
  
  // 稳定化 forumInfo.groups 的字符串表示
  const forumGroupsStr = useMemo(() => {
    return forumInfo?.groups ? JSON.stringify(forumInfo.groups) : ''
  }, [forumInfo?.groups])
  
  // 稳定化 contextGroups 的字符串表示
  const contextGroupsStr = useMemo(() => {
    return JSON.stringify({
      origin: contextGroups.origin,
      flat: contextGroups.flat,
    })
  }, [contextGroups.origin.length, contextGroups.flat.length])
  
  // 使用 useMemo 缓存 groups，避免每次渲染都创建新对象
  const groups = React.useMemo(() => {
    let forumGroupIds: number[] = []
    if (forumInfo?.groups) {
      if (Array.isArray(forumInfo.groups)) {
        const matchedGroup = forumInfo.groups.find((g: any) => g.type === currentType)
        forumGroupIds = matchedGroup?.group_ids || []
      } else if (typeof forumInfo.groups === 'object') {
        const groupsArray = Object.values(forumInfo.groups) as any[]
        const matchedGroup = groupsArray.find((g: any) => g?.type === currentType)
        forumGroupIds = matchedGroup?.group_ids || []
      }
    }

    // 如果 forumInfo.groups 存在且不为空，则根据 group_ids 过滤分类组
    // forumGroupIds 是分类组的 id（groups.origin 中每个 group 的 id），不是单个分类项的 id
    if (forumGroupIds.length > 0) {
      const filteredOrigin = contextGroups.origin.filter((group) => {
        // 只保留 group.id 在 forumGroupIds 中的分类组
        return forumGroupIds.includes(group.id || -1)
      })
      
      // flat 需要根据筛选后的 origin 重新计算，包含这些分类组下的所有分类项
      const filteredFlat = filteredOrigin.reduce((acc, group) => {
        if (group.items && group.items.length > 0) {
          acc.push(...group.items)
        }
        return acc
      }, [] as ModelGroupItemInfo[])
      
      return {
        origin: filteredOrigin,
        flat: filteredFlat,
      }
    }
    
    return contextGroups
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forumGroupsStr, currentType, contextGroupsStr])
  
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
    groups.origin.map(g => `${g.id}-${g.items?.[0]?.id || ''}`).join(','),
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
        tags: [],
        title: '',
      })
      setGroupValidationError('')
    } else if (status === 'create' && initialTitle) {
      // 当打开创建模态框且有初始标题时，设置标题并清空其他字段
      reset({
        title: initialTitle,
        content: initialContent || '',
        group_ids: defaultGroupIds,
        tags: [],
      })
    } else if (status === 'create') {
      // 当打开创建模态框但没有初始标题时，清空所有字段
      reset({
        content: initialContent || '',
        group_ids: defaultGroupIds,
        tags: [],
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

  return (
    <Modal
      title={`${
        status === 'create' ? (type === 'feedback' ? '提交反馈' : type === 'blog' ? '发布文章' : '发帖提问') : '编辑'
      }`}
      open={open}
      onCancel={onClose}
      onOk={() => {
        if (showContentEditor) {
          const content = editorRef.current?.getMarkdown() || ''
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
      <Stack gap={3}>
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
        />
        <Controller
          name='tags'
          control={control}
          render={({ field }) => (
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={field.value || []}
              onChange={(_, value) => {
                const normalized = Array.from(
                  new Set(value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter(Boolean)),
                )
                field.onChange(normalized)
              }}
              filterSelectedOptions
              size='small'
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => {
                  const { key, ...tagProps } = getTagProps({ index })
                  const label = (
                    <Stack direction='row' alignItems='center' gap={0.5}>
                      {`# ${option}`}
                    </Stack>
                  )
                  return (
                    <Tag
                      key={key}
                      label={label}
                      size='small'
                      sx={{
                        backgroundColor: '#F2F3F5',
                      }}
                      {...tagProps}
                    />
                  )
                })
              }
              renderOption={(props, option) => {
                const { key, ...optionProps } = props
                return (
                  <Box key={key} component='li' {...optionProps} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {option}
                  </Box>
                )
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='标签'
                  placeholder='输入后按回车可添加自定义标签'
                  error={!!errors.tags?.message}
                  helperText={errors.tags?.message as string}
                />
              )}
            />
          )}
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
                      <Autocomplete
                        options={options}
                        value={valueForTopic?.[0] || null}
                        isOptionEqualToValue={(option, value) => getId(option) === getId(value)}
                        getOptionLabel={(option) => getLabel(option)}
                        onChange={(_, newValue) => {
                          const existing = Array.isArray(field.value) ? [...(field.value as number[])] : []
                          const otherIds = existing.filter(
                            (id) => !options.some((o: ModelGroupItemInfo) => getId(o) === id),
                          )
                          const newId = newValue ? getId(newValue) : null
                          // 合并来自各个 Autocomplete 的选择，去重后回传
                          const merged = newId ? Array.from(new Set([...otherIds, newId])) : otherIds
                          field.onChange(merged)
                          // 清除验证错误
                          setGroupValidationError('')
                        }}
                        size='small'
                        renderOption={(props, option) => {
                          const { key, ...otherProps } = props
                          return (
                            <Box
                              key={key}
                              component='li'
                              {...otherProps}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              {getLabel(option)}
                            </Box>
                          )
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            required
                            label={`${topic.name}`}
                            placeholder='请选择'
                            error={Boolean(errors.group_ids) || Boolean(groupValidationError)}
                            helperText={(errors.group_ids?.message as string) || groupValidationError}
                          />
                        )}
                      />
                    </Box>
                  )
                })}
              </Box>
            )
          }}
        />
        {showContentEditor && (
          <Box>
            <Box
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: '#fff',
              }}
            >
              {/* 编辑器内容 */}
              <Box sx={{ p: 0 }}>
                <Controller
                  rules={{ required: '请输入内容' }}
                  name='content'
                  control={control}
                  render={({ field }) => (
                    <EditorWrap
                      ref={editorRef}
                      value={field.value || ''}
                      showActions={false}
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
