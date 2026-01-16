import { getAdminKbKbIdQuestionQaId, ModelKBDocumentDetail, postAdminLlmPolish } from '@/api';
import { message, Modal } from '@ctzhian/ui';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import React, { useEffect, useState, useRef } from 'react';
import EditorWrap, { EditorWrapRef } from '../editor';
import EditorContent from '../EditorContent';

interface QaReviewModalProps {
  open: boolean;
  onClose: () => void;
  qaItem: ModelKBDocumentDetail | null;
  onApprove: (qaItem: ModelKBDocumentDetail) => void;
  onReject: (qaItem: ModelKBDocumentDetail) => void;
  onUpdateHistorical?: (qaItem: ModelKBDocumentDetail) => void;
  kbId: number;
}

const QaReviewModal: React.FC<QaReviewModalProps> = ({
  open,
  onClose,
  qaItem,
  onApprove,
  onReject,
  onUpdateHistorical,
  kbId,
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(''); // 仅用于初始化编辑器
  const [originalAnswer, setOriginalAnswer] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [historicalQaDetail, setHistoricalQaDetail] = useState<any>(null);
  const editorRef = useRef<EditorWrapRef>(null);

  // AI文本润色功能
  const { run: polishText, loading: polishLoading } = useRequest(
    (text: string) => postAdminLlmPolish({ text }),
    {
      manual: true,
      onSuccess: result => {
        editorRef.current?.setContent(result);
        message.success('文本润色完成');
        setIsPolishing(false);
      },
      onError: () => {
        message.error('文本润色失败，请重试');
        setIsPolishing(false);
      },
    }
  );

  const handlePolish = () => {
    const currentAnswer = editorRef.current?.getContent() || '';
    if (!currentAnswer?.trim()) {
      message.warning('请先输入回答内容');
      return;
    }
    setOriginalAnswer(currentAnswer);
    setIsPolishing(true);
    polishText(currentAnswer);
  };

  const handleRevert = () => {
    if (originalAnswer) {
      editorRef.current?.setContent(originalAnswer);
      message.success('已恢复原文');
    }
  };

  useEffect(() => {
    if (qaItem && open) {
      setQuestion(qaItem.title || '');
      setAnswer(qaItem.markdown || '');
      setOriginalAnswer('');

      // 如果有相似问答对ID，获取历史问答对详情
      if (qaItem.similar_id) {
        getAdminKbKbIdQuestionQaId({ kbId, qaId: qaItem.similar_id })
          .then(res => {
            setHistoricalQaDetail(res);
          })
          .catch(err => {
            console.error('获取历史问答对详情失败:', err);
          });
      }
    }
  }, [qaItem, open, kbId]);

  const handleApprove = () => {
    if (qaItem) {
      const content = editorRef.current?.getContent() || '';
      onApprove({ ...qaItem, title: question, markdown: content });
    }
  };

  const handleReject = () => {
    if (qaItem) {
      onReject(qaItem);
    }
  };

  const handleUpdateHistorical = () => {
    if (qaItem && onUpdateHistorical) {
      const content = editorRef.current?.getContent() || '';
      onUpdateHistorical({ ...qaItem, title: question, markdown: content });
    }
  };

  const hasHistoricalQa = !!qaItem?.similar_id && !!historicalQaDetail;

  // 检查是否有原帖链接
  const hasOriginalPost = !!(qaItem?.disc_forum_id && qaItem?.disc_uuid);

  // 处理查看原帖
  const handleViewOriginalPost = () => {
    if (!qaItem?.disc_forum_id || !qaItem?.disc_uuid) {
      return;
    }

    // 构建原帖链接
    // 优先使用 route_name，如果没有则使用 forum_id
    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? `${globalThis.location.protocol}//${globalThis.location.hostname}:3000`
        : globalThis.location.origin;

    // 使用 forum_id 和 uuid 构建链接
    const postUrl = `${baseUrl}/${qaItem.disc_forum_id}/${qaItem.disc_uuid}`;
    window.open(postUrl, '_blank');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={hasHistoricalQa ? '90%' : 860}
      title={'审核问答对'}
      maskClosable={false}
      footer={
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ p: 3 }}>
          {hasOriginalPost && (
            <Button
              onClick={handleViewOriginalPost}
              startIcon={<OpenInNewIcon />}
              sx={{
                mr: 'auto!important',
              }}
            >
              查看原帖
            </Button>
          )}
          <Button onClick={handleReject} color="error">
            拒绝
          </Button>
          {hasHistoricalQa && (
            <Button onClick={handleUpdateHistorical} variant="outlined">
              更新历史问答
            </Button>
          )}
          <Button onClick={handleApprove} variant="contained">
            {hasHistoricalQa ? '创建新的问答' : '通过'}
          </Button>
        </Stack>
      }
    >
      <Stack direction="row" spacing={3} sx={{ width: '100%' }}>
        {/* 历史问答对（仅查看） */}
        {hasHistoricalQa && (
          <Box sx={{ flex: 1, bgcolor: 'background.paper', p: 2, overflow: 'auto', width: '100%' }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', width: '60px' }}>
                历史版本
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {historicalQaDetail?.updated_at
                  ? dayjs.unix(historicalQaDetail.updated_at).format('YYYY-MM-DD HH:mm:ss')
                  : ''}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', width: '60px' }}>
                问题
              </Typography>
              <TextField
                value={historicalQaDetail?.title || ''}
                disabled
                size="small"
                multiline
                minRows={1}
                maxRows={10}
                sx={{
                  flexGrow: 1,
                  whiteSpace: 'pre-wrap',
                  '& fieldset': {
                    border: 'none',
                  },
                }}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
            </Stack>
            <EditorContent content={historicalQaDetail?.markdown} sx={{ p: 2, mt: 1 }} />
            {/* <TextField
                  label="回答"
                  value={historicalQaDetail?.markdown || ''}
                  fullWidth
                  multiline
                  minRows={12}
                  disabled
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                /> */}
          </Box>
        )}

        {/* 新问答对（可编辑） */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
            {hasHistoricalQa ? '最新版本' : '问答对'}
          </Typography>
          <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
            <TextField
              label="问题"
              multiline
              minRows={1}
              maxRows={10}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              fullWidth
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />
          </Stack>
          <Box
            sx={{
              position: 'relative',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              mt: 1,
              px: 2,
              '& .editor-toolbar + div': {
                overflow: 'auto',
                height: '320px!important',
                flex: 'unset!important',
              },
            }}
          >
            <EditorWrap
              ref={editorRef}
              value={answer}
              placeholder="请输入回答内容..."
              mode="advanced"
            />
            {/* AI文本润色按钮 */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                display: 'flex',
                gap: 1,
              }}
            >
              {originalAnswer && (
                <Tooltip title="使用原文">
                  <IconButton
                    size="small"
                    onClick={handleRevert}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 1)',
                      },
                    }}
                  >
                    <UndoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="AI文本润色">
                <IconButton
                  size="small"
                  onClick={handlePolish}
                  disabled={polishLoading || isPolishing}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                    },
                  }}
                >
                  <AutoFixHighIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Stack>
    </Modal>
  );
};

export default QaReviewModal;
