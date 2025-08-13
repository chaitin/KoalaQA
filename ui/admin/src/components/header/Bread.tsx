import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import { Box, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ADMIN_MENUS } from '../sidebar';
import { useAppDispatch, useAppSelector } from '@/store';

const ADMIN_BREADCRUMB_MAP: Record<string, { title: string; to: string }> =
  ADMIN_MENUS.reduce((prev, item) => {
    const key = item.pathname.split('/')[2];
    prev[key] = {
      title: item.label,
      to: item.value,
    };
    return prev;
  }, {} as Record<string, { title: string; to: string }>);

const USER_BREADCRUMB_MAP: Record<string, { title: string; to: string }> = {
  dashboard: { title: '仪表盘', to: '/dashboard' },
  chat: { title: '对话记录', to: '/chat' },
  completion: { title: '补全记录', to: '/user/completion' },
  codescan: { title: '代码安全', to: '/user/codescan' },
};
const Bread = () => {
  const { pathname } = useLocation();
  const { pageName } = useAppSelector((state) => state.breadcrumb);

  const breadcrumbs = useMemo(() => {
    const pathParts = pathname.split('/').filter(Boolean);

    const generatedCrumbs = pathParts
      .map((part) => {
        return pathname.startsWith('/admin/')
          ? ADMIN_BREADCRUMB_MAP[part]
          : USER_BREADCRUMB_MAP[part];
      })
      .filter(Boolean);

    return [
      {
        title: 'Koala QA',
        to: '/admin/ai'
      },
      ...generatedCrumbs,
      {
        title: pageName,
        to: 'custom',
      },
    ].filter((item) => Boolean(item.title));
  }, [pathname, pageName]);

  return (
    <Stack
      direction='row'
      alignItems='center'
      gap={1}
      component='nav'
      aria-label='breadcrumb'
      sx={{
        flexGrow: 1,
        fontSize: '14px',
      }}
    >
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        const crumbContent = (
          <Stack direction='row' alignItems='center' gap={1}>
            {index > 0 && (
              <KeyboardArrowRightRoundedIcon sx={{ fontSize: 14 }} />
            )}
            <Typography
              variant='body2'
              sx={{
                fontWeight: isLast ? 'bold' : 'normal',
              }}
            >
              {crumb.title}
            </Typography>
          </Stack>
        );

        if (isLast) {
          return (
            <Box key={index} sx={{ color: 'text.primary' }}>
              {crumbContent}
            </Box>
          );
        }

        if (crumb.to === 'custom') {
          return (
            <Box
              key={index}
              sx={{
                color: 'text.disabled',
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {crumbContent}
            </Box>
          );
        }

        return (
          <NavLink
            key={index}
            to={crumb.to}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Box
              sx={{
                color: 'text.disabled',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {crumbContent}
            </Box>
          </NavLink>
        );
      })}
    </Stack>
  );
};

export default Bread;
