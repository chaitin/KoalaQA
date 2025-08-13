'use client';
import React, { type FC, forwardRef } from 'react';

import { styled, SvgIconProps } from '@mui/material';

interface IconProps extends SvgIconProps {
  type: string;
}

const IconRoot = styled('svg', {
  name: 'Icon',
  slot: 'Root',
})(() => ({
  width: '1em',
  height: '1em',
  fill: 'currentColor',
  display: 'block',
}));

const Icon = forwardRef<SVGSVGElement, IconProps>(({ type, ...other }, ref) => {
  return (
    <IconRoot {...other} ref={ref}>
      <use xlinkHref={`#${type}`} />
    </IconRoot>
  );
});

Icon.displayName = 'Icon';
export default Icon;
