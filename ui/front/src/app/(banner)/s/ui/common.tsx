'use client';
import { alpha, Box, BoxProps, styled } from '@mui/material';
import Link from 'next/link';
import React from 'react';

export const Tag = styled('div')(({ theme }) => ({
  padding: '1px 8px',
  borderRadius: '4px',
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  fontSize: '12px',
}));

export const Title = styled(Box)(() => ({
  fontSize: 16,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  fontWeight: 600,
  color: '#000',
}));

export const CardWrap = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  background: '#fff',
  borderRadius: '8px',
  padding: '24px',
  backgroundColor: '#fff',
  '&:hover': {
    boxShadow: '0px 4px 60px 0px rgba(0,28,85,0.04)',
    '.card-title': {
      color: theme.palette.primary.main,
    },
  },
  color: 'rgba(0, 0, 0, 0.87)',
  cursor: 'pointer',
  transition: 'all 0.3s',
}));

interface CardProps extends BoxProps {
  href?: string;
}

export const Card = (props: CardProps) => {
  const { href: _href, ...other } = props;
  return <CardWrap {...other} />;
};

export const MatchedString = ({
  keywords,
  str,
}: {
  keywords?: string;
  str: string;
}) => {
  if (!keywords || !str) return str;
  const reg = new RegExp(keywords.replace(/\\/g, '\\\\'), 'ig');
  const arr = str.split(reg);
  const res = str.match(reg);
  return (
    <>
      {arr.map((it, index) => (
        <React.Fragment key={index}>
          {it}
          {index < arr.length - 1 && (
            <span style={{ color: 'red' }}>{res![index]}</span>
          )}
        </React.Fragment>
      ))}
    </>
  );
};
