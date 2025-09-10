'use client';
import { postUserLogin } from '@/api';
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
import z from 'zod';

const schema = z.object({
  email: z.email('邮箱格式不正确').default(''),
  password: z.string().min(5, '密码不能少于 5 位').default(''),
});

const Account = ({ isChecked }: { isChecked: boolean }) => {
  const [,setToken] = useLocalStorageState<string>('auth_token', {
    defaultValue: '',
  });
  const { user, fetchUser } = useContext(AuthContext);
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
      .then(async (res) => {
        setToken(res);
        fetchUser();
        Cookies.set('auth_token', res, {
          path: '/',
          expires: 7, // 7 天
          sameSite: 'Lax',
        });
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
