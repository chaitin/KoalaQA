import Logo from '@/assets/images/logo.png';
import { Avatar as MuiAvatar, type SxProps } from '@mui/material';
import { type ReactNode } from 'react';

interface AvatarProps {
  src?: string;
  className?: string;
  sx?: SxProps;
  errorIcon?: ReactNode;
  errorImg?: ReactNode;
  name?: string;
}

function stringToColor(string: string) {
  let hash = 0;
  let i;

  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }

  return color;
}

function stringAvatar(name: string) {
  return {
    sx: {
      bgcolor: stringToColor(name),
    },
    children: `${name.split(' ')[0][0]}`,
  };
}

const Avatar = (props: AvatarProps) => {
  const src = props.src;
  const avatarObj = props.name ? stringAvatar(props.name) : undefined;
  return (
    <MuiAvatar
      sx={props.name ? { ...avatarObj!.sx, ...props.sx } : props.sx}
      {...(props.name
        ? { children: avatarObj!.children }
        : { children: <img src={Logo} alt='logo' /> })}
      src={src}
    />
  );
};

export default Avatar;
