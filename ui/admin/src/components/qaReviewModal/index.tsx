import { getAdminKbKbIdQuestionQaId, ModelKBDocumentDetail, postAdminLlmPolish } from '@/api';
import { message } from '@ctzhian/ui';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import React, { useEffect, useState } from 'react';
import EditorWrap from '../editor/edit/Wrap';
import MarkDown from '../markDown';

interface QaReviewModalProps {
  open: boolean;
  onClose: () => void;
  qaItem: ModelKBDocumentDetail | null;
  onApprove: (qaItem: ModelKBDocumentDetail) => void;
  onReject: (qaItem: ModelKBDocumentDetail) => void;
  onUpdateHistorical?: (qaItem: ModelKBDocumentDetail) => void;
  historicalQa?: ModelKBDocumentDetail | null;
  kbId: number;
}

const QaReviewModal: React.FC<QaReviewModalProps> = ({
  open,
  onClose,
  qaItem,
  onApprove,
  onReject,
  onUpdateHistorical,
  historicalQa,
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
        getAdminKbKbIdQuestionQaId(kbId, qaItem.similar_id)
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">审核问答对</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack direction="row" spacing={3} sx={{ height: '500px' }}>
          {/* 历史问答对（仅查看） */}
          {hasHistoricalQa && (
            <>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                  历史问答对
                </Typography>
                <TextField
                  label="问题"
                  value={historicalQaDetail?.title || ''}
                  fullWidth
                  disabled
                  sx={{ mb: 2 }}
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
                <Stack
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    py: 2,
                    px: 1,
                    borderRadius: '4px',
                  }}
                >
                  <Typography variant="caption" sx={{ mb: 3 }}>
                    回答：
                  </Typography>
                  <MarkDown content={historicalQaDetail?.markdown} />
                </Stack>
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
                <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                  历史问答对 -{' '}
                  {historicalQaDetail?.updated_at
                    ? new Date(historicalQaDetail.updated_at * 1000).toLocaleDateString()
                    : ''}
                </Typography>
              </Box>

              <Divider orientation="vertical" flexItem />
            </>
          )}

          {/* 新问答对（可编辑） */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              {hasHistoricalQa ? '新问答对' : '问答对'}
            </Typography>
            <TextField
              label="问题"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />
            <Box sx={{ position: 'relative' }}>
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
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
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
      </DialogActions>
    </Dialog>
  );
};

export default QaReviewModal;
