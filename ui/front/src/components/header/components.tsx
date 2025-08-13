'use client';
import {
  Side_Margin,
  primary,
  primaryClick,
  primaryHover,
  primaryLight,
  primaryLightGradient,
} from '@/constant';
import { Avatar, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';

export const ProfileComponent = styled('div')(({ theme }) => ({
  display: 'flex',
  flex: 1,
  justifyContent: 'flex-end',
  height: '100%',
  alignItems: 'center',
  [theme.breakpoints.down('sm')]: {
    justifyContent: 'end',
  },
}));

export const ProfileCardComponent = styled(Stack)(() => ({}));

export const InfoCard = styled(Stack)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',

  [theme.breakpoints.down('sm')]: {
    height: '100%',
  },
}));

export const IdCard = styled(Stack)(() => ({
  backgroundPositionY: 'center',
  backgroundPositionX: 'right',
  backgroundSize: '60%',
  backgroundRepeat: 'no-repeat',
  minWidth: '320px',
}));

export const IdInfo = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
}));

export const Row = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
}));

export const TagRow = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  fontSize: '14px',
  gap: '8px',
  marginLeft: '60px',
  marginTop: '8px',
  marginBottom: '24px',
  '& > svg': {
    fill: primary,
  },
}));

export const FlexRow = styled('div')(() => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
}));

export const Badge = styled('div', {
  shouldForwardProp: (prop) => prop !== 'state',
})<{ state: 'warning' | 'success' }>(({ state }) => ({
  display: 'flex',
  padding: '0 10px',
  borderRadius: '2px',
  alignItems: 'center',
  fontSize: '12px',
  ...(state === 'success' && {
    backgroundColor: primaryLight,
    color: primary,
  }),
  ...(state === 'warning' && {
    backgroundColor: '#FFF8E5',
    color: '#FFBF00',
  }),
}));

export const PanelMenu = styled('div')(() => ({
  // display: 'grid',
  // gridTemplateColumns: '1fr 1fr',
  // gap: '16px',
}));

export const PanelMenuItem = styled('div')(() => ({
  display: 'flex',
  width: '100%',
  backgroundImage: primaryLightGradient,
  alignItems: 'center',
  padding: '0px 12px',
  cursor: 'pointer',
}));

export const PanelFooter = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '0px 14px 24px 14px',
  [theme.breakpoints.down('sm')]: {
    marginTop: 'auto',
  },
}));

export const PanelHeader = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  padding: `${parseInt(Side_Margin) / 2}% ${Side_Margin}`,
}));

export const WorkbenchButton = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '102px',
  height: '30px',
  cursor: 'pointer',
  color: '#fff',
  borderRadius: '4px',
  backgroundColor: primary,
  '&:hover': {
    backgroundColor: primaryHover,
  },
  '&:active': {
    backgroundColor: primaryClick,
  },
});

export const OrgCard = styled(FlexRow)(() => ({
  backgroundColor: 'transparent',
  justifyContent: 'space-between',
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  padding: '12px',
  '&:hover': {
    backgroundColor: '#52C41A10',
    transition: 'all 0.2s ease-in-out',
    '& > div > div': {
      color: primary,
      transition: 'all 0.2s ease-in-out',
    },
    '& > div > div > div': {
      color: primary,
      transition: 'all 0.2s ease-in-out',
    },
  },
}));

export const OrgIcon = styled(Avatar)(() => ({
  width: '34px',
  height: '34px',
  fontSize: '16px',
}));
