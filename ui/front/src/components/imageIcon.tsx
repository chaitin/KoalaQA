'use client';

import React from 'react';
import { styled, SxProps } from '@mui/material/styles';
import Image, { StaticImageData } from 'next/image';

export const IconWrapper = styled('div')(() => ({
  display: 'inline-block',
  transition: 'all 0.2s linear',
}));

export interface ImageIconProps {
  src: string | StaticImageData;
  className?: string;
  sx?: SxProps;
  id?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const ImageIcon: React.FC<ImageIconProps> = (props) => {
  const { src, className, sx, id, onClick } = props;
  return (
    <IconWrapper className={className} sx={sx} id={id} onClick={onClick}>
      <Image alt='icon' src={src} style={{ width: '100%', height: '100%' }} />
    </IconWrapper>
  );
};
