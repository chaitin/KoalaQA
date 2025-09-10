'use client';

import { AuthContext } from '@/components/authProvider';
import { CommonContext } from '@/components/commonProvider';
import { ALL_TOOLKIT_LIST, TOOLKIT_LIST } from '@/constant/toolkit';
import { AppBar, Button, Stack, Typography } from '@mui/material';
import { useDebounceFn, useLocalStorageState } from 'ahooks';

import Cookies from 'js-cookie';
import { usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import LoggedInView from './loggedInView';
import Link from 'next/link';

const Header = () => {
  const [token, setToken] = useLocalStorageState<string>('auth_token');
  const [afterKeyword, setAfterKeyword] = useState('');
  const [toolList, setToolList] = useState<any[]>(TOOLKIT_LIST);
  const [keyword, setKeyword] = useState('');

  const { user } = useContext(AuthContext);
  const router = useRouter();

  const { run: runSearch } = useDebounceFn(
    (k: string) => {
      handleSearch(k.trim());
    },
    { wait: 500 }
  );

  const handleSearch = (k: string) => {
    if (k === '') {
      setToolList(TOOLKIT_LIST);
      setAfterKeyword(k);
      return;
    }
    const toolList = ALL_TOOLKIT_LIST.reduce((prev, cur) => {
      const tools = cur.tools.filter((item) =>
        item.name.toUpperCase().includes(k.toUpperCase())
      );
      if (tools.length) {
        prev.push({
          name: cur.name,
          tools,
        });
      }
      return prev;
    }, [] as any[]);

    setToolList(toolList);
    setAfterKeyword(k);
  };
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
  useEffect(() => {
    runSearch(keyword);
  }, [keyword]);

  return (
    <AppBar
      position='fixed'
      sx={{
        backgroundColor: '#fff',
        transition: 'background-color 0.2s',
        zIndex: 100,
        boxShadow:
          '0px 2px 6px 0px rgba(0,0,0,0.1), 0px 2px 6px 0px rgba(218,220,224,0.5)',
        // ...headerStyle,
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
          {user.uid ?
            <>
              <Link href={window.location.origin + '/admin/ai'}>
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
              <LoggedInView />
            </>
          : <>
              <Button
                variant='outlined'
                sx={{ borderRadius: 1, height: 44, width: 122, fontSize: 14 }}
                onClick={() => {
                  window.open('/register', '_self');
                }}
              >
                立即注册
              </Button>
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
