'use client';
import { postUserLogout } from '@/api';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import React from 'react';
import { InfoCard } from './components';
export interface ProfilePanelProps {
  userInfo: any | null;
  verified: boolean;
  promotionInfo?: any;
}

const ProfilePanel: React.FC<ProfilePanelProps> = () => {
  const [, setToken] = useLocalStorageState('token');
  const handleLogout = () => {
    postUserLogout().then(() => {
      setToken('');
      window.open('/login', '_self');
    });
  };

  return (
    <InfoCard>
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
