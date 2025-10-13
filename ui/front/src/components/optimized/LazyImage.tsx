/**
 * 优化的图片组件
 * 支持懒加载、占位符、错误处理
 */

'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import { Box, Skeleton } from '@mui/material';

interface LazyImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallback?: string;
  showPlaceholder?: boolean;
  aspectRatio?: number;
}

export function LazyImage({
  src,
  alt,
  fallback = '/empty.png',
  showPlaceholder = true,
  aspectRatio,
  ...props
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  const imageSrc = error ? fallback : src;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: aspectRatio || 'auto',
        overflow: 'hidden',
      }}
    >
      {isLoading && showPlaceholder && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      )}
      <Image
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        quality={85}
        {...props}
        style={{
          ...props.style,
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </Box>
  );
}

export default LazyImage;

