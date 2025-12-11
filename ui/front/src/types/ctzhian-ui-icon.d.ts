// 扩展第三方 @ctzhian/ui 的 Icon 类型，让 type 受本地 icon 集合约束
import type { FC } from 'react';
import type { SvgIconProps } from '@mui/material';
import type { IconType } from '@/components/icon.types';

declare module '@ctzhian/ui' {
  interface IconProps extends SvgIconProps {
    type: IconType;
  }

  // 重声明 Icon，应用受限的 IconProps
  export const Icon: FC<IconProps>;
}
