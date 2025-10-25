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
import { useSearchParams, useRouter } from 'next/navigation';
import z from 'zod';

const schema = z.object({
  email: z.string().email('邮箱格式不正确').default(''),
  password: z.string().min(5, '密码不能少于 5 位').default(''),
});

const Account = ({ isChecked, passwordConfig }: { isChecked: boolean, passwordConfig?: SvcAuthFrontendGetAuth }) => {
  const [, setToken] = useLocalStorageState<string>('auth_token', {
    defaultValue: '',
  });
  const { user, loading } = useContext(AuthContext);
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectUrl = searchParams?.get('redirect');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    console.log('[Login Account] useEffect triggered:', {
      loading,
      userEmail: user.email,
      userUid: user.uid,
      redirectUrl,
      userObject: user
    });
    
    // 只有在用户数据加载完成且确实有用户信息时才检查登录状态
    if (!loading && user.email && user.uid && user.uid > 0) {
      console.log('[Login Account] User is authenticated, redirecting to:', redirectUrl || '/');
      // 如果用户已登录，重定向到指定页面或首页
      const targetUrl = redirectUrl || '/';
      // 使用 Next.js 路由进行客户端跳转
      router.replace(targetUrl);
    } else if (!loading && user.uid === 0) {
      // 明确知道用户未登录，不需要进一步处理
      console.log('[Login Account] User is not authenticated');
    } else {
      console.log('[Login Account] User state is still loading or indeterminate');
    }
  }, [loading, user.email, user.uid, redirectUrl]);

  // 监听认证清除事件，避免在登出后重复检查
  useEffect(() => {
    const handleAuthCleared = () => {
      console.log('[Login Account] Auth cleared event received, user should be logged out');
      // 认证清除后，确保用户状态为未登录
      // 这里不需要额外处理，因为 AuthProvider 已经会重置用户状态
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:cleared', handleAuthCleared);
      return () => {
        window.removeEventListener('auth:cleared', handleAuthCleared);
      };
    }
  }, []);
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
        router.replace(targetUrl);
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
