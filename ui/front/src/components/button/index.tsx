import React, { useCallback } from 'react';
import { styled, SxProps, Box, Button as MButton } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import {
  primary,
  primaryHover,
  primaryClick,
  secondary,
  secondaryClick,
  secondaryHover,
  secondaryText,
  dangerHover,
  disabledText,
} from '@/asset/styles/colors';

type ButtonType =
  | 'primary'
  | 'secondary'
  | 'default'
  | 'text'
  | 'highlight'
  | 'cancel'
  | 'danger';
type ButtonSizeType = 'small' | 'medium' | 'large';

export interface ButtonProps {
  children: React.ReactNode;
  startIcon?: React.ReactElement;
  type?: ButtonType;
  size?: ButtonSizeType;
  sx?: SxProps;
  className?: string;
  fillHeight?: string;
  onClick?: () => void;
  disabled?: boolean;
  ref?: React.Ref<HTMLDivElement> | undefined;
  id?: string;
}

const ButtonStyle: { [key in ButtonType]: object } = {
  primary: {
    backgroundColor: primary,
    color: '#fff',
    '&:hover': {
      backgroundColor: primaryHover,
      transition: 'background-color 0.1s ease-in-out',
    },
    ':active': {
      backgroundColor: primaryClick,
      transition: 'background-color 0.1s ease-in-out',
    },
  },
  danger: {
    backgroundColor: '#fff',
    color: primary,
    '&:hover': {
      color: '#fff',
      background: dangerHover,
      transition: 'background-color 0.1s ease-in-out',
      boxShadow: '0px 10px 24px 0px rgba(255,31,31,0.22)',
    },
    ':active': {
      background: dangerHover,
      transition: 'background-color 0.1s ease-in-out',
    },
    '& > svg': '#fff',
  },
  secondary: {
    backgroundColor: secondary,
    color: primary,
    '&:hover': {
      backgroundColor: secondaryHover,
      transition: 'background-color 0.1s ease-in-out',
    },
    ':active': {
      backgroundColor: secondaryClick,
      transition: 'background-color 0.1s ease-in-out',
    },
  },
  default: {
    backgroundColor: '#fff',
    color: primary,
    '&:hover': {
      backgroundColor: secondaryHover,
      transition: 'background-color 0.1s ease-in-out',
    },
    ':active': {
      backgroundColor: secondaryClick,
      transition: 'background-color 0.1s ease-in-out',
    },
  },
  cancel: {
    backgroundColor: '#F7F7F7',
    color: secondaryText,
  },
  text: {
    backgroundColor: 'transparent',
    color: primary,
    '&:hover': {
      color: primaryHover,
      transition: 'color 0.1s ease-in-out',
    },
    ':active': {
      color: primaryClick,
      transition: 'color 0.1s ease-in-out',
    },
  },
  highlight: {
    background: 'linear-gradient(270deg, #11AF60 0%, #52C41A 100%)',
    boxShadow: '0px 10px 30px 0px rgba(82,196,26,0.2)',
    color: '#fff',
  },
};

const ButtonComponent = styled('div', {
  shouldForwardProp: (prop) => prop !== 'type' && prop !== 'disabled',
})<{ type?: ButtonType; size?: ButtonSizeType; disabled?: 'true' | 'false' }>(
  ({ type = 'default', disabled }) => ({
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.1s ease-in-out',
    inlineSize: 'fit-content',
    userSelect: 'none',
    minWidth: 112,
    padding: '0px 24px',
    lineHeight: '24px',
    borderRadius: '4px',
    fontSize: '16px',
    height: '36px',
    whiteSpace: 'nowrap',
    ...ButtonStyle[type],
    ...(disabled === 'true' && {
      color: disabledText,
      cursor: 'not-allowed',
      backgroundColor: '#eee',
      '&:hover': { color: disabledText, backgroundColor: '#eee' },
      '&:active': { color: disabledText, backgroundColor: '#eee' },
      '&>svg': {
        color: disabledText,
      },
    }),
  })
);

const Button: React.FC<ButtonProps> = (props) => {
  const {
    children,
    type,
    size,
    sx,
    className,
    onClick,
    startIcon,
    disabled,
    ref,
    id,
  } = props;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      if (!disabled) {
        onClick?.();
      }
    },
    [disabled, onClick]
  );

  return (
    <ButtonComponent
      id={id}
      ref={ref}
      className={className}
      type={type}
      size={size}
      disabled={disabled ? 'true' : 'false'}
      sx={sx}
      onClick={handleClick}
    >
      {startIcon}
      {children}
    </ButtonComponent>
  );
};

export interface LoadingButtonProps {
  disabled?: boolean;
  loading?: boolean;
  buttonStyle?: SxProps;
  loadingStyle?: SxProps;
  children?: React.ReactNode | string;
  onClick?: () => void;
}

export const LoadingButton: React.FC<LoadingButtonProps> = (props) => {
  const { disabled, loading, buttonStyle, loadingStyle, children, onClick } =
    props;
  return (
    <Box sx={{ position: 'relative' }}>
      <MButton
        variant='contained'
        sx={{ minWidth: 112, borderRadius: '4px', ...buttonStyle }}
        disabled={disabled || loading}
        onClick={onClick}
      >
        {children}
      </MButton>
      {loading && (
        <CircularProgress
          size={24}
          sx={{
            color: 'rgba(0,0,0,0.2)',
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: '-12px',
            marginLeft: '-12px',
            ...loadingStyle,
          }}
        />
      )}
    </Box>
  );
};

export default Button;
