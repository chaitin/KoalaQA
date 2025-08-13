import React from 'react';
import { styled, SxProps } from '@mui/material/styles';
import { primary } from '@/asset/styles/colors';

export type LinkType = 'default' | 'text';

export interface LinkProps {
  children: React.ReactNode;
  highlight?: boolean;
  type?: LinkType;
  sx?: SxProps;
  onClick?: () => void;
}

const LinkComponent = styled('div', {
  shouldForwardProp: (prop) => prop !== 'hightlight' && prop !== 'type',
})<{ highlight?: string; type?: LinkType }>(
  ({ highlight = 'false', type = 'default' }) => ({
    minWidth: 64,
    maxHeight: 24,
    fontSize: 16,
    lineHeight: '24px',
    color: type === 'default' ? primary : 'inherit',
    cursor: 'pointer',
    '& > a': {
      textDecoration: 'none',
      color: 'inherit',
    },
    ...(highlight === 'true' && {
      '&::after': {
        display: 'block',
        content: "''",
        opacity: 0,
        width: '0%',
        height: 1,
        border: `1px solid ${primary}`,
      },
      '&:hover': {
        '&::after': {
          opacity: 1,
          width: '100%',
          transition: 'all 0.2s linear',
        },
      },
    }),
  })
);

const Link: React.FC<LinkProps> = (props) => {
  const { children, highlight, type, sx, onClick } = props;
  return (
    <LinkComponent
      highlight={highlight?.toString()}
      type={type}
      sx={sx}
      onClick={onClick}
    >
      {children}
    </LinkComponent>
  );
};

export default Link;
