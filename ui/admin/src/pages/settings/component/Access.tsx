import {
  getAdminSystemPublicAddress,
  ModelPublicAddress,
  putAdminSystemPublicAddress,
} from '@/api';
import Card from '@/components/card';
import { message } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Stack, TextField } from '@mui/material';
import { useRequest } from 'ahooks';
import { useForm } from 'react-hook-form';
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
      <Box
        sx={{
          fontSize: 14,
          lineHeight: '32px',
          flexShrink: 0,
          mb: 2,
        }}
      >
        访问管理
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="用户实际访问地址"
            {...register('address')}
            error={!!errors.address}
            helperText={errors.address?.message}
            slotProps={{
              inputLabel: {
                shrink: !!watch('address') || undefined,
              },
            }}
          />

          <Box>
            {isDirty && (
              <Button type="submit" variant="contained" color="primary">
                保存
              </Button>
            )}
          </Box>
        </Stack>
      </form>
    </Card>
  );
};

export default Access;
