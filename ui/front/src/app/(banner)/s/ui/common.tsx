'use client';
import React from 'react';
import { styled, alpha, Box, Stack, Typography, BoxProps } from '@mui/material';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { TopicLink } from '@/components/common';
import Link from 'next/link';
import dayjs from 'dayjs';
import { Image as AntdImage } from 'antd';
import { formatNumber } from '@/utils';

export const Tag = styled('div')(({ theme }) => ({
  padding: '1px 8px',
  borderRadius: '4px',
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  fontSize: '12px',
}));

export const Title = styled(Link)(({ theme }) => ({
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
  const { href, ...other } = props;
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

export const ProductCard = ({
  data,
  keywords,
  tag = true,
}: {
  data: any;
  keywords?: string;
  tag?: boolean;
}) => {
  const it = data;
  return (
    <Card href={`/product/${it.id}`}>
      <Stack direction='row' justifyContent='space-between'>
        <Stack direction='row' gap={1.5} alignItems='center'>
          <Box
            component='img'
            src={it.logo || it.vendor.logo}
            style={{
              flexShrink: 0,
              height: 40,
              width: 40,
              objectFit: 'contain',
              borderRadius: '50%',
            }}
            alt='产品logo'
          />
          <Box
            sx={{
              overflow: 'hidden',
            }}
          >
            <Stack direction='row' alignItems='center' gap={1}>
              {tag && <Tag>产品</Tag>}
              <Title
                href={`/product/${it.id}`}
                className='card-title'
                target='_blank'
              >
                <MatchedString
                  keywords={keywords}
                  str={it.name}
                ></MatchedString>
              </Title>
            </Stack>

            <Typography
              variant='body2'
              sx={{
                fontSize: 12,
                color: '#999',
                lineHeight: 1.5,
              }}
            >
              {it.vendor?.name}
            </Typography>
          </Box>
        </Stack>
        <Stack
          direction='row'
          gap={1}
          alignItems='flex-start'
          justifyContent='flex-end'
          sx={{ mt: '2px', flexShrink: 0, width: 100 }}
        >
          <Stack
            direction='row'
            alignItems='center'
            gap={1}
            sx={{ background: '#F5F7FD', borderRadius: 0.5, px: 1 }}
          >
            <RemoveRedEyeOutlinedIcon sx={{ color: '#999', fontSize: 12 }} />
            <Typography
              variant='body2'
              sx={{ fontSize: 12, lineHeight: '20px' }}
            >
              {formatNumber(it.visit_count || 0)}
            </Typography>
          </Stack>
          <Stack
            direction='row'
            alignItems='center'
            gap={1}
            sx={{ background: '#F5F7FD', borderRadius: 0.5, px: 1 }}
          >
            <ThumbUpAltOutlinedIcon sx={{ color: '#999', fontSize: 12 }} />
            <Typography
              variant='body2'
              sx={{ fontSize: 12, lineHeight: '20px' }}
            >
              {formatNumber(it.like_count || 0)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      <Typography
        variant='body2'
        className='multiline-ellipsis'
        sx={{
          fontSize: 12,
          color: '#666',
          overflow: 'hidden',
          maxHeight: 54,
          fontWeight: 300,
          lineHeight: 1.6,
        }}
      >
        <MatchedString keywords={keywords} str={it.desc} />
      </Typography>

      <Stack direction='row' flexWrap='wrap' gap='8px 16px'>
        {data.topics?.map((topic: any) => (
          <TopicLink
            name={topic.name}
            key={topic.name}
            onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
              e.stopPropagation();
            }}
          />
        ))}
      </Stack>
      {data.images?.length > 0 && (
        <Stack direction='row' gap={2}>
          {data.images?.map((img: string) => (
            <AntdImage
              key={img}
              style={{
                objectFit: 'cover',
                border: '1px solid rgba(208,215,222, .3)',
              }}
              width={80}
              height={80}
              src={img}
              alt='产品关联图片'
              referrerPolicy='no-referrer'
            />
          ))}
        </Stack>
      )}
    </Card>
  );
};

export const ArticleCard = ({
  data,
  keywords,
  tag = true,
}: {
  data: any;
  keywords?: string;
  tag?: boolean;
}) => {
  const it = data;
  return (
    <Card key={it.id} href={`/blog/${it.id}`}>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        gap={1}
      >
        <Stack
          direction='row'
          alignItems='center'
          gap={1}
          sx={{ width: 'calc(100% - 160px)' }}
        >
          {tag && <Tag>文章</Tag>}
          <Title
            className='card-title text-ellipsis'
            sx={{ width: 'calc(100% - 60px)' }}
            href={`/blog/${it.id}`}
            target='_blank'
          >
            <MatchedString keywords={keywords} str={it.title}></MatchedString>
          </Title>
        </Stack>
        <Typography
          component={Link}
          href={`/s?keywords=${it.author}`}
          variant='body2'
          className='text-ellipsis'
          sx={{
            fontSize: 12,
            lineHeight: 1,
            color: '#666',
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          {it.author}
        </Typography>
      </Stack>
      <Typography
        variant='body2'
        className='multiline-ellipsis'
        sx={{
          fontSize: 12,
          color: '#666',
          fontWeight: 300,
          lineHeight: 1.6,
        }}
      >
        <MatchedString keywords={keywords} str={it.desc} />
      </Typography>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='flex-end'
      >
        <Stack
          direction='row'
          gap={2}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {data.images?.map((img: string) => (
            <AntdImage
              key={img}
              style={{
                objectFit: 'cover',
                borderRadius: '4px',
                border: '1px solid rgba(208,215,222, .3)',
              }}
              width={80}
              height={80}
              src={img}
              alt='文章关联图片'
              referrerPolicy='no-referrer'
            />
          ))}
        </Stack>

        <Stack direction='row' gap={3} sx={{ color: '#666' }}>
          <Stack direction='row' alignItems='center' gap={1}>
            <Typography variant='body2' sx={{ fontSize: 12, lineHeight: 1 }}>
              {formatNumber(it.visit_count || 0)}
              <Box component='span' sx={{ color: '#999' }}>
                人阅读
              </Box>
            </Typography>
          </Stack>
          <Stack direction='row' alignItems='center' gap={1}>
            <AccessTimeIcon
              sx={{
                fontSize: 12,
              }}
            />
            <Typography variant='body2' sx={{ fontSize: 12, lineHeight: 1 }}>
              {dayjs.unix(it.created_at!).format('YYYY-MM-DD')}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
      {data.topics?.length > 0 && (
        <Stack direction='row' gap='8px 16px' flexWrap='wrap'>
          {data.topics?.map((topic: any) => (
            <TopicLink key={topic.name} name={topic.name}>
              # {topic.name}
            </TopicLink>
          ))}
        </Stack>
      )}
    </Card>
  );
};

export const TopicCard = ({
  data,
  keywords,
}: {
  data: any;
  keywords: string;
}) => {
  const it = data;
  return (
    <Card key={it.id} href={`/topic/${it.name}`}>
      <Stack direction='row' justifyContent='space-between'>
        <Stack direction='row' gap={1.5} alignItems='center'>
          <Box
            sx={{
              overflow: 'hidden',
            }}
          >
            <Stack direction='row' alignItems='center' gap={1}>
              <Tag>领域</Tag>
              <Title
                href={`/topic/${it.name}`}
                className='card-title'
                target='_blank'
              >
                <MatchedString
                  keywords={keywords}
                  str={it.name}
                ></MatchedString>
              </Title>
            </Stack>
          </Box>
        </Stack>
        <Stack
          direction='row'
          gap={1}
          alignItems='flex-start'
          justifyContent='flex-end'
          sx={{ mt: '2px', flexShrink: 0, width: 100 }}
        >
          <Stack
            direction='row'
            alignItems='center'
            gap={1}
            sx={{ background: '#F5F7FD', borderRadius: 0.5, px: 1 }}
          >
            <RemoveRedEyeOutlinedIcon sx={{ color: '#999', fontSize: 12 }} />
            <Typography
              variant='body2'
              sx={{ fontSize: 12, lineHeight: '20px' }}
            >
              {formatNumber(it.visit_count || 0)}
            </Typography>
          </Stack>
          <Stack
            direction='row'
            alignItems='center'
            gap={1}
            sx={{ background: '#F5F7FD', borderRadius: 0.5, px: 1 }}
          >
            <ThumbUpAltOutlinedIcon sx={{ color: '#999', fontSize: 12 }} />
            <Typography
              variant='body2'
              sx={{ fontSize: 12, lineHeight: '20px' }}
            >
              {formatNumber(it.like_count || 0)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      <Typography
        variant='body2'
        className='multiline-ellipsis'
        sx={{
          fontSize: 12,
          color: '#666',
          overflow: 'hidden',
          maxHeight: 54,
          fontWeight: 300,
          lineHeight: 1.6,
        }}
      >
        <MatchedString keywords={keywords} str={it.desc} />
      </Typography>
    </Card>
  );
};

export const VendorCard = ({
  data,
  keywords,
  tag = true,
}: {
  data: any;
  keywords?: string;
  tag?: boolean;
}) => {
  const it = data;
  return (
    <Card key={it.id} href={`/vendors/${it.id}`}>
      <Stack direction='row' justifyContent='space-between'>
        <Stack direction='row' gap={1.5} alignItems='center'>
          <Box
            component='img'
            src={it.logo || it.vendor.logo}
            style={{
              flexShrink: 0,
              height: '40px',
              width: '40px',
              objectFit: 'contain',
              borderRadius: '50%',
            }}
            alt='厂商logo'
          />
          <Box
            sx={{
              overflow: 'hidden',
            }}
          >
            <Stack direction='row' alignItems='center' gap={1}>
              {tag && <Tag>厂商</Tag>}
              <Title
                className='card-title'
                href={`/vendors/${it.id}`}
                target='_blank'
              >
                <MatchedString
                  keywords={keywords}
                  str={it.name}
                ></MatchedString>
              </Title>
            </Stack>
          </Box>
        </Stack>
        <Stack
          direction='row'
          gap={1}
          alignItems='flex-start'
          justifyContent='flex-end'
          sx={{ mt: '2px', flexShrink: 0, width: 100 }}
        >
          <Stack
            direction='row'
            alignItems='center'
            gap={1}
            sx={{ background: '#F5F7FD', borderRadius: 0.5, px: 1 }}
          >
            <RemoveRedEyeOutlinedIcon sx={{ color: '#999', fontSize: 12 }} />
            <Typography
              variant='body2'
              sx={{ fontSize: 12, lineHeight: '20px' }}
            >
              {formatNumber(it.visit_count || 0)}
            </Typography>
          </Stack>
          <Stack
            direction='row'
            alignItems='center'
            gap={1}
            sx={{ background: '#F5F7FD', borderRadius: 0.5, px: 1 }}
          >
            <ThumbUpAltOutlinedIcon sx={{ color: '#999', fontSize: 12 }} />
            <Typography
              variant='body2'
              sx={{ fontSize: 12, lineHeight: '20px' }}
            >
              {formatNumber(it.like_count || 0)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      <Typography
        variant='body2'
        sx={{
          fontSize: 12,
          color: '#666',
          overflow: 'hidden',
          maxHeight: 54,
          fontWeight: 300,
          lineHeight: 1.6,
        }}
      >
        <MatchedString keywords={keywords} str={it.desc} />
      </Typography>
    </Card>
  );
};
