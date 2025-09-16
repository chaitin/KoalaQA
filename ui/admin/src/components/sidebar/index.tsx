import Qrcode from '@/assets/images/qrcode.png';
import { useAuthContext } from '@/hooks/context';
import { ModelUserRole } from '@/api/types';
import { Icon, Modal } from '@c-x/ui';
import { alpha, Box, Button, Stack, styled, useTheme } from '@mui/material';
import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface AdminMenuItem {
  label: string;
  value: string;
  pathname: string;
  icon: string;
  show: boolean;
  disabled: boolean;
  roles?: ModelUserRole[]; // 允许访问的角色列表
}

export const ADMIN_MENUS: AdminMenuItem[] = [
  // {
  //   label: '仪表盘',
  //   value: '/admin/dashboard',
  //   pathname: '/admin/dashboard',
  //   icon: 'icon-yibiaopan',
  //   show: true,
  //   disabled: false,
  //   roles: [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator],
  // },
  {
    label: 'AI 设置',
    value: '/admin/ai',
    pathname: '/admin/ai',
    icon: 'icon-duihuajilu1',
    show: true,
    disabled: false,
    roles: [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator], // 管理员和客服运营都可以访问
  },
  {
    label: '用户管理',
    value: '/admin/users',
    pathname: '/admin/users',
    icon: 'icon-zhanghao',
    show: true,
    disabled: false,
    roles: [ModelUserRole.UserRoleAdmin], // 仅管理员可以访问
  },
  {
    label: '通用设置',
    value: '/admin/settings',
    pathname: '/admin/settings',
    icon: 'icon-setting',
    show: true,
    disabled: false,
    roles: [ModelUserRole.UserRoleAdmin], // 仅管理员可以访问
  },
];

const SidebarButton = styled(Button)(({ theme }) => ({
  fontSize: 14,
  flexShrink: 0,
  fontWeight: 400,
  pr: 1.5,
  pl: 2,
  justifyContent: 'flex-start',
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
  '.MuiButton-startIcon': {
    mr: '3px',
  },
  '&:hover': {
    color: theme.palette.info.main,
  },
}));

const Sidebar = () => {
  const { pathname } = useLocation();
  const theme = useTheme();
  const [showQrcode, setShowQrcode] = useState(false);
  const [user] = useAuthContext();

  // 根据用户角色过滤菜单
  const visibleMenus = useMemo(() => {
    if (!user || !('role' in user)) return ADMIN_MENUS;

    return ADMIN_MENUS.filter(menu => {
      if (!menu.roles) return true; // 如果没有定义角色限制，则显示
      return menu.roles.includes(user.role as ModelUserRole);
    });
  }, [user]);

  return (
    <Stack
      sx={{
        width: 188,
        m: 2,
        zIndex: 999,
        p: 2,
        height: 'calc(100% - 32px)',
        bgcolor: '#FFFFFF',
        borderRadius: '10px',
      }}
    >
      <Stack
        direction={'row'}
        gap={1}
        alignItems={'center'}
        justifyContent="center"
        sx={{
          pb: 0,
          cursor: 'pointer',
          '&:hover': {
            color: 'info.main',
          },
        }}
        onClick={() => {
          setShowQrcode(false);
          window.location.href = '/';
        }}
      >
        <Icon type="icon-koala_flat" sx={{ fontSize: '30px' }}></Icon>
        <Box
          sx={{
            fontSize: '16px',
            fontWeight: 'bold',
            textAlign: 'center',
            '&:first-letter': {
              color: 'info.main',
            },
          }}
        >
          Koala QA
        </Box>
      </Stack>

      <Stack sx={{ pt: 2, flexGrow: 1 }} gap={1}>
        {visibleMenus.map(it => {
          let isActive = false;
          if (it.value === '/') {
            isActive = pathname === '/';
          } else {
            isActive = pathname.includes(it.value);
          }
          if (!it.show) return null;
          return (
            <NavLink
              key={it.pathname}
              to={it.value}
              style={{
                zIndex: isActive ? 2 : 1,
                color: isActive ? '#FFFFFF' : 'text.primary',
              }}
              onClick={e => {
                if (it.disabled) {
                  e.preventDefault();
                }
              }}
            >
              <Button
                variant={isActive ? 'contained' : 'text'}
                disabled={it.disabled}
                sx={{
                  width: '100%',
                  height: 50,
                  padding: '6px 16px',
                  justifyContent: 'flex-start',
                  color: isActive ? '#FFFFFF' : 'text.primary',
                  fontWeight: isActive ? '500' : '400',
                  boxShadow: isActive ? '0px 10px 25px 0px rgba(33,34,45,0.2)' : 'none',
                  ':hover': {
                    boxShadow: isActive ? '0px 10px 25px 0px rgba(33,34,45,0.2)' : 'none',
                  },
                }}
              >
                <Icon
                  type={it.icon}
                  sx={{
                    mr: 1,
                    fontSize: 14,
                    color: isActive ? '#FFFFFF' : alpha(theme.palette.text.primary, 0.2),
                  }}
                />
                {it.label}
              </Button>
            </NavLink>
          );
        })}
      </Stack>
      <Stack gap={1} sx={{ flexShrink: 0 }}>
        <SidebarButton
          variant="outlined"
          color="dark"
          onClick={() => window.open('https://koalaqa.docs.baizhi.cloud/welcome', '_blank')}
        >
          <Icon
            type="icon-bangzhuwendang1"
            sx={{
              mr: 1,
            }}
          />
          帮助文档
        </SidebarButton>
        <SidebarButton
          variant="outlined"
          color="dark"
          onClick={() => window.open('https://github.com/chaitin/KoalaQA', '_blank')}
        >
          <Icon
            type="icon-github"
            sx={{
              mr: 1,
            }}
          />
          GitHub
        </SidebarButton>
        <SidebarButton variant="outlined" color="dark" onClick={() => setShowQrcode(true)}>
          <Icon
            type="icon-group"
            sx={{
              mr: 1,
            }}
          />
          交流群
        </SidebarButton>
      </Stack>
      <Modal
        open={showQrcode}
        onCancel={() => setShowQrcode(false)}
        title="欢迎加入 KoalaQA 交流群"
        footer={null}
      >
        <Stack alignItems={'center'} justifyContent={'center'} sx={{ my: 2 }}>
          <Box component="img" src={Qrcode} sx={{ width: 300 }} />
        </Stack>
      </Modal>
    </Stack>
  );
};

export default Sidebar;
