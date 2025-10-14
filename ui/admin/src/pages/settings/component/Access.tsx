import {
  getAdminSystemPublicAddress,
  ModelPublicAddress,
  putAdminSystemPublicAddress,
} from '@/api';
import Card from '@/components/card';
import { message } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import { Controller, useForm } from 'react-hook-form';
import z from 'zod';

const accessSchema = z.object({
  address: z.string().trim().min(1).max(255),
});
interface AccessProps {
  onSaved?: () => void;
}

const Access = ({ onSaved }: AccessProps) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ModelPublicAddress>({
    resolver: zodResolver(accessSchema),
  });

  // 获取当前配置
  const { data } = useRequest(getAdminSystemPublicAddress, {
    onSuccess: res => {
      reset({
        address: res.address,
      });
    },
  });

  // 提交表单
  const onSubmit = async (data: ModelPublicAddress) => {
    try {
      await putAdminSystemPublicAddress(data);
      reset(data);
      message.success('保存成功');
      onSaved?.();
    } catch (error) {
      message.error('保存失败');
    }
  };

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
          访问管理
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
        <Box display="flex" alignItems="center">
          <Typography variant="body2" sx={{ mr: 2, minWidth: 170 }}>
            用户实际访问地址
          </Typography>
          <TextField
            fullWidth
            {...register('address')}
            required
            error={!!errors.address}
            helperText={errors.address?.message}
            slotProps={{
              inputLabel: {
                shrink: !!watch('address') || undefined,
              },
            }}
          />
        </Box>
      </Stack>
    </Card>
  );
};

export default Access;
