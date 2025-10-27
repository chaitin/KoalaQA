import { Stack, styled } from '@mui/material';

export const Content = styled(Stack)(() => ({
  mt: '24px',
  gap: '30px',
  fontFamily: 'var(--font-mono)',
  mx: 'auto',
  width: '100%',
  overflow: 'auto',
  flex: 1,
  '& .react_md': {
    flexGrow: 2,
    width: '600px',
    '& h1': {
      fontSize: '20px',
      color: '#0B2562',
    },
    '& h2': {
      fontSize: '18px',
      margin: '6px 0',
    },
    '& h3': {
      color: '#0B2562',
      fontSize: '14px',
    },
    '& p,& table, & li': {
      fontSize: '12px',
    },
    '& code': {
      fontSize: '12px',
      lineHeight: '22px',
      fontFamily: 'Consolas',
      color: '#000000',
      background: 'rgba(247, 248, 250, 1)',
      borderRadius: '2px',
    },
    '& a': {
      textDecoration: 'none',
      color: 'unset',
      background: 'rgba(247, 248, 250, 1)',
      padding: '0 4px',
      borderRadius: '2px',
      margin: '14px 0',
      display: 'block',
      '&:hover': {
        color: 'rgba(52, 90, 255, 1)',
      },
    },
    '& table': {
      borderSpacing: '0',
      border: '1px solid #ddd',
      width: '100%',
      margin: '14px 0',
      borderRight: 'unset',
    },
    '& table td, & table th ': {
      borderRight: '1px solid #ddd',
      padding: '0 14px',
      textAlign: 'left',
      lineHeight: '36px',
    },
    '& table td': {
      borderTop: '1px solid #ddd',
      minWidth: '100px',
    },
    '& table tr:nth-child(2n)': {
      background: '#f8f8f8',
    },
    '& li, & p': {
      lineHeight: '24px',
    },
    '& blockquote': {
      padding: '0 1em',
      color: '#777',
      borderLeft: '0.25em solid #ddd',
    },
    '.markdown-body code::before, .markdown-body code::after, .markdown-body tt::before, .markdown-body tt::after':
    {
      letterSpacing: '-0.2em',
      content: `' '`,
      width: '4px',
      display: 'inline-block',
      heigth: '2px',
    },
  },
}));
