import React from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';

export interface CustomLoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export const CustomLoadingButton: React.FC<CustomLoadingButtonProps> = ({
  loading = false,
  loadingText,
  children,
  disabled,
  startIcon,
  endIcon,
  ...props
}) => {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} /> : startIcon}
      endIcon={loading ? undefined : endIcon}
    >
      {loading && loadingText ? loadingText : children}
    </Button>
  );
};

export default CustomLoadingButton;
