import React from 'react';
import { Box, Stack, Typography, BoxProps } from '@mui/material';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils';

interface CardContentProps extends BoxProps {
  data: {
    id?: string;
    name?: string;
    logo?: string;
    subTitle?: string;
    desc?: string;
    visit_count?: number;
    like_count?: number;
    href?: string;
  };
}

export const CardContent: React.FC<CardContentProps> = ({ data, ...other }) => {
  return (
    <Box
      sx={{
        width: 364,
        p: 2,
        border: '1px solid #EEF1F5',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: '0px 4px 60px 0px rgba(0,28,85,0.04)',
          '.vendor-name': {
            color: 'primary.main',
          },
        },
      }}
      {...other}
    >
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='flex-start'
        gap={2}
      >
        <Stack
          direction='row'
          gap={2}
          sx={{ flexShrink: 0, width: 'calc(100% - 116px)' }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              objectFit: 'contain',
              borderRadius: '4px',
              flexShrink: 0,
            }}
            component='img'
            src={data.logo}
            alt='logo'
          />
          <Stack justifyContent='center'>
            <Link href={data.href!} style={{ textDecoration: 'none' }}>
              <Typography
                variant='h6'
                className='vendor-name'
                sx={{
                  width: 180,
                  fontSize: 14,
                  fontWeight: 600,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  color: '#000',
                }}
              >
                {data.name}
              </Typography>
            </Link>
            <Typography variant='body2' sx={{ color: '#999', fontSize: 12 }}>
              {data.subTitle}
            </Typography>
          </Stack>
        </Stack>
        <Stack
          direction='row'
          gap={3}
          alignItems='flex-start'
          justifyContent='flex-end'
          sx={{ mt: '2px', flexShrink: 0, width: 100 }}
        >
          <Stack direction='row' alignItems='center' gap={1}>
            <RemoveRedEyeOutlinedIcon sx={{ color: '#999', fontSize: 14 }} />
            <Typography variant='body2'>
              {formatNumber(data.visit_count || 0)}
            </Typography>
          </Stack>
          <Stack direction='row' alignItems='center' gap={1}>
            <ThumbUpAltOutlinedIcon
              sx={{
                cursor: 'pointer',
                color: false ? 'primary.main' : '#999',
                fontSize: 14,
              }}
            />
            <Typography variant='body2'>
              {formatNumber(data.like_count || 0)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      <Typography
        variant='body2'
        className='multiline-ellipsis'
        sx={{
          mt: 1.5,
          color: '#999',
          fontSize: 12,
        }}
      >
        {data.desc}
      </Typography>
    </Box>
  );
};

export const CardContentSmall: React.FC<CardContentProps> = ({
  data,
  ...other
}) => {
  return (
    <Box
      sx={{
        cursor: 'pointer',
        '&:hover': {
          '.content-title': {
            color: 'primary.main',
          },
        },
      }}
      {...other}
    >
      <Stack direction='row' gap={2}>
        {data.logo ? (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              p: 0.5,
              border: '1px solid #EEEEEE',
            }}
          >
            <Box
              sx={{
                width: 36,
                borderRadius: '50%',
                height: 36,
                objectFit: 'contain',
              }}
              component='img'
              src={data.logo}
              about='logo'
            />
          </Box>
        ) : null}

        <Stack
          justifyContent='center'
          gap={0.5}
          sx={{ width: 'calc(100% - 60px)' }}
        >
          <Typography
            variant='h6'
            sx={{ fontSize: 16, fontWeight: 600 }}
            className='content-title'
          >
            {data.name}
          </Typography>
          <Stack direction='row' flexWrap='wrap' gap={1}>
            <Typography
              variant='body2'
              className='text-ellipsis'
              sx={{ color: '#999', fontSize: 12 }}
            >
              {data.subTitle}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
      <Typography variant='body2' sx={{ mt: 1.5, color: '#999', fontSize: 12 }}>
        {data.desc}
      </Typography>
    </Box>
  );
};

export const CardContentVendor: React.FC<CardContentProps> = ({
  data,
  ...other
}) => {
  return (
    <Box
      sx={{
        width: 364,
        p: 2,
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: '#fff',
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: '0px 4px 60px 0px rgba(0,28,85,0.04)',
          '.vendor-name': {
            color: 'primary.main',
          },
        },
      }}
      {...other}
    >
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='flex-start'
        gap={2}
      >
        <Stack
          direction='row'
          gap={2}
          sx={{ flexShrink: 0, width: 'calc(100% - 116px)' }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              objectFit: 'contain',
              borderRadius: '4px',
              flexShrink: 0,
            }}
            component='img'
            src={data.logo}
            alt='logo'
          />
          <Stack justifyContent='center'>
            <Link href={data.href!} target='_blank' style={{ textDecoration: 'none' }}>
              <Typography
                className='vendor-name'
                variant='h6'
                sx={{
                  width: 180,
                  fontSize: 14,
                  fontWeight: 600,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  color: '#000',
                }}
              >
                {data.name}
              </Typography>
            </Link>
            <Typography variant='body2' sx={{ color: '#999', fontSize: 12 }}>
              {data.subTitle}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      <Typography
        variant='body2'
        sx={{
          mt: 1.5,
          color: '#999',
          fontSize: 12,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {data.desc}
      </Typography>
    </Box>
  );
};
