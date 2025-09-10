'use client';
import { postUserLogout } from '@/api';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import React, { useContext, useEffect } from 'react';
import { InfoCard } from './components';
import { AuthContext } from '../authProvider';
import Cookies from 'js-cookie';

const ProfilePanel = () => {
  const [, setToken] = useLocalStorageState<string>('auth_token');
  const { user } = useContext(AuthContext);
  const handleLogout = () => {
    postUserLogout().then(() => {
      setToken('');
      Cookies.set('auth_token', '', {
        path: '/login',
        sameSite: 'Lax',
      });
      window.location.href = '/login';
    });
  };

  return (
    <InfoCard>
      <Box
        sx={{
          color: '#000',
          fontSize: '16px',
          lineHeight: '30px',
          pl: 2,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {user.username}
      </Box>
      <List
        sx={{
          width: '100%',
          maxWidth: 360,
          py: 0,
          bgcolor: 'background.paper',
        }}
      >
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
              <HighlightOffIcon sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }} primary='退出' />
          </ListItemButton>
        </ListItem>
      </List>
    </InfoCard>
  );
};

export default ProfilePanel;
