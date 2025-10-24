'use client';
import { Editor, useTiptap } from '@ctzhian/tiptap';
import { Box } from '@mui/material';
import { SxProps } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';

// 扩展props接口，添加truncate选项
export interface MarkDownProps {
  title?: string;
  content?: string;
  sx?: SxProps;
  truncateLength?: number; // 添加截断长度选项，0表示不截断
}

const EditorContent: React.FC<MarkDownProps> = props => {
  const { content = '' } = props;
  const [, setLoading] = useState(true);
  const editorRef = useTiptap({
    content: content || '',
    editable: false,
    immediatelyRender: false,
    onBeforeCreate: () => {
      setLoading(true);
    },
    onCreate: () => {
      setLoading(false);
    },
  });
  // 监听 content 变化，更新编辑器内容
  useEffect(() => {
    if (editorRef.editor) {
      editorRef.editor.commands.setContent(content || '');
    }
  }, [content, editorRef.editor]);
  return (
    <Box
      className="editor-container"
      sx={{
        width: '100%',
        '.tiptap.ProseMirror': {
          '.tableWrapper': {
            transition: 'width 0.3s ease-in-out',
            width: '100%',
            overflowX: 'auto',
          },
        },
      }}
    >
      {editorRef.editor && <Editor editor={editorRef.editor} />}
    </Box>
  );
};

export default EditorContent;
