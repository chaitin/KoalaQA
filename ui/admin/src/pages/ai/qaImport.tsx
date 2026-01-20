import {
  deleteAdminKbKbIdQuestionQaId,
  ModelDocStatus,
  ModelKBDocumentDetail,
  postAdminKbKbIdQuestion,
  postAdminKbKbIdQuestionQaIdReview,
  postAdminLlmPolish,
  putAdminKbKbIdQuestionQaId,
} from '@/api';
import Card from '@/components/card';
import EditorWrap, { EditorWrapRef } from '@/components/editor';
import QaReviewModal from '@/components/qaReviewModal';
import { zodResolver } from '@hookform/resolvers/zod';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, Button, IconButton, Stack, TextField, Tooltip } from '@mui/material';
import { useFullscreen, useRequest } from 'ahooks';
import { message, Modal } from '@ctzhian/ui';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import z from 'zod';
import LoadingBtn from '@/components/LoadingButton';

const requiredString = z.string().refine(value => value.trim().length > 0, { message: '必填' });

const schema = z.object({
  title: requiredString,
  markdown: requiredString,
  id: z.number().optional(),
});

const defaultValues: z.infer<typeof schema> = {
  title: '',
  markdown: '',
  id: undefined,
};

const QaImport = (props: {
  refresh: (params: any) => void;
  editItem: ModelKBDocumentDetail | null;
  setEditItem: React.Dispatch<React.SetStateAction<ModelKBDocumentDetail | null>>;
}) => {
  const { refresh, editItem, setEditItem } = props;
  const [searchParams] = useSearchParams();
  const kb_id = +searchParams.get('id')!;
  const ref = useRef(null);
  const editorRef = useRef<EditorWrapRef>(null);
  const [isFullscreen, { enterFullscreen, exitFullscreen }] = useFullscreen(ref, {
    pageFullscreen: true,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const {
    register,
    formState,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const creat = () => {
    setEditItem(null);
    setOriginalText('');
    setShowCreate(true);
    // 延迟重置，确保编辑器已经初始化
    setTimeout(() => {
      reset(defaultValues);
    }, 50);
  };
  const handleCancel = () => {
    setShowCreate(false);
    setEditItem(null);
    setOriginalText('');
    reset(defaultValues);
  };

  // AI文本润色功能
  const { run: polishText, loading: polishLoading } = useRequest(
    (text: string) => postAdminLlmPolish({ text }),
    {
      manual: true,
      onSuccess: result => {
        // 直接设置编辑器内容
        editorRef.current?.setContent(result);
        setValue('markdown', result, { shouldValidate: true });
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
    const currentText = editorRef.current?.getContent() || '';
    if (!currentText?.trim()) {
      message.warning('请先输入回答内容');
      return;
    }
    setOriginalText(currentText);
    setIsPolishing(true);
    polishText(currentText);
  };

  const handleRevert = () => {
    if (originalText) {
      editorRef.current?.setContent(originalText);
      setValue('markdown', originalText, { shouldValidate: true });
      message.success('已恢复原文');
    }
  };

  // 审核相关处理
  const handleReviewApprove = (qaItem: ModelKBDocumentDetail) => {
    // 通过审核，使用审核接口
    postAdminKbKbIdQuestionQaIdReview(
      { kbId: kb_id, qaId: qaItem.id! },
      {
        add_new: true,
        title: qaItem.title || '',
        content: qaItem.markdown || '',
      }
    ).then(() => {
      message.success('审核通过');
      setShowReview(false);
      refresh({});
    });
  };

  const handleReviewReject = (qaItem: ModelKBDocumentDetail) => {
    // 拒绝审核，删除记录
    deleteAdminKbKbIdQuestionQaId({ kbId: kb_id, qaId: qaItem.id! }).then(() => {
      message.success('已拒绝');
      setShowReview(false);
      refresh({});
    });
  };

  const handleUpdateHistorical = (qaItem: ModelKBDocumentDetail) => {
    // 更新历史问答对
    if (qaItem.similar_id) {
      putAdminKbKbIdQuestionQaId(
        { kbId: kb_id, qaId: qaItem.similar_id },
        {
          title: qaItem.title || '',
          markdown: qaItem.markdown as any,
        }
      ).then(() => {
        // 删除当前待审核记录
        deleteAdminKbKbIdQuestionQaId({ kbId: kb_id, qaId: qaItem.id! }).then(() => {
          message.success('已更新历史问答');
          setShowReview(false);
          refresh({});
        });
      });
    }
  };
  const handleEdit = async (data: z.infer<typeof schema>) => {
    return putAdminKbKbIdQuestionQaId(
      { kbId: kb_id, qaId: data.id! },
      {
        title: data.title.trim(),
        markdown: data.markdown,
      }
    ).then(() => {
      setEditItem(null);
      setShowCreate(false);
      message.success('保存成功');
      refresh({});
    });
  };
  const handleOk = (data: z.infer<typeof schema>) => {
    return postAdminKbKbIdQuestion(
      { kbId: kb_id },
      { ...data, title: data.title.trim(), markdown: data.markdown }
    ).then(() => {
      handleCancel();
      message.success('保存成功');
      refresh({});
    });
  };
  const handleConfirm = () => {
    const content = editorRef.current?.getContent() || '';
    setValue('markdown', content);
    return handleSubmit(editItem ? handleEdit : handleOk)();
  };
  useEffect(() => {
    if (editItem) {
      reset({
        id: editItem.id,
        title: editItem.title ?? '',
        markdown: editItem.markdown ?? '',
      });
      // 如果是待审核状态，显示审核弹窗
      if (editItem.status === ModelDocStatus.DocStatusPendingReview) {
        setShowReview(true);
      } else {
        // 其他状态显示编辑弹窗
        setShowCreate(true);
      }
    }
  }, [editItem, kb_id, reset]);
  return (
    <>
      <Button variant="contained" onClick={creat}>
        手动录入
      </Button>
      <Modal
        open={showCreate}
        onCancel={handleCancel}
        maskClosable={false}
        title={
          <Stack direction="row" alignItems={'center'} justifyContent={'space-between'}>
            <Box>{editItem ? '编辑' : '手动录入'}</Box>

            <IconButton
              onClick={enterFullscreen}
              sx={{ position: 'relative', top: '-9px', right: '30px' }}
            >
              <FullscreenIcon />
            </IconButton>
          </Stack>
        }
        width={860}
        footer={null}
      >
        <Stack component={Card} sx={{ position: 'relative', pt: 2, overflow: 'auto' }} ref={ref}>
          {isFullscreen && (
            <IconButton
              onClick={exitFullscreen}
              sx={{
                position: 'relative',
                top: '-9px',
                right: '30px',
                alignSelf: 'end',
                flexGrow: 0,
              }}
            >
              <FullscreenExitIcon />
            </IconButton>
          )}
          <TextField
            {...register('title')}
            label="名称"
            fullWidth
            multiline
            minRows={1}
            maxRows={10}
            error={Boolean(formState.errors.title?.message)}
            helperText={formState.errors.title?.message}
            slotProps={{
              inputLabel: {
                shrink: !!watch('title') || undefined,
              },
            }}
            sx={{
              mb: 2,
            }}
          />
          <Controller
            name="markdown"
            control={control}
            render={({ field, fieldState }) => (
              <Box
                sx={{
                  position: 'relative',
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  px: 2,
                  pb: fieldState.error ? 3 : 0,
                  '& .editor-toolbar + div': {
                    overflow: 'auto',
                    minHeight: '320px!important',
                    maxHeight: '340px!important',
                  },
                  '& .tiptap': {
                    minHeight: { xs: '150px', sm: '300px' },
                  },
                }}
              >
                <EditorWrap
                  key={editItem ? `edit-${editItem.id}` : 'create'}
                  ref={editorRef}
                  value={field.value ?? ''}
                  placeholder="请输入回答内容..."
                  mode="advanced"
                />
                {fieldState.error?.message && (
                  <Box
                    sx={{
                      fontSize: 12,
                      color: 'error.main',
                      position: 'absolute',
                      bottom: -20,
                      left: 0,
                    }}
                  >
                    {fieldState.error.message}
                  </Box>
                )}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    display: 'flex',
                    gap: 1,
                  }}
                >
                  {originalText && (
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
                      loading={polishLoading || isPolishing}
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
            )}
          />
          <Stack direction="row" justifyContent="end" spacing={2} mt={2}>
            <Button size="small" variant="text" onClick={handleCancel}>
              取消
            </Button>
            <LoadingBtn size="small" variant="contained" onClick={handleConfirm}>
              确认
            </LoadingBtn>
          </Stack>
        </Stack>
      </Modal>

      {/* 审核弹窗 */}
      <QaReviewModal
        open={showReview}
        onClose={() => {
          setShowReview(false);
          setEditItem(null);
        }}
        qaItem={editItem as unknown as ModelKBDocumentDetail}
        onApprove={handleReviewApprove}
        onReject={handleReviewReject}
        onUpdateHistorical={handleUpdateHistorical}
        kbId={kb_id}
      />
    </>
  );
};

export default QaImport;
