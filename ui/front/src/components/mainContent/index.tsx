import { Tool, allTools } from '@/utils/tools';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import { Box, Button, Stack, SxProps, Theme, Typography } from '@mui/material';
import Link from 'next/link';
import React from 'react';
import { Content } from './style';

const MainContent: React.FC<{
  children: React.ReactElement<any>;
  sx?: SxProps<Theme>;
  fullScreen?: boolean;
}> = ({ children, sx, fullScreen = false }) => {
  const [tool] = React.useState<Tool | undefined>(allTools[0]);
  const handleFullScreen = () => {
    const fullscreenElement = document.getElementById(
      'fullscreen-element'
    ) as any;
    if (fullscreenElement?.requestFullscreen) {
      fullscreenElement.requestFullscreen();
    } else if (fullscreenElement?.mozRequestFullScreen) {
      // 兼容 Firefox
      fullscreenElement?.mozRequestFullScreen();
    } else if (fullscreenElement?.webkitRequestFullscreen) {
      // 兼容 Chrome, Safari 和 Opera
      fullscreenElement?.webkitRequestFullscreen();
    } else if (fullscreenElement?.msRequestFullscreen) {
      // 兼容 IE/Edge
      fullscreenElement?.msRequestFullscreen();
    }
  };
  return (
    <Stack
      sx={{
        px: '50px',
        py: 2,
        flex: 1,
        borderRadius: '8px',
        height: '100%',
        width: '100%',
        background: '#fff',
        boxShadow:
          '0px 0px 2px 0px rgba(145,158,171,0.2), 0px 12px 24px -4px rgba(145,158,171,0.12)',
        ...sx,
        '& #rectMask': {
          background: 'rgba(52, 90, 255, 1)',
          borderRadius: '4px',
        },
        '& .sm-btn': {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
        '& .nc-container .nc_scale .nc_ok, .nc-container .nc_scale .nc_bg': {
          background: 'rgba(52, 90, 255, .1)',
        },
        '& .sm-ico': { marginTop: '0!important', marginLeft: '0!important' },
        '& .sm-txt': {
          color: '#fff!important',
          zIndex: 1,
          display: 'inline-block',
          position: 'relative',
        },
        '& .sm-pop': {
          border: 'none!important',
          width: '0!important',
        },
      }}
    >
      <Stack direction='row' justifyContent='space-between'>
        <Box>
          <Typography
            variant='h1'
            sx={{
              mb: '0px',
              fontWeight: 600,
              // color: grayText,
              fontSize: '20px',
            }}
            gutterBottom
          >
            {tool?.label}
          </Typography>
        </Box>
        <Stack direction='row' sx={{ fontFamily: 'var(--font-mono)' }} gap={2}>
          <Link
            href='/console/workbench'
            className='custom-link'
            style={{ alignSelf: 'flex-end' }}
            onClick={(e) => {
              e.preventDefault();
              window.open('/console/workbench', '_self');
            }}
          >
            <Button
              variant='outlined'
              sx={{
                alignSelf: 'flex-end',
                width: '120px',
                height: '24px',
                border: '1px solid #345AFF',
                borderRadius: '16px',
              }}
            // startIcon={
            //   <Image width='14' alt='detect_btn_icon' src={exchange_icon} />
            // }
            >
              批量检测
            </Button>
          </Link>
          <Link
            href='/console/workbench'
            className='custom-link'
            style={{ alignSelf: 'flex-end' }}
            onClick={(e) => {
              e.preventDefault();
              window.open('/console/workbench', '_self');
            }}
          >
            <Button
              variant='outlined'
              sx={{
                alignSelf: 'flex-end',
                width: '120px',
                height: '24px',
                border: '1px solid #345AFF',
                borderRadius: '16px',
              }}
            // startIcon={
            //   <Image width='14' alt='detect_btn_icon' src={exchange_icon} />
            // }
            >
              自动化检测
            </Button>
          </Link>
        </Stack>
      </Stack>
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        sx={{ position: 'relative', width: '100%', alignSelf: 'stretch' }}
      >
        <Typography
          variant='caption'
          sx={{
            display: 'inline-block',
            maxWidth: '100%',
            px: 1,
            color: 'rgba(11,37,98,0.5)',
            background: 'rgba(11,37,98,0.04)',
            borderRadius: 1,
            lineHeight: '24px',
          }}
        >
          {tool?.subTitle}
        </Typography>
        {fullScreen ? (
          <Button
            size='small'
            onClick={handleFullScreen}
            sx={{
              borderRadius: '4px',
              height: '24px',
            }}
            variant='outlined'
            startIcon={<FullscreenIcon />}
          >
            全屏
          </Button>
        ) : null}
      </Stack>
      <Content
        id='fullscreen-element'
        sx={{ '::-webkit-scrollbar': { width: 0 } }}
      >
        {children}
      </Content>
    </Stack>
  );
};

export default MainContent;
