'use client'

import { postDiscussionComplete, postDiscussionUpload } from '@/api'
import alert from '@/components/alert'
import { EditorMarkdown, useTiptap } from '@ctzhian/tiptap'
import SaveIcon from '@mui/icons-material/Save'
import { Box, Button } from '@mui/material'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

interface WrapProps {
  aiWriting?: boolean
  onCancel?: () => void
  onSave?: (content: string) => void
  showActions?: boolean // 是否显示底部的保存和取消按钮，默认为true
  value?: string
  placeholder?: string
  height?: number
  onChange?: (value: string) => void // 双向绑定的变更回调，类似input组件的onChange
  onTocUpdate?: ((toc: any) => void) | boolean // 可选，默认false；true表示仅启用但不回调
}

export interface EditorWrapRef {
  getContent: () => string
  resetContent: () => void
}

const EditorWrap = forwardRef<EditorWrapRef, WrapProps>(
  (
    {
      onSave,
      onCancel,
      showActions = true,
      height = 100,
      value,
      placeholder = '请输入内容...',
      onChange,
      aiWriting,
      onTocUpdate,
    }: WrapProps,
    ref,
  ) => {
    const [isSaving, setIsSaving] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // 性能优化：缓存上次的内容和防抖定时器
    const lastContentRef = useRef<string>('')
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [innerValue, setInnerValue] = useState(value)
    // 确保只在客户端渲染编辑器
    useEffect(() => {
      setIsMounted(true)
    }, [])

    // 清理防抖定时器，避免内存泄漏
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }
      }
    }, [])

    const handleUpload = async (file: File, onProgress?: (progress: { progress: number }) => void) => {
      const formData = new FormData()
      formData.append('file', file)
      const key = await postDiscussionUpload(
        { file },
        {
          onUploadProgress: ({ progress }: { progress?: number }) => {
            onProgress?.({ progress: (progress || 0) / 100 })
          },
        },
      )
      return Promise.resolve(key as string)
    }
    const onAiWritingGetSuggestion = aiWriting
      ? async ({ prefix, suffix }: { prefix: string; suffix: string }) => {
          return postDiscussionComplete({ prefix, suffix })
        }
      : undefined
    const editorRef = useTiptap({
      contentType: 'markdown',
      editable: true,
      exclude: ['invisibleCharacters'],
      // SSR 环境需显式关闭立即渲染以避免水合不匹配
      immediatelyRender: false,
      onUpload: handleUpload,
      onTocUpdate: (toc: any) => {
        const enabled = !!onTocUpdate
        if (!enabled) return
        try {
          if (typeof onTocUpdate === 'function') {
            onTocUpdate(toc)
          }
        } catch {}
      },
      onAiWritingGetSuggestion: onAiWritingGetSuggestion,
      onValidateUrl: async (url: string, type: 'image' | 'video' | 'audio' | 'iframe') => {
        // 拦截 base64 链接
        if (url.startsWith('data:')) {
          throw new Error(`不支持 base64 链接，请使用可访问的 ${type} URL`)
        }

        // 根据不同类型做不同的验证
        switch (type) {
          case 'image':
            if (!url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
              console.warn('图片链接可能不是有效的图片格式')
            }
            break
          case 'video':
            if (!url.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)(\?.*)?$/i)) {
              console.warn('视频链接可能不是有效的视频格式')
            }
            break
          case 'audio':
            if (!url.match(/\.(mp3|wav|ogg|m4a|flac|aac|wma)(\?.*)?$/i)) {
              console.warn('音频链接可能不是有效的音频格式')
            }
            break
          case 'iframe':
            // iframe 可以嵌入任何 URL，但可以检查是否是 HTTPS
            if (url.startsWith('http://') && !url.includes('localhost')) {
              console.warn('建议使用 HTTPS 链接以确保安全性')
            }
            break
        }

        return url
      },
    })

    // 暴露命令式 API：getContent / getHTML / getText / resetContent
    useImperativeHandle(
      ref,
      () => ({
        getContent: () => {
          try {
            // useTiptap helper 统一使用 getContent 获取输入值
            return editorRef.getContent()
          } catch (e) {
            return ''
          }
        },
        getHTML: () => {
          try {
            // useTiptap helper 提供 getHTML
            return editorRef.editor.getHTML()
          } catch (e) {
            return ''
          }
        },
        getText: () => {
          try {
            return editorRef.editor.getText()
          } catch (e) {
            return ''
          }
        },
        resetContent: () => {
          try {
            if (editorRef.editor) {
              editorRef.editor.commands.setContent('')
              setInnerValue('')
              onChange?.('')
            }
          } catch (e) {
            console.error('重置编辑器内容失败:', e)
          }
        },
      }),
      [editorRef, onChange],
    )
    // 这些函数需要在editorRef初始化后定义
    const handleCancelEdit = () => {
      onCancel?.()
    }

    const handleSave: () => Promise<void> = async () => {
      if (!editorRef.getContent().trim()) {
        return alert.error('内容不能为空')
      }
      if (!onSave || !editorRef.editor) return

      setIsSaving(true)
      try {
        // 清除防抖定时器，确保获取最新内容
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        const content = editorRef.getContent()
        // 更新缓存内容
        lastContentRef.current = content
        await onSave(content)
      } catch (error) {
        console.error('保存失败:', error)
      } finally {
        setIsSaving(false)
      }
    }

    // 在服务端渲染时返回漂亮的占位符
    if (!isMounted) {
      return
    }

    // 客户端渲染的完整编辑器
    return (
      <>
        <Box
          ref={containerRef}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            transition: 'all 0.3s ease',
          }}
        >
          {/* 编辑器内容区域 */}
          <Box
            sx={{
              flex: 1,
              mt: 1,
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'auto',
              cursor: 'text',
              '& .ace_cursor': {
                opacity: 0,
              },
              '& > div > div': {
                bgcolor: '#fff',
              },
              // 隐藏滚动条
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              msOverflowStyle: 'none', // IE and Edge
              scrollbarWidth: 'none', // Firefox
            }}
            className='md-container'
          >
            {editorRef.editor && (
              <EditorMarkdown
                showLineNumbers={false}
                placeholder={placeholder}
                onUpload={handleUpload}
                splitMode={false}
                showAutocomplete={false}
                highlightActiveLine={false}
                defaultDisplayMode='edit'
                height={height}
                value={innerValue}
                editor={editorRef.editor}
                onAceChange={(value) => {
                  setInnerValue(value)
                  onChange?.(value)
                }}
              />
            )}
          </Box>

          {/* 操作按钮区域 - 只在showActions为true时显示 */}
          {showActions && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 2,
                p: 2,
                background: 'rgba(248, 249, 250, 0.5)',
                borderTop: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <Button
                variant='outlined'
                onClick={handleCancelEdit}
                disabled={isSaving}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                取消
              </Button>
              <Button
                variant='contained'
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={isSaving}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                {isSaving ? '提交中...' : '提交'}
              </Button>
            </Box>
          )}
        </Box>
      </>
    )
  },
)

export default EditorWrap
