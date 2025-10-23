import { getAdminSystemBrand, putAdminSystemBrand } from '@/api';
import Card from '@/components/card';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar, Box, Button, Stack, TextField, Typography } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { message } from '@ctzhian/ui';

// 将文件转换为 base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // 保留完整的 data URL 格式，包含 MIME 类型信息
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
  });
};

const formSchema = z.object({
  logo: z.union([
    z.string(),
    z.instanceof(File).refine(
      (file) => file.size <= 1024 * 1024, // 1MB = 1024 * 1024 bytes
      '文件大小不能超过1MB'
    )
  ]),
  text: z.string().min(1, '品牌文字不能为空').max(50, '品牌文字不能超过50个字符'),
});

type FormData = z.infer<typeof formSchema>;

const Logo: React.FC = () => {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty, dirtyFields },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logo: '',
      text: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (!dirtyFields.logo) {
        // 没有上传新 logo，只更新文字
        await putAdminSystemBrand({
          text: data.text,
        });
      } else {
        // 上传了新 logo，需要转换为 base64
        let logoBase64 = '';
        if (data.logo instanceof File) {
          logoBase64 = await fileToBase64(data.logo);
        } else if (typeof data.logo === 'string') {
          logoBase64 = data.logo;
        }
        
        await putAdminSystemBrand({
          logo: logoBase64,
          text: data.text,
        });
      }
      message.success('保存成功');
      reset(data);
    } catch (error) {
      message.error('保存失败，请重试');
      console.error('保存品牌配置失败:', error);
    }
  };

  useEffect(() => {
    getAdminSystemBrand().then(res => {
      reset(res);
    });
  }, [reset]);

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="subtitle2">品牌自定义</Typography>
        {/* 操作按钮 */}
        {isDirty && (
          <Stack direction="row" justifyContent="end" sx={{ gap: 2, my: '-8px' }}>
            <Button
              onClick={() => {
                reset();
              }}
              variant="outlined"
              sx={{ borderRadius: '6px' }}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              variant="contained"
              sx={{ borderRadius: '6px' }}
            >
              保存
            </Button>
          </Stack>
        )}
      </Stack>

      <Box sx={{ p: 2 }}>
        {/* 头像上传区域 */}
        <Stack direction="row" sx={{ mb: 2 }} alignItems="center">
          <Typography variant="subtitle2" sx={{ minWidth: '24%' }}>
            Logo
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Controller
              name="logo"
              control={control}
              render={({ field }) => (
                <Avatar
                  alt={'Logo'}
                  variant="square"
                  src={
                    typeof field.value === 'string'
                      ? field.value
                      : field.value
                      ? URL.createObjectURL(field.value)
                      : ''
                  }
                  sx={{
                    width: 78,
                    height: 78,
                    borderRadius: '4px',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.8,
                      borderColor: 'primary.main',
                    },
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = e => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        const file = files[0];
                        // 检查文件大小
                        if (file.size > 1024 * 1024) {
                          message.error('文件大小不能超过1MB');
                          return;
                        }
                        field.onChange(file);
                      }
                    };
                    input.click();
                  }}
                >
                  {!field.value && (
                    <Stack sx={{ color: 'text.secondary' }} alignItems="center">
                      <FileUploadIcon />
                      <Typography variant="caption">点击上传</Typography>
                    </Stack>
                  )}
                </Avatar>
              )}
            />
          </Box>
        </Stack>

        {/* 名称输入区域 */}
        <Stack direction="row" sx={{ mb: 2 }} alignItems="center">
          <Stack direction="row" sx={{ minWidth: '24%' }}>
            <Typography
              variant="subtitle2"
              sx={{ minWidth: '24%', '&:last-letter': { color: 'error.main' } }}
            >
              Logo 文字
            </Typography>
            <Typography variant="subtitle2" sx={{ minWidth: '24%', color: 'error.main' }}>
              *
            </Typography>
          </Stack>

          <TextField
            {...register('text')}
            placeholder="请输入品牌文字"
            fullWidth
            error={!!errors.text}
            helperText={errors.text?.message}
            slotProps={{
              inputLabel: {
                shrink: !!watch('text') || undefined,
                sx: { display: 'none' },
              },
            }}
          />
        </Stack>
      </Box>
    </Card>
  );
};

export default Logo;
