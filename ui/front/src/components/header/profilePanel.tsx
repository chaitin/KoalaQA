'use client';
import { postUserLogout } from '@/api';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import {
  Avatar,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
} from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import React, { useContext, useEffect } from 'react';
import { Badge, IdCard, IdInfo, InfoCard, Row, TagRow } from './components';
import { AuthContext } from '../authProvider';
import Cookies from 'js-cookie';
import Icon from '../icon';
import { clearAuthData } from '@/api/httpClient';

export const OPT_LIST = [
  {
    name: '个人中心',
    icon: 'icon-gerenzhongxin',
    link: '/profile',
  },
];
const ProfilePanel = () => {
  const [, setToken] = useLocalStorageState<string>('auth_token');
  const { user } = useContext(AuthContext);
  const handleLogout = () => {
    postUserLogout()
      .then(() => {
        // 使用统一的清除认证信息函数
        clearAuthData();
        setToken('');
        window.location.href = '/login';
      })
      .catch(() => {
        // 即使登出API失败，也要清除本地认证信息
        clearAuthData();
        setToken('');
        window.location.href = '/login';
      });
  };

  return (
    <InfoCard>
      <IdCard>
        <IdInfo>
          <Avatar src={user.avatar} sx={{ width: 40 }} />
          <Stack>
            <Box
              sx={{
                fontSize: '14px',
                textOverflow: 'ellipsis',
                maxWidth: '10rem',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                fontWeight: 700,
                color: '#000',
              }}
              title={user?.username}
            >
              {user?.username}
            </Box>
          </Stack>
        </IdInfo>
      </IdCard>

      <Box sx={{ borderBottom: '1px dashed #EEEEEE', my: 2.5 }}></Box>

      <List
        sx={{
          width: '100%',
          maxWidth: 360,
          py: 0,
          bgcolor: 'background.paper',
        }}
      >
        {OPT_LIST.map((item) => {
          return (
            <ListItem
              key={item.name}
              disablePadding
              sx={{
                height: 40,
                borderRadius: '4px',
                marginBottom: '4px',
                transition: 'background 0.3s',
                '&:hover': {
                  background: 'rgba(32,108,255,0.1)',
                },
              }}
            >
              <ListItemButton
                sx={{
                  '&:hover': {
                    background: 'transparent',
                  },
                }}
                onClick={() => {
                  window.open(item.link, '_target');
                }}
                dense
              >
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <Icon type={item.icon} sx={{ fontSize: 16 }} />
                </ListItemIcon>
                <ListItemText sx={{ color: '#000' }} primary={item.name} />
              </ListItemButton>
            </ListItem>
          );
        })}
        <ListItem
          disablePadding
          sx={{
            height: 40,
            borderRadius: '4px',
            marginBottom: '4px',
            transition: 'background 0.3s',
            '&:hover': {
              background: 'rgba(246,78,84,0.06)',
            },
          }}
        >
          <ListItemButton
            onClick={handleLogout}
            dense
            sx={{
              '&:hover': {
                background: 'transparent',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              <Icon
                type={'icon-tuichu'}
                sx={{ fontSize: 16, color: 'error.main' }}
              />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }} primary='退出' />
          </ListItemButton>
        </ListItem>
      </List>
    </InfoCard>
  );
};

export default ProfilePanel;
