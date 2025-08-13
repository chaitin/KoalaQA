import { getAdminBot, putAdminBot } from '@/api';
import Card from '@/components/card';
import { zodResolver } from '@hookform/resolvers/zod';

import { Avatar, Box, Button, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { object, z } from 'zod';
import { id } from 'zod/v4/locales';

const formSchema = z.object({
  avatar: z.union([z.string(), z.instanceof(File)]),
  name: z.string().min(1, '名称不能为空').max(50, '名称不能超过50个字符'),
  unknown_prompt: z.string().min(1, '必填项').optional(),
  id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const UserForm: React.FC = () => {
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
  const onSubmit = (data: FormData) => {
    if (!dirtyFields.avatar) {
      putAdminBot({
        name: data.name,
        unknown_prompt: data.unknown_prompt || '',
      });
    } else {
      putAdminBot(data as any);
    }
  };
  useEffect(() => {
    getAdminBot().then((res) => {
      console.log(res)
      reset(res);
    });
  }, []);
  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
      <Typography variant='body2' sx={{ mb: 2 }}>
        社区智能机器人
      </Typography>
      <Box component='form' onSubmit={handleSubmit(onSubmit)}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Controller
            name='avatar'
            control={control}
            render={({ field }) => (
              <Avatar
                alt={'机器人头像'}
                src={
                  typeof field.value === 'string'
                    ? field.value
                    : field.value
                    ? URL.createObjectURL(field.value)
                    : ''
                }
                sx={{
                  width: 80,
                  height: 80,
                  mb: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files && files.length > 0) {
                      field.onChange(files[0]);
                    }
                  };
                  input.click();
                }}
              />
            )}
          />
        </Box>

        <TextField
          {...register('name')}
          label='名称'
          fullWidth
          required
          error={!!errors.name}
          helperText={errors.name?.message}
          sx={{ mb: 2 }}
          slotProps={{
            'inputLabel': {
              shrink: !!watch('name') || undefined
            }
          }}
        />

        <TextField
          {...register('unknown_prompt')}
          label='无法回答提示'
          fullWidth
          multiline
          rows={4}
          error={!!errors.unknown_prompt}
          helperText={errors.unknown_prompt?.message}
          sx={{ mb: 3 }}
           slotProps={{
            'inputLabel': {
              shrink: !!watch('unknown_prompt') || undefined
            }
          }}
        />
        {isDirty && (
          <>
            <Button
              onClick={() => {
                reset();
              }}
              variant='outlined'
              sx={{ alignSelf: 'flex-start', mr: 2 }}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
              sx={{ alignSelf: 'flex-start' }}
            >
              保存
            </Button>
          </>
        )}
      </Box>
    </Card>
  );
};

export default UserForm;
