'use client'

import { Box, Button } from '@mui/material'
import { useEffect, useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react'
import { NodeDetail } from '..'
import SaveIcon from '@mui/icons-material/Save'
import { Editor, useTiptap, EditorProps } from '@ctzhian/tiptap'
import Toolbar from './Toolbar'
import { postDiscussionComplete, postDiscussionUpload } from '@/api'
import alert from '@/components/alert'

interface WrapProps {
  aiWriting?: boolean
  detail?: NodeDetail
  onCancel?: () => void
  onSave?: (content: string) => void
  showActions?: boolean // 是否显示底部的保存和取消按钮，默认为true
  showToolbar?: boolean // 是否显示顶部工具栏，默认为true
  value?: string // 用于双向绑定的值，当提供时会覆盖detail.content
  onChange?: (value: string) => void // 双向绑定的变更回调，类似input组件的onChange
  onTocUpdate?: ((toc: any) => void) | boolean // 可选，默认false；true表示仅启用但不回调
}

export interface EditorWrapRef {
  getMarkdown: () => string
  getHTML: () => string
  getText: () => string
}

const EditorWrap = forwardRef<EditorWrapRef, WrapProps>(
  (
    {
      detail,
      onSave,
      onCancel,
      showActions = true,
      showToolbar = true,
      value,
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
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const isUpdatingRef = useRef<boolean>(false)

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
          onUploadProgress: ({ progress }) => {
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
      editable: true,
      content: value || detail?.content || '',
      exclude: ['invisibleCharacters', 'youtube', 'mention', ...(aiWriting ? [] : ['aiWriting'])],
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

    // 暴露命令式 API：getMarkdown / getHTML
    useImperativeHandle(
      ref,
      () => ({
        getMarkdown: () => {
          try {
            return editorRef.editor.getHTML()
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
      }),
      [editorRef],
    )

    useEffect(() => {
      if (!editorRef.editor || !onChange) return

      const editor = editorRef.editor

      const handleUpdate = () => {
        try {
          const html = editor.getHTML()
          if (lastContentRef.current === html) {
            return
          }
          lastContentRef.current = html
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
          }
          debounceTimerRef.current = setTimeout(() => {
            onChange(html)
          }, 200)
        } catch (error) {
          console.error('处理编辑器变更失败:', error)
        }
      }

      editor.on('update', handleUpdate)

      return () => {
        editor.off('update', handleUpdate)
      }
    }, [editorRef.editor, onChange])

    // 这些函数需要在editorRef初始化后定义
    const handleCancelEdit = () => {
      onCancel?.()
    }

    const handleSave: () => Promise<void> = async () => {
      if (!editorRef.editor.getText().trim()) {
        return alert.error('内容不能为空')
      }
      if (!onSave || !editorRef.editor) return

      setIsSaving(true)
      try {
        // 清除防抖定时器，确保获取最新内容
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        const content = editorRef.getHTML()
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
      return (
        <>
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            {/* 工具栏占位符 */}
            {showToolbar && (
              <Box
                sx={{
                  height: 60,
                  background: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  px: 3,
                }}
              >
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        background: 'linear-gradient(45deg, #f8f9fa, #e9ecef)',
                        animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite alternate`,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* 编辑器占位符 */}
            <Box
              sx={{
                flex: 1,
                background: '#ffffff',
                m: 2,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #6c757d, #495057)',
                  animation: 'spin 2s linear infinite',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                }}
              >
                ✨
              </Box>
              <Box
                sx={{
                  color: 'text.secondary',
                  fontSize: 16,
                  fontWeight: 500,
                  textAlign: 'center',
                }}
              >
                编辑器正在加载中...
              </Box>
            </Box>

            {/* 保存按钮占位符 - 只在showActions为true时显示 */}
            {showActions && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                <Button
                  variant='contained'
                  startIcon={<SaveIcon />}
                  disabled
                  sx={{
                    background: 'linear-gradient(45deg, #6c757d, #495057)',
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  保存
                </Button>
              </Box>
            )}
          </Box>
        </>
      )
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
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '& .tiptap': {
              outline: 'none',
              border: 'none',
              borderRadius: 2,
              padding: 1,
              minHeight: showToolbar ? 200 : 'unset',
              fontSize: '15px',
              lineHeight: 1.7,
              color: '#212529',
              background: 'transparent',
              transition: 'all 0.2s ease',
              '&:focus': {
                outline: 'none',
                background: 'rgba(248, 249, 250, 0.5)',
              },
              '& p': {
                margin: '0.5em 0',
              },
              '& h1, & h2, & h3': {
                color: '#212529',
                fontWeight: 600,
                margin: '1em 0 0.5em 0',
              },
              '& ul, & ol': {
                paddingLeft: '1.5em',
                margin: '0.5em 0',
              },
              '& blockquote': {
                borderLeft: '4px solid #6c757d',
                paddingLeft: '1em',
                margin: '1em 0',
                fontStyle: 'italic',
                background: 'rgba(108, 117, 125, 0.1)',
                borderRadius: '0 8px 8px 0',
              },
              '& code': {
                background: 'rgba(0,0,0,0.08)',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: '0.9em',
                fontFamily: 'Monaco, Consolas, monospace',
              },
              '& a': {
                color: '#495057',
                textDecoration: 'none',
                fontWeight: 500,
                '&:hover': {
                  textDecoration: 'underline',
                },
              },
            },
          }}
        >
          {/* 现代化工具栏 */}
          {showToolbar && (
            <Box
              sx={{
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                py: 1,
              }}
            >
              <Toolbar editorRef={editorRef} />
            </Box>
          )}

          {/* 编辑器内容区域 */}
          <Box
            sx={{
              flex: 1,
              mt: 1,
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'auto',
              cursor: 'text',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                transition: 'all 0.3s ease',
              },
            }}
          >
            {editorRef.editor ? (
              <Editor editor={editorRef.editor} />
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    animation: 'spin 2s linear infinite',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 20,
                  }}
                >
                  ✨
                </Box>
                <Box
                  sx={{
                    color: 'text.secondary',
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  编辑器加载中...
                </Box>
              </Box>
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
