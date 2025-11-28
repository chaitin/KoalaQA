'use client';

import { postDiscussionComplete, postDiscussionUpload } from '@/api';
import { Editor, EditorThemeProvider, EditorToolbar, useTiptap } from '@ctzhian/tiptap';
import { Box } from '@mui/material';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

interface WrapProps {
  aiWriting?: boolean;
  value?: string;
  placeholder?: string;
  readonly?: boolean;
  mode?: 'advanced' | 'simple';
  onChange?: (value: string) => void; // 双向绑定的变更回调，类似input组件的onChange
  onTocUpdate?: ((toc: any) => void) | boolean; // 可选，默认false；true表示仅启用但不回调
}

export interface EditorWrapRef {
  getContent: () => string;
  getHTML: () => string;
  getText: () => string;
  resetContent: () => void;
  setContent: (content: string) => void;
  setReadonly: (readonly: boolean) => void;
}

const EditorWrap = forwardRef<EditorWrapRef, WrapProps>(
  (
    {
      value,
      placeholder = '请输入内容...',
      onChange,
      aiWriting,
      onTocUpdate,
      mode = 'simple',
      readonly = false,
    }: WrapProps,
    ref
  ) => {
    const [isMounted, setIsMounted] = useState(false);

    // 性能优化：缓存上次的内容和防抖定时器
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // 确保只在客户端渲染编辑器
    useEffect(() => {
      setIsMounted(true);
    }, []);

    // 清理防抖定时器，避免内存泄漏
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const handleUpload = async (
      file: File,
      onProgress?: (progress: { progress: number }) => void
    ) => {
      const formData = new FormData();
      formData.append('file', file);
      const key = await postDiscussionUpload(
        { file },
        {
          onUploadProgress: ({ progress }: { progress?: number }) => {
            onProgress?.({ progress: (progress || 0) / 100 });
          },
        }
      );
      return Promise.resolve(key as string);
    };

    const handleEditorUpdate = useCallback(
      ({ editor }: { editor: any }) => {
        if (!onChange) return;
        try {
          const markdown = editor?.getMarkdown();
          if (typeof markdown === 'string') {
            onChange(markdown);
            return;
          }
        } catch (error) {
          console.error('处理编辑器更新失败:', error);
        }
      },
      [onChange]
    );

    const onAiWritingGetSuggestion = aiWriting
      ? async ({ prefix, suffix }: { prefix: string; suffix: string }) => {
          return postDiscussionComplete({ prefix, suffix });
        }
      : undefined;
    const editorRef = useTiptap({
      contentType: 'markdown',
      editable: !readonly,
      exclude: ['invisibleCharacters'],
      // SSR 环境需显式关闭立即渲染以避免水合不匹配
      immediatelyRender: false,
      onUpload: handleUpload,
      placeholder,
      content: value || '',
      onTocUpdate: (toc: any) => {
        const enabled = !!onTocUpdate;
        if (!enabled) return;
        try {
          if (typeof onTocUpdate === 'function') {
            onTocUpdate(toc);
          }
        } catch {
          console.error('处理 TOC 更新失败:');
        }
      },
      onUpdate: handleEditorUpdate,
      onAiWritingGetSuggestion: onAiWritingGetSuggestion,
      onValidateUrl: async (url: string, type: 'image' | 'video' | 'audio' | 'iframe') => {
        // 拦截 base64 链接
        if (url.startsWith('data:')) {
          throw new Error(`不支持 base64 链接，请使用可访问的 ${type} URL`);
        }

        // 根据不同类型做不同的验证
        switch (type) {
          case 'image':
            if (!url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
              console.warn('图片链接可能不是有效的图片格式');
            }
            break;
          case 'video':
            if (!url.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)(\?.*)?$/i)) {
              console.warn('视频链接可能不是有效的视频格式');
            }
            break;
          case 'audio':
            if (!url.match(/\.(mp3|wav|ogg|m4a|flac|aac|wma)(\?.*)?$/i)) {
              console.warn('音频链接可能不是有效的音频格式');
            }
            break;
          case 'iframe':
            // iframe 可以嵌入任何 URL，但可以检查是否是 HTTPS
            if (url.startsWith('http://') && !url.includes('localhost')) {
              console.warn('建议使用 HTTPS 链接以确保安全性');
            }
            break;
        }

        return url;
      },
    });
    useEffect(() => {
      if (!editorRef?.editor) return;
      const timer = setTimeout(() => {
        editorRef.editor?.commands.focus('end');
      }, 0);
      return () => clearTimeout(timer);
    }, [editorRef?.editor]);

    // 当 readonly 状态改变时，更新编辑器的可编辑状态
    useEffect(() => {
      if (!editorRef?.editor) return;
      editorRef.editor.setEditable(!readonly);
    }, [readonly, editorRef?.editor]);
    useEffect(() => {
      if (!editorRef.editor) return;
      editorRef.editor.commands.setContent(value || '', {
        contentType: 'markdown',
      } as any);
    }, [value]);
    // 暴露命令式 API：getContent / getHTML / getText / resetContent
    useImperativeHandle(
      ref,
      () => ({
        getContent: () => {
          try {
            // useTiptap helper 统一使用 getContent 获取输入值
            return editorRef.getContent();
          } catch (e) {
            return '';
          }
        },
        getHTML: () => {
          try {
            // useTiptap helper 提供 getHTML
            return editorRef.editor.getHTML();
          } catch (e) {
            return '';
          }
        },
        getText: () => {
          try {
            return editorRef.editor.getText();
          } catch (e) {
            return '';
          }
        },
        resetContent: () => {
          try {
            if (editorRef.editor) {
              editorRef.editor.commands.setContent('');
              if (!readonly) {
                onChange?.('');
              }
            }
          } catch (e) {
            console.error('重置编辑器内容失败:', e);
          }
        },
        setContent: (content: string) => {
          try {
            if (editorRef.editor) {
              editorRef.editor.commands.setContent(content, {
                contentType: 'markdown',
              } as any);
            }
          } catch (e) {
            console.error('设置编辑器内容失败:', e);
          }
        },
        setReadonly: (newReadonly: boolean) => {
          try {
            if (editorRef.editor) {
              editorRef.editor.setEditable(!newReadonly);
            }
          } catch (e) {
            console.error('设置编辑器只读状态失败:', e);
          }
        },
      }),
      [editorRef, onChange, readonly]
    );
    if (!isMounted) {
      return;
    }

    // 客户端渲染的完整编辑器
    return (
      <EditorThemeProvider mode="light">
        <Box
          className="editor-wrap tiptap"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            transition: 'all 0.3s ease',
            '.editor-toolbar + div': {
              flex: 1,
              overflow: 'auto',
            },
            '& .tiptap': {
              height: '100%',
            },
            '& .editor-toolbar > div': {
              flexWrap: 'wrap',
            },
          }}
        >
          {editorRef.editor && (
            <>
              <EditorToolbar editor={editorRef.editor} mode={mode} />
              <Editor editor={editorRef.editor} />
            </>
          )}
        </Box>
      </EditorThemeProvider>
    );
  }
);

export default EditorWrap;
