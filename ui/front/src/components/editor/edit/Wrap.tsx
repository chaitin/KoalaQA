'use client';

import { Box, Button, GlobalStyles } from '@mui/material';
import { useEffect, useState, useCallback, useRef } from 'react';
import { NodeDetail } from '..';
import SaveIcon from '@mui/icons-material/Save';
import { Editor, useTiptap } from '@ctzhian/tiptap';
import Toolbar from './Toolbar';
import { postDiscussionUpload } from '@/api';

// 添加全局动画样式
const globalStyles = (
  <GlobalStyles
    styles={{
      '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
      },
      '@keyframes pulse': {
        '0%': { opacity: 0.6, transform: 'scale(0.95)' },
        '100%': { opacity: 1, transform: 'scale(1)' },
      },
      '@keyframes fadeIn': {
        '0%': { opacity: 0, transform: 'translateY(10px)' },
        '100%': { opacity: 1, transform: 'translateY(0)' },
      },
    }}
  />
);

interface WrapProps {
  detail: NodeDetail;
  onCancel?: () => void;
  onSave?: (content: string) => void;
  onContentChange?: (content: string) => void;
  showActions?: boolean; // 是否显示底部的保存和取消按钮，默认为true
  value?: string; // 用于双向绑定的值，当提供时会覆盖detail.content
  onChange?: (value: string) => void; // 双向绑定的变更回调，类似input组件的onChange
}

const EditorWrap = ({
  detail,
  onSave,
  onContentChange,
  onCancel,
  showActions = true,
  value,
  onChange,
}: WrapProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [originalContent, setOriginalContent] = useState(detail?.content || '');

  // 确保只在客户端渲染编辑器
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleUpdate = useCallback(
    ({ editor }: { editor: any }) => {
      const content = editor.getHTML();

      // 支持传统的onContentChange回调
      if (onContentChange) {
        onContentChange(content);
      }

      // 支持双向绑定的onChange回调
      if (onChange) {
        onChange(content);
      }
    },
    [onContentChange, onChange]
  );

  const handleUpload = async (
    file: File,
    onProgress?: (progress: { progress: number }) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    const key = await postDiscussionUpload(
      { file },
      {
        onUploadProgress: ({ progress }) => {
          onProgress?.({ progress: (progress || 0) / 100 });
        },
      }
    );
    return Promise.resolve('/static-file/' + key);
  };
  const editorRef = useTiptap({
    editable: true,
    content: value || detail?.content || '',
    onUpdate: handleUpdate,
    exclude: ['invisibleCharacters', 'youtube', 'mention'],
    immediatelyRender: false,
    onUpload: handleUpload,
    onFocus: () => {
      console.log('编辑器获得焦点');
    },
    onBlur: () => {
      console.log('编辑器失去焦点');
    },
  });

  // 这些函数需要在editorRef初始化后定义
  const handleCancelEdit = () => {
    if (editorRef.editor) {
      editorRef.editor.commands.setContent(originalContent);
    }
    onCancel?.();
  };

  const handleSave = async () => {
    if (!onSave || !editorRef.editor) return;

    setIsSaving(true);
    try {
      const content = editorRef.getHTML();
      await onSave(content);
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 当value或detail.content变化时更新编辑器内容
  useEffect(() => {
    if (editorRef.editor) {
      const newContent = value !== undefined ? value : detail?.content || '';
      const currentContent = editorRef.getHTML();
      if (currentContent !== newContent) {
        editorRef.editor.commands.setContent(newContent);
      }
    }
    setOriginalContent(value !== undefined ? value : detail?.content || '');
  }, [value, detail?.content, editorRef.editor]);

  // 聚焦编辑器的函数
  const focusEditor = useCallback(() => {
    if (editorRef.editor) {
      editorRef.editor.commands.focus();
      // 将光标移到内容末尾
      const docSize = editorRef.editor.state.doc.content.size;
      editorRef.editor.commands.setTextSelection(docSize);
    }
  }, []);

  // 编辑器加载后自动聚焦
  useEffect(() => {
    if (editorRef.editor && isMounted) {
      // 立即尝试聚焦
      focusEditor();

      // 延时再次尝试，确保聚焦成功
      const timer1 = setTimeout(focusEditor, 100);
      const timer2 = setTimeout(focusEditor, 300);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [editorRef.editor, isMounted, focusEditor]);

  // 监听组件可见性，当组件变为可见时聚焦编辑器
  useEffect(() => {
    if (!containerRef.current || !editorRef.editor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // 当组件超过50%可见时，聚焦编辑器
            setTimeout(focusEditor, 100);
          }
        });
      },
      {
        threshold: [0.5], // 当50%可见时触发
        rootMargin: '0px',
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [containerRef.current, editorRef.editor, focusEditor]);

  // 在服务端渲染时返回漂亮的占位符
  if (!isMounted) {
    return (
      <>
        {globalStyles}
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
    );
  }

  // 客户端渲染的完整编辑器
  return (
    <>
      {globalStyles}
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
            minHeight: 300,
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

        {/* 编辑器内容区域 */}
        <Box
          sx={{
            flex: 1,
            m: 2,
            borderRadius: 2,
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
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
          onClick={focusEditor}
        >
          {editorRef.editor ?
            <Editor editor={editorRef.editor} />
          : <Box
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
                }}
              >
                编辑器加载中...
              </Box>
            </Box>
          }
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
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </Box>
        )}
      </Box>
    </>
  );
};

export default EditorWrap;
