'use client';
import { postUserLogin } from '@/api';
import { Message } from '@/components';
import { AuthContext } from '@/components/authProvider';
import LoadingBtn from '@/components/loadingButton';
import { aesCbcEncrypt } from '@/utils/aes';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, TextField } from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import { useRouter } from 'next/navigation';
import { useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import Cookies from 'js-cookie';

const schema = z.object({
  email: z.email('邮箱格式不正确').default(''),
  password: z.string().min(6, '密码不能少于 6 位').default(''),
});

const Account = ({ isChecked }: { isChecked: boolean }) => {
  const [token, setToken] = useLocalStorageState<string>('auth-token', {
    defaultValue: '',
  });
  const { user, fetchUser } = useContext(AuthContext);
  const router = useRouter(); // 获取 router 对象
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });
  useEffect(() => {
    if (user.email) {
      window.location.href = '/';
    }
  }, [user]);
  const onSubmit = (data: z.infer<typeof schema>) => {
    const { password, email } = data;
    const ciphertext = aesCbcEncrypt(password?.trim());
    return postUserLogin({ email, password: ciphertext })
      .then((res) => {
        setToken(res);
        Cookies.set('auth-token', token, {
          path: '/',
          expires: 7, // 7 天
          secure: true, // 如果你是 https
          sameSite: 'Lax',
        });
        fetchUser();
        router.replace('/');
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
        登录
      </LoadingBtn>
    </Stack>
  );
};

export default Account;
