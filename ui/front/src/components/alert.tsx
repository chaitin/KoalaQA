'use client';
import React, { useState, useEffect } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps, AlertColor } from '@mui/material/Alert';
import { createRoot } from 'react-dom/client';
import { useTheme } from '@mui/material/styles';

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant='filled' {...props} />;
  }
);

export interface WarningProps {
  content: string;
  color: AlertColor;
}

function WarningBar(props: WarningProps) {
  const theme = useTheme();
  const [open, setOpen] = useState<boolean>(true);

  useEffect(() => {
    setTimeout(() => {
      setOpen(false);
    }, 2000);
  }, []);
  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      open={open}
      //   onClose={() => setOpen(false)}
      key={'top-center-warning'}
      sx={{ zIndex: theme.zIndex.snackbar + 100 }}
    >
      <Alert icon={false} color={props?.color}>
        {props?.content ?? ''}
      </Alert>
    </Snackbar>
  );
}

export function callAlert(props: WarningProps, time = 3000) {
  // 检查是否在浏览器环境中
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('callAlert called in SSR environment, skipping...');
    return;
  }

  const warningDom = document.createElement('div');
  document.body.appendChild(warningDom);
  warningDom.id = 'warning-window';
  warningDom.style.zIndex = '-2';
  const warningRoot = createRoot(warningDom);
  warningRoot.render(<WarningBar {...props} />);
  setTimeout(() => {
    warningDom.remove();
  }, time);
}

const alertActions = {
  success: (content: string, time?: number) =>
    callAlert({ color: 'success', content }, time),
  warning: (content: string, time?: number) =>
    callAlert({ color: 'warning', content }, time),
  error: (content: string, time?: number) =>
    callAlert({ color: 'error', content }, time),
};

export default alertActions;
