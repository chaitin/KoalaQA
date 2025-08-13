// import { postAdminLogout } from '@/api/Admin';
// import { postLogout } from '@/api/User';
import { message } from '@c-x/ui';
import LogoutIcon from '@mui/icons-material/Logout';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import Bread from './Bread';

const Header = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onLogout = async () => {
    if (pathname.startsWith('/user')) {
      // await postLogout();
    } else {
      // await postAdminLogout();
    }
    message.success('退出登录成功');
    navigate(pathname.startsWith('/user') ? '/login/user' : '/login/admin');
  };
  return (
    <Stack
      direction={'row'}
      alignItems={'center'}
      justifyContent={'space-between'}
      sx={{
        mt: 2,
        pr: 2,
        width: '100%',
      }}
    >
      <Bread />

      <Stack direction={'row'} alignItems={'center'} gap={2}>
        <Tooltip title='退出登录'>
          <IconButton
            size='small'
            sx={{
              bgcolor: '#fff',

              '&:hover': {
                color: 'primary.main',
              },
            }}
            onClick={onLogout}
          >
            <LogoutIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

export default Header;
