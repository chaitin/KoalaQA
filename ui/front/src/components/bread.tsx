'use client';

import React from 'react';
import { useMemo } from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';

const ROUTER_NAME_TO_TITLE = {
  product: '产品详情',
  wiki: '产品列表',
  topic: '领域详情',
  vendors: '厂商详情',
  search: '搜索结果',
  blog: '文章列表',
  vuldb: '长亭漏洞情报库',
};

const Bread = () => {
  const pathname = usePathname();
  const pathArr = useMemo(() => {
    return pathname
      .split('/')
      .filter(
        (p) => ROUTER_NAME_TO_TITLE[p as keyof typeof ROUTER_NAME_TO_TITLE]
      );
  }, [pathname]);
  return (
    <Breadcrumbs sx={{ mb: 2 }}>
      <Link
        component={NextLink}
        color='#999'
        underline='none'
        href='/'
        sx={{
          lineHeight: '18px',
          display: 'block',
          fontSize: '12px',
          '&:hover': {
            color: 'primary.main',
          },
        }}
      >
        首页
      </Link>
      {pathArr.map((key, index) => {
        return index === pathArr.length - 1 ? (
          <Typography color='text.primary' key={key} sx={{ fontSize: '12px' }}>
            {ROUTER_NAME_TO_TITLE[key as keyof typeof ROUTER_NAME_TO_TITLE]}
          </Typography>
        ) : (
          <Link
            key={key}
            component={NextLink}
            color='#999'
            underline='none'
            href={`/${pathArr.slice(0, index + 1).join('/')}`}
            sx={{
              lineHeight: '18px',
              display: 'block',
              fontSize: '12px',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            {ROUTER_NAME_TO_TITLE[key as keyof typeof ROUTER_NAME_TO_TITLE]}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};

export default Bread;
