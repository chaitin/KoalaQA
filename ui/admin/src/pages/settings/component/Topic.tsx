import Card from '@/components/card';
import DragBrand from '@/components/drag/DragBrand';
import { Box } from '@mui/material';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

const SortableGroup = () => {
  return (
    <Card>
      <Box
        sx={{
          width: 156,
          fontSize: 14,
          lineHeight: '32px',
          flexShrink: 0,
          my: 1,
        }}
      >
        分类管理
      </Box>
      <DragBrand />
    </Card>
  );
};

export default SortableGroup;
