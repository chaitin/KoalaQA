import { Box } from '@mui/material';
import React from 'react';

const layout = (props: { children: React.ReactNode }) => {
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: 700,
        height: '100vh',
        bgcolor: 'rgba(246, 247, 248, 0.5)',
      }}
    >
      {props.children}
    </Box>
  );
};

export default layout;
