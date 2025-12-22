'use client'
import { ModelDiscussionDetail } from '@/api'
import { putDiscussionDiscId } from '@/api/Discussion'
import { getCsrfToken } from '@/api/httpClient'
import { Card } from '@/components'
import CustomLoadingButton from '@/components/CustomLoadingButton'
import EditorContent from '@/components/EditorContent'
import Toc from '@/components/Toc'
import Modal from '@/components/modal'
import SSEClient from '@/utils/fetch'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'

const OutlineSidebar = ({
  discussion,
  summary,
  onSummaryChange,
  title,
  content,
}: {
  discussion?: ModelDiscussionDetail
  /** 创建文章时从 form 传入的概览 */
  summary?: string
  /** 创建文章时写回 form */
  onSummaryChange?: (val: string) => void
  /** 创建文章时可用标题（用于 keyword） */
  title?: string
  /** 创建文章时可用正文（用于生成概览） */
  content?: string
}) => {
  const [headings, setHeadings] = useState<any[]>([])
  const router = useRouter()
  const pathname = usePathname()
  
  // 刷新页面但不增加浏览次数
  const refreshWithoutView = useCallback(() => {
    const url = new URL(pathname, window.location.origin)
    url.searchParams.set('refresh', 'true')
    router.replace(url.pathname + url.search)
  }, [pathname, router])

  const [localSummary, setLocalSummary] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [draftSummary, setDraftSummary] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sseClientRef = useRef<any>(null)

  const discUUID = discussion?.uuid
  // 只要传入 onSummaryChange，就认为处于“表单模式”（新建/编辑页），概览应写回 form，
  // 避免在编辑页直接 put 后端但 submit 仍用旧 summary 覆盖的问题。
  const isFormMode = typeof onSummaryChange === 'function'
  const effectiveTitle = (title || discussion?.title || '').trim()
  const effectiveContent = (content || discussion?.content || '').trim()

  useEffect(() => {
    // create mode: 来自 form；detail mode: 来自 discussion
    const next = (typeof summary === 'string' ? summary : discussion?.summary) || ''
    setLocalSummary(next)
  }, [discussion?.summary, summary])

  useEffect(() => {
    if (!modalOpen) return
    setDraftSummary(localSummary || '')
    setError(null)
  }, [modalOpen, localSummary])

  useEffect(() => {
    const handler = (e: any) => {
      const toc = e?.detail
      if (Array.isArray(toc)) {
        setHeadings(toc)
        try {
          ;(window as any).__lastToc = toc
        } catch {}
      } else {
        setHeadings([])
        try {
          ;(window as any).__lastToc = []
        } catch {}
      }
    }
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('toc-update', handler as any)
      }
    } catch {}
    return () => {
      try {
        if (typeof window !== 'undefined') {
          window.removeEventListener('toc-update', handler as any)
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    return () => {
      try {
        if (sseClientRef.current) {
          sseClientRef.current.unsubscribe()
          sseClientRef.current = null
        }
      } catch {}
    }
  }, [])

  const closeModal = () => {
    try {
      if (sseClientRef.current) {
        sseClientRef.current.unsubscribe()
        sseClientRef.current = null
      }
    } catch {}
    setIsGenerating(false)
    setError(null)
    setModalOpen(false)
  }

  const startGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setDraftSummary('')

    try {
      if (!effectiveTitle || !effectiveContent) {
        setError('需要先完成文章标题和内容的创作')
        setIsGenerating(false)
        return
      }

      const csrfToken = await getCsrfToken()
      const sseClient = new SSEClient<any>({
        url: '/api/discussion/content_summary',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
        },
        method: 'POST',
        streamMode: true,
        onError: (err) => {
          console.error('AI summary SSE error:', err)
          setError('AI 生成失败，请稍后重试')
          setIsGenerating(false)
        },
        onComplete: () => {
          setIsGenerating(false)
        },
        onCancel: () => {
          setIsGenerating(false)
        },
      })

      sseClientRef.current = sseClient

      const requestBody = JSON.stringify({
        title: effectiveTitle,
        content: effectiveContent,
      })

      sseClient.subscribe(requestBody, (data) => {
        let textToAdd = ''
        if (typeof data === 'string') {
          textToAdd = data
        } else if (data && typeof data === 'object') {
          textToAdd = data.content || data.text || data.data || data.chunk || data.message || data.result || data.summary || ''
        }

        if (textToAdd) {
          setDraftSummary((prev) => prev + textToAdd)
        }
      })
    } catch (err) {
      console.error('startGenerate failed:', err)
      setError('AI 生成失败，请稍后重试')
      setIsGenerating(false)
    }
  }

  const saveSummary = async () => {
    setError(null)
    const next = (draftSummary || '').trimEnd()

    // 表单模式（新建/编辑页）：只写回 form，最终由 submit 统一提交
    if (isFormMode) {
      onSummaryChange?.(next)
      setLocalSummary(next)
      setModalOpen(false)
      return
    }

    if (!discUUID) return
    if (!next.trim()) {
      setError('概览不能为空')
      return
    }

    await putDiscussionDiscId(
      { discId: discUUID },
      {
        title: discussion?.title || '',
        content: discussion?.content || '',
        group_ids: discussion?.group_ids || [],
        summary: next.trim(),
      },
    )

    setLocalSummary(next.trim())
    try {
      refreshWithoutView()
    } catch {}

    setModalOpen(false)
  }

  return (
    <Stack spacing={3} sx={{ display: { xs: 'none', sm: 'none', md: 'none', lg: 'block' } }}>
      <Card
        sx={{
          overflowY: 'auto',
          border: '1px solid #D9DEE2',
          flexShrink: 0,
          '& .editor-container p': {
            fontSize: '13px',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant='subtitle2' sx={{ fontSize: '14px' }}>
            文章概览
          </Typography>
          {isFormMode && (
            <Button
              variant='text'
              size='small'
              onClick={() => setModalOpen(true)}
              sx={{
                minWidth: 0,
                px: 0,
                fontSize: '12px',
                color: 'text.secondary',
                '&:hover': { background: 'transparent', color: 'text.primary' },
              }}
            >
              编辑
            </Button>
          )}
        </Box>

        {localSummary ? (
          isFormMode ? (
            <Typography variant='body2' sx={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
              {localSummary}
            </Typography>
          ) : (
            // <Box sx={{ bgcolor: 'background.default', py: 2, px: 1 }}>
            <EditorContent content={localSummary} />
          )
        ) : (
          // </Box>
          <Typography
            variant='body2'
            sx={{
              fontSize: '12px',
              color: 'text.secondary',
              textAlign: 'center',
            }}
          >
            {'暂无概览'}
          </Typography>
        )}
      </Card>
      <Card
        sx={{
          flexShrink: 0,
          border: '1px solid #D9DEE2',
        }}
      >
        <Toc headings={headings} />
      </Card>

      <Modal
        title='文章概览'
        open={modalOpen}
        onCancel={closeModal}
        onOk={saveSummary}
        width={720}
        okText='保存'
        cancelText='取消'
        okButtonProps={{
          // 表单模式允许为空（留空发布后可自动生成）；详情页编辑不允许为空
          disabled: isGenerating || (!isFormMode && !(draftSummary || '').trim()),
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label=''
            value={draftSummary}
            onChange={(e) => setDraftSummary(e.target.value)}
            placeholder='请输入概览'
            fullWidth
            multiline
            minRows={10}
            disabled={isGenerating}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '13px',
              },
            }}
          />

          <CustomLoadingButton
            variant='outlined'
            onClick={startGenerate}
            loading={isGenerating}
            sx={{
              borderColor: '#D9DEE2',
              color: 'text.primary',
              '&:hover': { borderColor: '#D9DEE2' },
            }}
          >
            点击此处，AI 自动生成概览
          </CustomLoadingButton>

          {error && (
            <Typography variant='body2' sx={{ color: 'error.main', fontSize: '12px' }}>
              {error}
            </Typography>
          )}
        </Box>
      </Modal>
    </Stack>
  )
}

export default OutlineSidebar
