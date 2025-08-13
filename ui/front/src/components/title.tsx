'use client';

import { styled } from '@mui/material/styles';

const Title = styled('div')(({ theme }) => ({
  position: 'relative',
  fontSize: '16px',
  fontWeight: 600,
  color: theme.palette.primary.main,
  paddingLeft: '24px',
  '&:before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '8px',
    height: '8px',
    backgroundColor: theme.palette.primary.main,
    borderRadius: '50%',
  },
  '&:after': {
    content: '""',
    zIndex: 1,
    position: 'absolute',
    left: '4px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '8px',
    height: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(2px)',
    borderRadius: '50%',
  },
}));

export default Title;
