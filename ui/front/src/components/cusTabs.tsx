'use client';

import React, { type FC, useState, useEffect } from 'react';

import { Tabs, Tab, type SxProps } from '@mui/material';

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
}) => {
  const [value, setValue] = useState<string | number>(
    v || defatValue || list[0].value
  );
  const handleChange = (
    _event: React.SyntheticEvent<Element, Event>,
    id: string | number
  ) => {
    if (id !== null) {
      setValue(id);
      onChange?.(id);
    }
  };

  useEffect(() => {
    if (v) setValue(v);
  }, [v]);

  return (
    <Tabs
      value={value}
      onChange={
        change
          ? (_event: React.SyntheticEvent<Element, Event>, value: string | number) =>
              change(value)
          : handleChange
      }
      sx={{
        display: 'inline-flex',
        p: '6px',
        border: '1px solid',
        borderColor: 'divider',
        minHeight: 36,
        height: 36,
        backgroundColor: 'background.paper',
        borderRadius: '8px',
        '& button .MuiTabs-indicator': {
          zIndex: -1,
        },
        '.MuiTabs-indicator': {
          top: 0,
          bottom: 0,
          height: 'auto',
          borderRadius: '4px',
        },
        ...sx,
      }}
    >
      {list.map((item) => (
        <Tab
          sx={{
            zIndex: 1,
            mt: '1px',
            p: '4px 12px',
            minHeight: 0,
            minWidth: 0,
            fontSize: '12px',
            transition: 'all 0.2s ease',
            '&.Mui-selected': {
              color: '#fff',
            },
            '&:not(.Mui-selected):hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              borderRadius: '4px',
            },
            '&:not(.Mui-selected):active': {
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
            },
          }}
          key={item.value}
          value={item.value}
          label={item.label}
          disabled={item.disabled}
        />
      ))}
    </Tabs>
  );
};

export default CusTabs;
