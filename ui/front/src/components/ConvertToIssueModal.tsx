'use client'
import {
  getDiscussion,
  postDiscussionDiscIdAssociate,
  postDiscussionDiscIdRequirement,
  postDiscussionSummary,
  ModelDiscussionDetail,
  ModelDiscussionListItem,
  ModelDiscussionType,
  ModelGroupItemInfo,
  ModelGroupWithItem,
  ModelForumInfo,
} from '@/api'
import { Message, StatusChip } from '@/components'
import EditorWrap, { EditorWrapRef } from '@/components/editor'
import Modal from '@/components/modal'
import { useGroupData } from '@/contexts/GroupDataContext'
import { useForumStore } from '@/store'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FormControlLabel from '@mui/material/FormControlLabel'
import Link from 'next/link'

interface ConvertToIssueModalProps {
  open: boolean
  onClose: () => void
  questionData: ModelDiscussionDetail
  onSuccess: () => void
  forumInfo?: ModelForumInfo | null
}

const ISSUE_TYPES = [
  { value: 'Bug', label: 'Bug' },
  { value: '需求', label: '需求' },
]

const ConvertToIssueModal = ({ open, onClose, questionData, onSuccess, forumInfo }: ConvertToIssueModalProps) => {
  const [mode, setMode] = useState<'associate' | 'create'>('associate')
  const [selectedIssueUuid, setSelectedIssueUuid] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [similarIssues, setSimilarIssues] = useState<ModelDiscussionListItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [issueType, setIssueType] = useState<string>('Bug')
  const [issueTitle, setIssueTitle] = useState<string>('')
  const [issueContent, setIssueContent] = useState<string>('')
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [groupIds, setGroupIds] = useState<number[]>([])
  const [groupValidationError, setGroupValidationError] = useState<string>('')
  const editorRef = useRef<EditorWrapRef>(null)
  const router = useRouter()
  const forumId = useForumStore((s) => s.selectedForumId)
  const { route_name } = (useParams() as any) || {}
  const { getFilteredGroups } = useGroupData()

  // 根据当前类型从 forumInfo.groups 中筛选对应的分类
  const currentType: 'qa' | 'feedback' | 'blog' | 'issue' = 'issue'

  // 使用 useMemo 缓存过滤后的分组数据
  const groups = useMemo(() => {
    return getFilteredGroups(undefined, forumInfo, currentType)
  }, [forumInfo, currentType, getFilteredGroups])

  // 获取默认选中的分类ID（所有分类的第一个子项）
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

  // 生成 AI 总结
  const generateAISummary = useCallback(async () => {
    if (!questionData.uuid) return
    setGeneratingSummary(true)
    try {
      // 使用 AI 总结 API 生成需求描述
      const aiSummary = await postDiscussionDiscIdRequirement({
        discId: questionData.uuid,
      })
      const content = aiSummary || questionData.content || questionData.summary || ''
      setIssueContent(content)
      editorRef.current?.setContent(content)
    } catch (error) {
      console.error('生成 AI 总结失败:', error)
      // 如果 AI 总结失败，使用问题帖的内容作为后备
      const fallbackContent = questionData.content || questionData.summary || ''
      setIssueContent(fallbackContent)
      editorRef.current?.setContent(fallbackContent)
    } finally {
      setGeneratingSummary(false)
    }
  }, [questionData.uuid, questionData.content, questionData.summary])

  // 初始化 groupIds
  useEffect(() => {
    if (open && mode === 'create' && defaultGroupIds.length > 0 && groupIds.length === 0) {
      setGroupIds(defaultGroupIds)
    }
  }, [open, mode, defaultGroupIds, groupIds.length])

  // 初始化：设置标题和生成 AI 总结
  useEffect(() => {
    if (open && mode === 'create') {
      setIssueTitle(questionData.title || '')
      setGroupIds(defaultGroupIds)
      // 生成 AI 总结
      generateAISummary()
    }
  }, [open, mode, questionData.title, defaultGroupIds, generateAISummary])

  // 关闭弹窗时重置状态
  useEffect(() => {
    if (!open) {
      setGroupIds([])
      setGroupValidationError('')
      setSelectedIssueUuid('')
      setSearchKeyword('')
      setSimilarIssues([])
    }
  }, [open])

  // 搜索相似 issue
  const searchSimilarIssues = useCallback(
    async (keyword: string) => {
      if (!keyword.trim() || !forumId) {
        setSimilarIssues([])
        return
      }

      setSearchLoading(true)
      try {
        const result = await getDiscussion({
          forum_id: forumId,
          size: 5,
          type: ModelDiscussionType.DiscussionTypeIssue,
          keyword: keyword.trim(),
        })
        const items = result.items || []
        setSimilarIssues(items)
        setSelectedIssueUuid('')
      } catch (error) {
        console.error('搜索相似 issue 失败:', error)
        setSimilarIssues([])
      } finally {
        setSearchLoading(false)
      }
    },
    [forumId],
  )

  // 初始加载时使用问题标题搜索
  useEffect(() => {
    if (open && mode === 'associate' && questionData.title) {
      setSearchKeyword(questionData.title)
      searchSimilarIssues(questionData.title)
    }
  }, [open, mode, questionData.title, searchSimilarIssues])

  // 处理搜索框回车事件
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchKeyword.trim()) {
      searchSimilarIssues(searchKeyword)
    }
  }

  // 验证分类选择
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

  const handleSubmit = async () => {
    if (mode === 'associate') {
      if (!selectedIssueUuid) {
        Message.error('请选择一个 Issue')
        return
      }
    } else {
      if (!issueTitle.trim()) {
        Message.error('请输入 Issue 标题')
        return
      }
      if (!issueType) {
        Message.error('请选择 Issue 类型')
        return
      }
      // 验证分类选择
      if (!validateGroupSelection(groupIds, groups.origin)) {
        setGroupValidationError('请确保每个分类下至少选择一个子选项')
        return
      }
      setGroupValidationError('')
    }

    setSubmitting(true)
    try {
      if (mode === 'associate') {
        await postDiscussionDiscIdAssociate(
          { discId: questionData.uuid || '' },
          {
            issue_uuid: selectedIssueUuid,
          },
        )
      } else {
        const content = editorRef.current?.getContent() || issueContent
        await postDiscussionDiscIdAssociate(
          { discId: questionData.uuid || '' },
          {
            title: issueTitle,
            content: content,
            group_ids: groupIds,
          },
        )
      }
      // 显示积分提示：问题转issue +5
      const { showPointNotification, PointActionType } = await import('@/utils/pointNotification')
      showPointNotification(PointActionType.QUESTION_TO_ISSUE)
      Message.success('操作成功')
      onSuccess()
      onClose()
    } catch (error: any) {
      Message.error(error?.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleIssueClick = (issue: ModelDiscussionListItem) => {
    if (route_name && issue.uuid) {
      window.open(`/${route_name}/${issue.uuid}`, '_blank')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      onCancel={onClose}
      title='Issue 管理'
      width={800}
      footer={
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button variant='contained' onClick={handleSubmit} disabled={submitting || generatingSummary}>
            {submitting ? '提交中...' : '提交'}
          </Button>
        </Box>
      }
    >
      <Stack spacing={3}>
        {/* 模式选择 */}
        <RadioGroup
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as 'associate' | 'create')
            setSelectedIssueUuid('')
            setSearchKeyword('')
            setSimilarIssues([])
          }}
          row
          sx={{
            '& .MuiFormControlLabel-label': { fontSize: '14px' },
          }}
        >
          <FormControlLabel value='associate' control={<Radio size='small' />} label='关联现有 Issue' />
          <FormControlLabel value='create' control={<Radio size='small' />} label='创建新 Issue' />
        </RadioGroup>

        {mode === 'associate' ? (
          <>
            {/* 搜索框 */}
            <TextField
              fullWidth
              placeholder='搜索 issue 标题'
              value={searchKeyword}
              size='small'
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <SearchIcon sx={{ color: 'rgb(0,0,0)', mr: 1 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* 相似 Issue 列表 */}
            {searchLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : similarIssues.length > 0 ? (
              <Box>
                <Typography variant='body2' sx={{ mb: 1, color: 'text.auxiliary' }}>
                  相似 Issue
                </Typography>
                <Stack spacing={2}>
                  {similarIssues.map((issue) => {
                    const isSelected = selectedIssueUuid === issue.uuid
                    // 根据 group_ids 获取分类名称
                    const getGroupName = (groupId: number): string => {
                      const groupItem = groups.flat.find((item) => item.id === groupId)
                      return groupItem?.name || ''
                    }
                    return (
                      <Link href={`/${route_name}/${issue.uuid}`} target='_blank'>
                        <Stack
                          key={issue.uuid}
                          spacing={1}
                          onClick={(e) => {
                            e.preventDefault()
                            setSelectedIssueUuid(issue.uuid || '')
                          }}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: '#fff',
                            border: '1px solid ',
                            borderColor: isSelected ? 'primary.main' : 'transparent',
                            borderRadius: 1,
                            boxShadow: '0px 0px 10px 0px rgba(54,59,76,0.1), 0px 0px 1px 1px rgba(54,59,76,0.03)',
                            p: 2,
                            color: isSelected ? 'primary.main' : '#21222D',
                            transition: 'all 0.2s',
                            '&:hover': {
                              '& .title': {
                                color: 'primary.main',
                              },
                            },
                          }}
                        >
                          <Typography
                            variant='body2'
                            className='title'
                            sx={{
                              flex: 1,
                              height: '22px',
                              fontFamily: 'PingFangSC, PingFang SC',
                              fontWeight: 600,
                              fontSize: '14px',
                              lineHeight: '22px',
                            }}
                          >
                            {issue.title}
                          </Typography>
                          <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' gap={0.5}>
                            <StatusChip type={ModelDiscussionType.DiscussionTypeIssue} resolved={issue.resolved} size='small' />
                            {issue.group_ids?.map((groupId) => {
                              const groupName = getGroupName(groupId)
                              if (!groupName) return null
                              return (
                                <Chip
                                  key={groupId}
                                  label={groupName}
                                  size='small'
                                  sx={{
                                    bgcolor: '#f5f5f5',
                                    color: '#000',
                                    fontSize: '12px',
                                    height: 22,
                                    lineHeight: '22px',
                                    borderRadius: '4px',
                                    fontWeight: 400,
                                  }}
                                />
                              )
                            })}
                          </Stack>
                        </Stack>
                      </Link>
                    )
                  })}
                </Stack>
              </Box>
            ) : searchKeyword ? (
              <Typography variant='body2' sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                未找到相似的 Issue
              </Typography>
            ) : null}
          </>
        ) : (
          <>
            {/* Issue 标题 */}
            <TextField
              fullWidth
              label='Issue 标题'
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder='输入 issue 标题...'
              size='small'
            />

            {/* Issue 类型 */}

            {/* Issue 分类选择 */}
            <Stack direction='row' sx={{ flexWrap: 'wrap' }} gap={3}>
              {groups.origin.map((topic) => {
                const options = topic.items || []
                const valueForTopic = topic.items?.filter((i) => groupIds.includes(i.id!))
                const getId = (item: ModelGroupItemInfo) => item?.id as number
                const getLabel = (item: any) => item?.name ?? item?.title ?? item?.label ?? ''
                return (
                  <Box
                    key={topic.id ?? topic.name}
                    sx={{
                      width: 'calc(50% - 12px)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <FormControl fullWidth size='small' required error={Boolean(groupValidationError)}>
                      <InputLabel>{topic.name}</InputLabel>
                      <Select
                        value={valueForTopic?.[0]?.id?.toString() || ''}
                        label={topic.name}
                        sx={{ fontSize: '12px' }}
                        onChange={(e) => {
                          const existing = Array.isArray(groupIds) ? [...(groupIds as number[])] : []
                          const otherIds = existing.filter(
                            (id) => !options.some((o: ModelGroupItemInfo) => getId(o) === id),
                          )
                          const newId = e.target.value ? parseInt(e.target.value as string, 10) : null
                          // 合并来自各个 Select 的选择，去重后回传
                          const merged = newId ? Array.from(new Set([...otherIds, newId])) : otherIds
                          setGroupIds(merged)
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
                      {groupValidationError && <FormHelperText>{groupValidationError}</FormHelperText>}
                    </FormControl>
                  </Box>
                )
              })}
            </Stack>

            {/* Issue 描述编辑器 */}
            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, minHeight: 220 }}>
              {generatingSummary ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                  <CircularProgress size={16} />
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    AI 正在生成描述...
                  </Typography>
                </Box>
              ) : (
                <EditorWrap ref={editorRef} value={issueContent} placeholder='输入 issue 的详细描述...' />
              )}
            </Box>
          </>
        )}
      </Stack>
    </Modal>
  )
}

export default ConvertToIssueModal
