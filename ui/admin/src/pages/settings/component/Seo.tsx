import { getAdminSystemSeo, putAdminSystemSeo } from '@/api';
import Card from '@/components/card';
import { message } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import { useForm } from 'react-hook-form';
import z from 'zod';

type SEOForm = {
  desc?: string;
  keywords?: string;
};

const seoSchema = z.object({
  desc: z
    .string()
    .trim()
    .max(500, '描述长度需小于 500 字')
    .optional()
    .or(z.literal('')),
  keywords: z
    .string()
    .trim()
    .max(500, '关键词长度需小于 500 字')
    .optional()
    .or(z.literal('')),
});

const Seo = () => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<SEOForm>({
    resolver: zodResolver(seoSchema),
    defaultValues: {
      desc: '',
      keywords: '',
    },
  });

  useRequest(getAdminSystemSeo, {
    onSuccess: res => {
      reset({
        desc: res.desc || '',
        keywords: (res.keywords || []).join(','),
      });
    },
  });

  const onSubmit = async (values: SEOForm) => {
    const payload = {
      desc: (values.desc || '').trim(),
      keywords: (values.keywords || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
    };

    try {
      await putAdminSystemSeo(payload);
      reset({
        desc: payload.desc,
        keywords: payload.keywords.join(','),
      });
      message.success('保存成功');
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
          SEO 设置
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
            社区描述
          </Typography>
          <TextField
            fullWidth
            {...register('desc')}
            multiline
            error={!!errors.desc}
            helperText={errors.desc?.message}
            slotProps={{
              inputLabel: {
                shrink: !!watch('desc') || undefined,
              },
            }}
          />
        </Box>

        <Box display="flex" alignItems="center">
          <Typography variant="body2" sx={{ mr: 2, minWidth: 170 }}>
            关键词
          </Typography>
          <TextField
            fullWidth
            {...register('keywords')}
            error={!!errors.keywords}
            placeholder='用逗号分隔,例如：ai,chatgpt,deepseek'
            helperText={errors.keywords?.message}
            slotProps={{
              inputLabel: {
                shrink: !!watch('keywords') || undefined,
              },
            }}
          />
        </Box>
      </Stack>
    </Card>
  );
};

export default Seo;
