import { getAdminKbKbIdQuestionQaId, ModelKBDocumentDetail, postAdminLlmPolish } from '@/api';
import { message, Modal } from '@ctzhian/ui';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import EditorWrap from '../editor/edit/Wrap';
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
  const [answer, setAnswer] = useState('');
  const [originalAnswer, setOriginalAnswer] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [historicalQaDetail, setHistoricalQaDetail] = useState<any>(null);

  // AI文本润色功能
  const { run: polishText, loading: polishLoading } = useRequest(
    (text: string) => postAdminLlmPolish({ text }),
    {
      manual: true,
      onSuccess: result => {
        setAnswer(result);
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
    if (!answer?.trim()) {
      message.warning('请先输入回答内容');
      return;
    }
    setOriginalAnswer(answer);
    setIsPolishing(true);
    polishText(answer);
  };

  const handleRevert = () => {
    if (originalAnswer) {
      setAnswer(originalAnswer);
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
        getAdminKbKbIdQuestionQaId({kbId, qaId: qaItem.similar_id})
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
      onApprove({ ...qaItem, title: question, markdown: answer });
    }
  };

  const handleReject = () => {
    if (qaItem) {
      onReject(qaItem);
    }
  };

  const handleUpdateHistorical = () => {
    if (qaItem && onUpdateHistorical) {
      onUpdateHistorical({ ...qaItem, title: question, markdown: answer });
    }
  };

  const hasHistoricalQa = !!qaItem?.similar_id && !!historicalQaDetail;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width="90%"
      title={'审核问答对'}
      maskClosable={false}
      footer={
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ p: 3 }}>
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
      <Stack direction="row" spacing={3} sx={{ height: '500px' }}>
        {/* 历史问答对（仅查看） */}
        {hasHistoricalQa && (
          <>
            <Box sx={{ flex: 1, bgcolor: 'background.paper', p: 2, overflow: 'auto' }}>
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
                  sx={{
                    flexGrow: 1,
                    '& fieldset': {
                      border: 'none',
                    },
                  }}
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
              </Stack>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', width: '120px' }}>
                回答
              </Typography>
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
          </>
        )}

        {/* 新问答对（可编辑） */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
            {hasHistoricalQa ? '最新版本' : '问答对'}
          </Typography>
          <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', width: '60px' }}>
              问题
            </Typography>
            <TextField
              value={question}
              onChange={e => setQuestion(e.target.value)}
              fullWidth
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />
          </Stack>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', width: '120px' }}>
            回答
          </Typography>
          <Box
            sx={{
              position: 'relative',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              mt: 1,
            }}
          >
            <EditorWrap
              detail={{
                content: answer,
              }}
              onChange={setAnswer}
              showActions={false}
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
