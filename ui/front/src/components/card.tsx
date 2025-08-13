'use client';

import { styled } from '@mui/material/styles';

export const Card = styled('div')(({ theme }) => ({
  background: '#fff',
  borderRadius: '8px',
  padding: '24px',
  [theme.breakpoints.down('sm')]: {
    padding: '20px',
  },
}));
