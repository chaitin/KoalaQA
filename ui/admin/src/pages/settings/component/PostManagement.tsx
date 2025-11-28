import { getAdminSystemDiscussion, putAdminSystemDiscussion } from '@/api';
import Card from '@/components/card';
import { message } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import EditorWrap, { EditorWrapRef } from '@/components/editor';
import z from 'zod';

const postManagementSchema = z.object({
  auto_close: z.number(),
  content_placeholder: z.string().optional(),
});

interface PostManagementProps {
  onSaved?: () => void;
}

type PostManagementForm = z.infer<typeof postManagementSchema>;

const PostManagement = ({ onSaved }: PostManagementProps) => {
  const {
    setValue,
    watch,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<PostManagementForm>({
    resolver: zodResolver(postManagementSchema),
    defaultValues: {
      auto_close: 0, // 0表示禁用
      content_placeholder: '',
    },
  });

  const auto_close = watch('auto_close');
  const content_placeholder = watch('content_placeholder');

  // 弹窗状态
  const [isDefaultTextModalOpen, setIsDefaultTextModalOpen] = useState(false);
  const [editorContent, setEditorContent] = useState(''); // 仅用于初始化编辑器
  const editorRef = useRef<EditorWrapRef>(null);

  // 处理打开默认文本弹窗
  const handleOpenDefaultTextModal = () => {
    setEditorContent(content_placeholder || '');
    setIsDefaultTextModalOpen(true);
  };

  // 处理保存默认文本
  const handleSaveDefaultText = async () => {
    try {
      const content = editorRef.current?.getContent() || '';
      // 获取当前表单数据
      const currentFormData = {
        auto_close,
        content_placeholder: content,
      };

      // 直接调用API保存
      await putAdminSystemDiscussion(currentFormData);

      // 更新表单状态
      setValue('content_placeholder', content);
      reset(currentFormData);
      setEditorContent(content);

      // 关闭弹窗
      setIsDefaultTextModalOpen(false);

      // 显示成功消息
      message.success('保存成功');

      // 通知父组件重新获取数据
      onSaved?.();
    } catch (error) {
      message.error('保存失败');
    }
  };

  // 处理关闭弹窗
  const handleCloseDefaultTextModal = () => {
    setIsDefaultTextModalOpen(false);
    setEditorContent(content_placeholder || '');
    
  };

  // 将数字值转换为单选按钮的值
  const getAutoCloseValue = () => {
    if (auto_close === 0) return 'disabled';
    if (auto_close === 30) return '30days';
    if (auto_close === 180) return '180days';
    return 'disabled';
  };

  const autoCloseEnabled = getAutoCloseValue();

  // 获取当前配置
  const { run } = useRequest(getAdminSystemDiscussion, {
    onSuccess: res => {
      reset({
        auto_close: res?.auto_close || 0,
        content_placeholder: (res as any)?.content_placeholder || '',
      });
    },
    manual: true,
  });

  // 提交表单
  const onSubmit = async (data: PostManagementForm) => {
    try {
      await putAdminSystemDiscussion(data);
      reset(data);
      message.success('保存成功');
      onSaved?.();
    } catch (error) {
      message.error('保存失败');
    }
  };
  // 初始化时获取配置
  useEffect(() => {
    run();
  }, [run]);

  return (
    <Card>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography
          sx={{
            fontSize: 14,
            lineHeight: '32px',
            flexShrink: 0,
          }}
          variant="subtitle2"
        >
          帖子管理
        </Typography>
        <Box sx={{ my: -1 }}>
          {isDirty && (
            <Button
              onClick={handleSubmit(onSubmit)}
              type="submit"
              variant="contained"
              size="small"
              color="primary"
            >
              保存
            </Button>
          )}
        </Box>
      </Stack>

      <Stack spacing={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" sx={{ mb: 2, minWidth: '156px' }}>
            自动关闭问题
          </Typography>
          <Stack
            component={RadioGroup}
            direction="row"
            value={autoCloseEnabled}
            onChange={e => {
              const value = e.target.value;
              const autoCloseValue = value === 'disabled' ? 0 : value === '30days' ? 30 : 180;
              setValue('auto_close', autoCloseValue, { shouldDirty: true });
            }}
          >
            <FormControlLabel value="disabled" control={<Radio size="small" />} label="禁用" />
            <FormControlLabel
              value="30days"
              control={<Radio size="small" />}
              label="关闭 30 天前的帖子"
            />
            <FormControlLabel
              value="180days"
              control={<Radio size="small" />}
              label="关闭 180 天前的帖子"
            />
          </Stack>
        </Stack>

        {/* Content Placeholder */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" sx={{ mb: 2, minWidth: '156px' }}>
            默认文本
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* <Typography variant="body2" sx={{ color: '#6b7280' }}>
              {content_placeholder ?
                `${content_placeholder.slice(0, 50)}${content_placeholder.length > 50 ? '...' : ''}`
                : '未设置默认文本'
              }
            </Typography> */}
            <Button
              variant="outlined"
              size="small"
              onClick={handleOpenDefaultTextModal}
              sx={{ textTransform: 'none' }}
            >
              问题默认文本
            </Button>
          </Box>
        </Stack>
      </Stack>

      {/* Content Placeholder 编辑弹窗 */}
      <Dialog
        open={isDefaultTextModalOpen}
        onClose={handleCloseDefaultTextModal}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Typography variant="h6" component="div">
            默认文本设置
          </Typography>
          <Typography variant="caption" sx={{ mt: 0.5, color: '#6b7280' }}>
            新创建问题时将自动填充此文本内容，可以为空
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{
            height: '300px',
            mt: 2,
            border: '1px solid #e5e7eb',
            borderRadius: 1,
            overflow: 'hidden'
          }}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <EditorWrap
                ref={editorRef}
                value={editorContent}
                placeholder="在此输入问题的默认模板文本..."
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDefaultTextModal} variant="outlined">
            取消
          </Button>
          <Button
            onClick={handleSaveDefaultText}
            variant="contained"
            color="primary"
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PostManagement;
