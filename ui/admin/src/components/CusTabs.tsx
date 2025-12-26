'use client';

import React, { useCallback, useMemo, useState, type FC } from 'react';

import { Paper, ToggleButton, ToggleButtonGroup, type SxProps } from '@mui/material';

interface ListItem {
  label: React.ReactNode;
  value: string | number;
  disabled?: boolean;
}

interface RadioButtonProps {
  list: ListItem[];
  defatValue?: ListItem['value'];
  onChange?(value: ListItem['value']): void;
  size?: 'small' | 'medium' | 'large';
  sx?: SxProps;

  // 希望父组件控制
  change?(value: ListItem['value']): void;
  value?: ListItem['value'];
}

const CusTabs: FC<RadioButtonProps> = ({
  list,
  defatValue,
  onChange,
  change,
  sx,
  value: v,
  size = 'small',
}) => {
  const [internalValue, setInternalValue] = useState<string | number>(defatValue || list[0].value);

  // 如果外部传入了 value，使用外部值；否则使用内部状态
  const value = v !== undefined ? v : internalValue;

  // 使用 useCallback 优化 handleChange 函数
  const handleChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newValue: string | number | null) => {
      if (newValue !== null && newValue !== value) {
        // 如果外部没有控制 value，更新内部状态
        if (v === undefined) {
          setInternalValue(newValue);
        }
        onChange?.(newValue);
      }
    },
    [onChange, value, v]
  );

  // 使用 useCallback 优化 change 处理函数
  const handleChangeWithChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newValue: string | number | null) => {
      if (newValue !== null) {
        change?.(newValue);
      }
    },
    [change]
  );

  // 使用 useMemo 优化样式对象
  const groupSx = useMemo(
    () => ({
      '& .MuiToggleButton-root': {
        border: 'none',
        borderRadius: '6px !important',
        px: 3,
        py: 0.5,
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'text.secondary',
        '&.Mui-selected': {
          bgcolor: 'primary.main',
          color: 'white',
          '&:hover': {
            bgcolor: 'primary.dark',
          },
        },
      },
      ...sx,
    }),
    [sx]
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 0.5,
        borderRadius: 2,
        width: 'fit-content',
        border: '1px solid',
        borderColor: 'divider',
        ...groupSx,
      }}
    >
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={change ? handleChangeWithChange : handleChange}
        aria-label="tabs"
        size={size}
      >
        {list.map(item => (
          <ToggleButton key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Paper>
  );
};

// 使用 React.memo 优化组件，避免不必要的重新渲染
export default React.memo(CusTabs);
