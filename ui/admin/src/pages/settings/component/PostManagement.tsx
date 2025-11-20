import { getAdminSystemDiscussion, putAdminSystemDiscussion } from '@/api';
import Card from '@/components/card';
import { message } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';

const postManagementSchema = z.object({
  auto_close: z.number(),
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
    },
  });

  const auto_close = watch('auto_close');

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
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 500, minWidth: '156px' }}>
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
      </Stack>
    </Card>
  );
};

export default PostManagement;
