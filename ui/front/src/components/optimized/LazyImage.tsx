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

  // 处理图片源地址
  const getImageSrc = () => {
    if (error) return fallback;
    
    if (!src || typeof src !== 'string' || src.trim() === '') {
      return fallback;
    }

    const trimmedSrc = src.trim();
    
    // 如果是完整URL，直接返回
    if (trimmedSrc.startsWith('http://') || trimmedSrc.startsWith('https://')) {
      return trimmedSrc;
    }
    
    // 如果是相对路径（以/开头），需要构建完整的URL
    if (trimmedSrc.startsWith('/')) {
      // 优先使用环境变量，然后使用当前域名
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 
        (typeof window !== 'undefined' 
          ? `${window.location.protocol}//${window.location.host}`
          : '');
      
      // 如果无法获取baseUrl，直接返回原始路径让Next.js处理
      if (!baseUrl) {
        return trimmedSrc;
      }
      
      return `${baseUrl}${trimmedSrc}`;
    }
    
    // 其他情况直接返回
    return trimmedSrc;
  };

  const imageSrc = getImageSrc();

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
          objectFit: 'contain',
          objectPosition: 'center',
        }}
      />
    </Box>
  );
}

export default LazyImage;

