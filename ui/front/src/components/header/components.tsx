'use client';
import { Avatar, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';

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



export const FlexRow = styled('div')(() => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
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



export const OrgIcon = styled(Avatar)(() => ({
  width: '34px',
  height: '34px',
  fontSize: '16px',
}));
