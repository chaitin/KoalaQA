import { styled } from '@mui/material/styles';
import { primary, primaryHover } from '@/constant';

export const CheckIcon = styled('span')(({ theme }) => ({
  borderRadius: 4,
  width: 16,
  height: 16,
  margin: '4px',
  border: '1px solid #D9D9D9',
  //   boxShadow:
  //     theme.palette.mode === "dark"
  //       ? "0 0 0 1px rgb(16 22 26 / 40%)"
  //       : "inset 0 0 0 1px rgba(16,22,26,.2), inset 0 -1px 0 rgba(16,22,26,.1)",
  backgroundColor: '#fff',
  'input:hover ~ &': {
    backgroundColor: theme.palette.mode === 'dark' ? '#30404d' : '#ebf1f5',
  },
  'input:disabled ~ &': {
    boxShadow: 'none',
    background: '#F7F7F7',
  },
}));

export const CheckedIcon = styled(CheckIcon)({
  backgroundColor: primary,
  backgroundImage:
    'linear-gradient(180deg,hsla(0,0%,100%,.1),hsla(0,0%,100%,0))',
  '&:before': {
    display: 'block',
    width: 16,
    height: 16,
    backgroundImage:
      "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath" +
      " fill-rule='evenodd' clip-rule='evenodd' d='M12 5c-.28 0-.53.11-.71.29L7 9.59l-2.29-2.3a1.003 " +
      "1.003 0 00-1.42 1.42l3 3c.18.18.43.29.71.29s.53-.11.71-.29l5-5A1.003 1.003 0 0012 5z' fill='%23fff'/%3E%3C/svg%3E\")",
    content: '""',
  },
  'input:hover ~ &': {
    backgroundColor: primaryHover,
  },
});

export const CenterPage = styled('div')(() => ({
  height: '100%',
  width: '100%',
  display: 'grid',
  placeItems: 'center',
  position: 'absolute',
  marginTop: '64px',
}));
