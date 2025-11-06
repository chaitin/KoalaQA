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
    
    // 如果是相对路径（以/开头），优先使用环境变量构建完整URL
    if (trimmedSrc.startsWith('/')) {
      // 优先使用环境变量，确保服务器端和客户端一致
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      
      // 如果有环境变量，使用环境变量构建完整URL
      if (baseUrl) {
        return `${baseUrl}${trimmedSrc}`;
      }
      
      // 如果没有环境变量，直接返回相对路径让Next.js处理
      // 这样可以避免服务器端和客户端的URL不一致
      return trimmedSrc;
    }
    
    // 其他情况直接返回
    return trimmedSrc;
  };

  const imageSrc = getImageSrc();

  return (
    <Box
      sx={{
        position: 'relative',
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
        unoptimized={true}
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

