import { getAdminBot, putAdminBot } from '@/api';
import Card from '@/components/card';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar, Box, Button, Stack, TextField, Typography } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { message } from '@ctzhian/ui';

const formSchema = z.object({
  avatar: z.union([z.string(), z.instanceof(File)]),
  name: z.string().min(1, '名称不能为空').max(50, '名称不能超过50个字符'),
  unknown_prompt: z.string().optional(),
  id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const Bot: React.FC = () => {
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
      avatar: '',
      name: '',
      unknown_prompt: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!dirtyFields.avatar) {
      await putAdminBot({
        name: data.name,
        unknown_prompt: data.unknown_prompt || '',
      });
    } else {
      await putAdminBot(data as any);
    }
    message.success('保存成功');
    reset(data);
  };

  useEffect(() => {
    getAdminBot().then(res => {
      reset(res);
    });
  }, []);

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="subtitle2">社区智能机器人</Typography>
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
            头像
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Controller
              name="avatar"
              control={control}
              render={({ field }) => (
                <Avatar
                  alt={'机器人头像'}
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
                        field.onChange(files[0]);
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
              名称
            </Typography>
            <Typography variant="subtitle2" sx={{ minWidth: '24%', color: 'error.main' }}>
              *
            </Typography>
          </Stack>

          <TextField
            {...register('name')}
            placeholder="请输入机器人名称"
            fullWidth
            error={!!errors.name}
            helperText={errors.name?.message}
            slotProps={{
              inputLabel: {
                shrink: !!watch('name') || undefined,
                sx: { display: 'none' },
              },
            }}
          />
        </Stack>

        {/* 无法回答提示区域 */}
        <Stack direction="row" alignItems="self-start">
          <Typography variant="subtitle2" sx={{ minWidth: '24%', pt: 1 }}>
            无法回答提示
          </Typography>
          <TextField
            {...register('unknown_prompt')}
            placeholder="当机器人无法回答问题时的提示语"
            fullWidth
            multiline
            rows={6}
            error={!!errors.unknown_prompt}
            helperText={errors.unknown_prompt?.message}
            slotProps={{
              inputLabel: {
                shrink: !!watch('unknown_prompt') || undefined,
                sx: { display: 'none' },
              },
            }}
          />
        </Stack>
      </Box>
    </Card>
  );
};

export default Bot;
