'use client';
import { getUserLoginMethod, postUserRegister } from '@/api';
import { Message } from '@/components';
import { aesCbcEncrypt } from '@/utils/aes';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Stack, TextField, Typography, CircularProgress } from '@mui/material';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';

const schema = z.object({
  name: z.string().min(1, '用户名不能为空').default(''),
  email: z.string().email('邮箱格式不正确').default(''),
  password: z.string().min(6, '密码不能少于 6 位').default(''),
  re_password: z.string().default(''),
});

const Register = () => {
  const [loading, setLoading] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await getUserLoginMethod();
        const enabled = response?.enable_register ?? false;
        setRegistrationEnabled(enabled);
        
        if (!enabled) {
          // 如果注册被禁用，显示404页面
          setTimeout(() => {
            window.location.replace('/register/not-found');
          }, 100);
        }
      } catch (error) {
        console.error('Failed to check registration status:', error);
        setRegistrationEnabled(false);
        setTimeout(() => {
          window.location.replace('/register/not-found');
        }, 100);
      } finally {
        setLoading(false);
      }
    };

    checkRegistrationStatus();
  }, []);

  const handleRegister = (data: z.infer<typeof schema>) => {
    if (data.password !== data.re_password) {
      Message.error('两次密码不一致');
      return;
    }
    const password = aesCbcEncrypt(data.password.trim());
    const { re_password, ...submitData } = data;
    postUserRegister({ ...submitData, password }).then(() => {
      Message.success('注册成功！');
      redirect('/login');
    });
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 200,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!registrationEnabled) {
    return null; // 将被重定向到not-found页面
  }
  return (
    <>
      <Typography
        variant='h1'
        sx={{ fontSize: '24px', mt: '52px', fontWeight: 600, mb: '9px' }}
      >
        账号注册
      </Typography>
      <Stack spacing={2} sx={{ width: '100%' }}>
        <TextField
          {...register('name')}
          label='用户名'
          size='small'
          error={!!errors.name}
          helperText={errors.name?.message}
        />
        <TextField
          {...register('email')}
          label='邮箱'
          size='small'
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          {...register('password')}
          label='密码'
          size='small'
          // type='password'
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <TextField
          {...register('re_password')}
          size='small'
          label='确认密码'
          // type='password'
          error={!!errors.re_password}
          helperText={errors.re_password?.message}
        />
        <Button
          variant='contained'
          onClick={handleSubmit(handleRegister, (e) => {
            console.log(e);
          })}
        >
          注册
        </Button>
      </Stack>
      <Box sx={{ color: 'rgba(0,0,0,0.3)', fontSize: 14, mt: 6 }}>
        已有账号，
        <Box component={Link} href='/login' sx={{ color: 'primary.main' }}>
          去登录
        </Box>
      </Box>
    </>
  );
};

export default function Ui() {
  return (
    <Suspense>
      <Register />
    </Suspense>
  );
}
