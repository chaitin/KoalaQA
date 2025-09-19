'use client';

import { ModelUserRole, getUserLoginMethod } from '@/api';
import { AppBar, Button, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoggedInView from './loggedInView';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useLocalStorageState } from 'ahooks';

interface HeaderProps {
  initialUser?: any | null;
}

const Header = ({ initialUser = null }: HeaderProps) => {
  const [token, setToken] = useLocalStorageState<string>('auth_token');
  const [user, setUser] = useState(initialUser);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [publicAccess, setPublicAccess] = useState(false);
  const router = useRouter();
const [backHref, setBackHref] = useState('/admin/ai');
  useEffect(() => {
    if (token) {
      Cookies.set('auth_token', token, {
        path: '/',
        expires: 7, // 7 天
        secure: true, // 如果你是 https
        sameSite: 'Lax',
      });
    }
  }, [token]);

  // 检查注册是否启用和公共访问状态
  useEffect(() => {
    const checkAuthConfig = async () => {
      try {
        const response = await getUserLoginMethod();
        setRegistrationEnabled(response?.enable_register ?? true);
        setPublicAccess(response?.public_access ?? false);
      } catch (error) {
        console.error('Failed to check auth config:', error);
        setRegistrationEnabled(false);
        setPublicAccess(false);
      }
    };

    checkAuthConfig();
  }, []);

  // 如果初始用户为空但有token，可能需要重新获取用户信息
  useEffect(() => {
    if (!initialUser && token) {
      // 这里可以添加客户端获取用户信息的逻辑
      // 或者触发页面刷新以重新获取服务端数据
    }
    setUser(initialUser);
  }, [initialUser, token]);
  // 使用状态来避免 hydration 不匹配
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setBackHref(`${window.location.protocol}//${window.location.hostname}:3400/admin/ai`);
    }
  }, []);
  return (
    <AppBar
      position='fixed'
      sx={{
        backgroundColor: '#fff',
        transition: 'background-color 0.2s',
        zIndex: 100,
        boxShadow:
          '0px 2px 6px 0px rgba(0,0,0,0.1), 0px 2px 6px 0px rgba(218,220,224,0.5)',
      }}
    >
      <Stack
        justifyContent='center'
        sx={{
          height: 64,
          position: 'relative',
          background: '#fff',
          display: { xs: 'flex', sm: 'none' },
        }}
      >
        <Typography
          variant='h2'
          sx={{
            ml: 2,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            color: '#000',
          }}
          onClick={() => {
            router.push('/');
          }}
        >
          Koala QA
        </Typography>
      </Stack>

      <Stack
        direction='row'
        sx={{
          height: 64,
          position: 'relative',
          display: { xs: 'none', sm: 'flex' },
        }}
        alignItems='center'
        justifyContent='space-between'
      >
        <Stack direction='row' alignItems='center'>
          <Typography
            variant='h2'
            sx={{
              ml: 5,
              mr: 10,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
              color: '#000',
            }}
            onClick={() => {
              router.push('/');
            }}
          >
            Koala QA
          </Typography>
        </Stack>

        <Stack
          direction='row'
          alignItems={'center'}
          gap={3}
          sx={{ position: 'absolute', top: 0, bottom: 0, right: 40 }}
        >
          {user?.role == ModelUserRole.UserRoleAdmin && (
            <Link href={backHref}>
              <Button
                variant='contained'
                sx={{
                  borderRadius: 1,
                  height: 44,
                  width: 122,
                  fontSize: 14,
                  boxShadow: 'none !important',
                }}
              >
                后台管理
              </Button>
            </Link>
          )}
          {user?.uid ?
            <LoggedInView user={user} />
          : <>
              {/* 在公共访问模式下，仍然显示登录和注册按钮，但用户可以选择不登录直接使用 */}
              {registrationEnabled && (
                <Button
                  variant='outlined'
                  sx={{ borderRadius: 1, height: 44, width: 122, fontSize: 14 }}
                  onClick={() => {
                    window.open('/register', '_self');
                  }}
                >
                  立即注册
                </Button>
              )}
              <Button
                variant='contained'
                sx={{
                  borderRadius: 1,
                  height: 44,
                  width: 122,
                  fontSize: 14,
                  boxShadow: 'none !important',
                }}
                onClick={() => {
                  window.open('/login', '_self');
                }}
              >
                登录
              </Button>
            </>
          }
        </Stack>
      </Stack>
    </AppBar>
  );
};

export default Header;
