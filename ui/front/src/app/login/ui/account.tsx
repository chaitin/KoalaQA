'use client';
import { postUserLogin, SvcAuthFrontendGetAuth } from '@/api';
import { Message } from '@/components';
import { AuthContext } from '@/components/authProvider';
import LoadingBtn from '@/components/loadingButton';
import { aesCbcEncrypt } from '@/utils/aes';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, TextField } from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import Cookies from 'js-cookie';
import { useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import z from 'zod';

const schema = z.object({
  email: z.string().email('邮箱格式不正确').default(''),
  password: z.string().min(5, '密码不能少于 5 位').default(''),
});

const Account = ({ isChecked, passwordConfig }: { isChecked: boolean, passwordConfig?: SvcAuthFrontendGetAuth }) => {
  const [, setToken] = useLocalStorageState<string>('auth_token', {
    defaultValue: '',
  });
  const { user } = useContext(AuthContext);
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (user.email && user.uid) {
      // 如果用户已登录，重定向到指定页面或首页
      const targetUrl = redirectUrl || '/';
      // 使用setTimeout避免在渲染过程中立即重定向
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 100);
    }
  }, [user.email, user.uid, redirectUrl]);
  const onSubmit = (data: z.infer<typeof schema>) => {
    const { password, email } = data;
    const ciphertext = aesCbcEncrypt(password?.trim());
    return postUserLogin({ email, password: ciphertext })
      .then(async (res) => {
        setToken(res);
        Cookies.set('auth_token', res, {
          path: '/',
          expires: 7, // 7 天
          sameSite: 'Lax',
        });

        // 登录成功后重定向
        const targetUrl = redirectUrl || '/';
        window.location.href = targetUrl;
      })
      .catch((e) => {
        Message.error(e || '登录失败');
      });
  };

  return (
    <Stack gap={2} sx={{ width: '100%', alignItems: 'center' }}>
      <TextField
        autoComplete='off'
        {...register('email')}
        error={!!errors.email?.message}
        helperText={errors.email?.message}
        label='邮箱'
        sx={{ height: '64px' }}
        placeholder='邮箱'
        fullWidth={true}
        size='small'
      />
      <TextField
        autoComplete='off'
        {...register('password')}
        error={!!errors.password?.message}
        helperText={errors.password?.message}
        sx={{ height: '64px' }}
        label='密码'
        placeholder='请输入密码'
        type='password'
        fullWidth={true}
        size='small'
      />

      <LoadingBtn
        variant='contained'
        id='login-in-id'
        onClick={handleSubmit(onSubmit)}
        disabled={!isChecked}
        sx={{ width: '100%' }}
      >
        {passwordConfig?.button_desc || '登录'}
      </LoadingBtn>
    </Stack>
  );
};

export default Account;
