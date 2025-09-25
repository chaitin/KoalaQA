import { postUserLogout } from '@/api';
import { message } from '@ctzhian/ui';
import LogoutIcon from '@mui/icons-material/Logout';
import { IconButton, Stack, Tooltip } from '@mui/material';
import Bread from './Bread';

const Header = () => {
  const onLogout = async () => {
    await postUserLogout();
    message.success('退出登录成功');
    if (process.env.NODE_ENV === 'development') {
      window.location.href = `${window.location.protocol}//${window.location.hostname}:3000/login`;
    } else {
      window.location.href = `${window.location.origin}/login`;
    }
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
        <Tooltip title="退出登录">
          <IconButton
            size="small"
            sx={{
              bgcolor: '#fff',
              color: 'primary.main',
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
