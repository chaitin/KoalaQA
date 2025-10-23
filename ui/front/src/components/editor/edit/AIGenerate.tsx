import SSEClient from '@/utils/fetch';
import { Editor, useTiptap, UseTiptapReturn } from '@ctzhian/tiptap';
import { Modal } from '@ctzhian/ui';
import { Box, Divider, Stack } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

interface AIGenerateProps {
  open: boolean;
  selectText: string;
  onClose: () => void;
  editorRef: UseTiptapReturn;
}

const AIGenerate = ({
  open,
  selectText,
  onClose,
  editorRef,
}: AIGenerateProps) => {
  const sseClientRef = useRef<SSEClient<string> | null>(null);

  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  const defaultEditor = useTiptap({
    editable: false,
  });

  const readEditor = useTiptap({
    editable: false,
  });

  const onGenerate = useCallback(() => {
    if (sseClientRef.current) {
      setLoading(true);
      sseClientRef.current.subscribe(
        JSON.stringify({
          text: selectText,
          action: 'rephrase',
          stream: true,
        }),
        data => {
          setContent(prev => {
            const newContent = prev + data;
            readEditor.editor?.commands.setContent(newContent);
            return newContent;
          });
        },
      );
    }
  }, [selectText, readEditor.editor]);

  const onCancel = () => {
    sseClientRef.current?.unsubscribe();
    try {
      if (defaultEditor.editor && 'view' in defaultEditor.editor) {
        defaultEditor.editor.commands.setContent('');
      }
      if (readEditor.editor && 'view' in readEditor.editor) {
        readEditor.editor.commands.setContent('');
      }
    } catch (e) {
      console.warn('重置编辑器内容失败，忽略:', e);
    }
    setContent('');
    onClose();
  };

  const onSubmit = () => {
    const { from, to } = editorRef.editor.state.selection;
    editorRef.editor.commands.insertContentAt({ from, to }, content);
    onCancel();
  };

  useEffect(() => {
    if (!open) return;
    sseClientRef.current = new SSEClient<string>({
      url: '/api/v1/creation/text',
      headers: {
        'Content-Type': 'application/json',
      },
      onComplete: () => setLoading(false),
      onError: () => setLoading(false),
    });
    if (selectText) {
      setTimeout(() => {
        try {
          if (defaultEditor.editor && 'view' in defaultEditor.editor) {
            defaultEditor.editor.commands.setContent(selectText);
          }
          onGenerate();
        } catch (e) {
          console.warn('预填充或生成发生错误，忽略:', e);
        }
      }, 60);
    }
  }, [selectText, open, defaultEditor.editor, onGenerate]);

  useEffect(() => {
    return () => {
      defaultEditor.editor.destroy();
      readEditor.editor.destroy();
      sseClientRef.current?.unsubscribe();
    };
  }, [defaultEditor.editor, readEditor.editor]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={'文本润色'}
      okText='替换'
      width={1000}
      onOk={onSubmit}
      okButtonProps={{
        loading,
        disabled: content.length === 0,
      }}
    >
      <Stack
        direction={'row'}
        sx={{
          '.tiptap.ProseMirror': {
            padding: '0px',
          },
        }}
      >
        <Stack
          sx={{
            width: '50%',
            flex: 1,
          }}
        >
          <Box
            sx={{
              mb: 0.5,
              ml: 1,
              fontSize: 14,
              fontWeight: 'bold',
              color: 'text.tertiary',
            }}
          >
            原文
          </Box>
          <Box
            sx={{
              borderRadius: '10px',
              p: 2,
              bgcolor: 'background.paper3',
              flex: 1,
            }}
          >
            <Editor editor={defaultEditor.editor} />
          </Box>
        </Stack>
        <Divider orientation='vertical' flexItem sx={{ mx: 2 }} />
        <Stack sx={{ width: '50%', flex: 1 }}>
          <Box
            sx={{
              mb: 0.5,
              ml: 1,
              fontSize: 14,
              fontWeight: 'bold',
              color: 'text.tertiary',
            }}
          >
            润色后
          </Box>
          <Box
            sx={{
              borderRadius: '10px',
              p: 2,
              bgcolor: 'background.paper3',
              flex: 1,
            }}
          >
            <Editor editor={readEditor.editor} />
          </Box>
        </Stack>
      </Stack>
    </Modal>
  );
};

export default AIGenerate;
