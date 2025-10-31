'use client';

import React, { useCallback, useEffect, useMemo, useState, type FC } from 'react';

import { Tab, Tabs, type SxProps } from '@mui/material';

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
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 使用 useCallback 优化 handleChange 函数
  const handleChange = useCallback((
    _event: React.SyntheticEvent<Element, Event>,
    id: string | number
  ) => {
    if (id !== null && id !== value) {
      setIsAnimating(true);
      setValue(id);
      
      // 使用 requestAnimationFrame 延迟回调执行，避免在动画过程中触发重新渲染
      requestAnimationFrame(() => {
        onChange?.(id);
      });
      
      // 动画完成后重置状态
      setTimeout(() => {
        setIsAnimating(false);
      }, 200); // 与CSS动画时长保持一致
    }
  }, [onChange, value]);

  useEffect(() => {
    if (v) setValue(v);
  }, [v]);

  // 使用 useMemo 优化样式对象
  const tabsSx = useMemo(() => ({
    display: 'inline-flex',
    p: '6px',
    border: '1px solid',
    borderColor: 'divider',
    minHeight: 36,
    height: 36,
    backgroundColor: 'background.paper',
    borderRadius: '8px',
    // 在动画期间优化性能
    ...(isAnimating && {
      contain: 'layout style paint',
    }),
    '& button .MuiTabs-indicator': {
      zIndex: -1,
    },
    '.MuiTabs-indicator': {
      top: 0,
      bottom: 0,
      height: 'auto',
      borderRadius: '4px',
      // 优化indicator动画性能
      transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      willChange: 'left, width',
      transform: 'translateZ(0)', // 启用GPU加速
    },
    ...sx,
  }), [sx, isAnimating]);

  // 使用 useMemo 优化 Tab 样式
  const tabSx = useMemo(() => ({
    zIndex: 1,
    mt: '1px',
    p: '4px 12px',
    minHeight: 0,
    minWidth: 0,
    fontSize: '12px',
    // 优化动画性能：只对特定属性使用过渡，并使用GPU加速
    transition: 'color 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'color, background-color, transform',
    '&.Mui-selected': {
      color: '#fff',
      transform: 'translateZ(0)', // 启用GPU加速
    },
    '&:not(.Mui-selected):hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
      borderRadius: '4px',
      transform: 'translateZ(0)', // 启用GPU加速
    },
    '&:not(.Mui-selected):active': {
      backgroundColor: 'rgba(0, 0, 0, 0.08)',
      transform: 'translateZ(0)', // 启用GPU加速
    },
  }), []);

  // 使用 useCallback 优化 change 处理函数
  const handleChangeWithChange = useCallback((
    _event: React.SyntheticEvent<Element, Event>,
    value: string | number
  ) => {
    // 使用 requestAnimationFrame 延迟回调执行，避免在动画过程中触发重新渲染
    requestAnimationFrame(() => {
      change?.(value);
    });
  }, [change]);

  return (
    <Tabs
      value={value}
      onChange={change ? handleChangeWithChange : handleChange}
      sx={tabsSx}
    >
      {list.map((item) => (
        <Tab
          sx={tabSx}
          key={item.value}
          value={item.value}
          label={item.label}
          disabled={item.disabled}
        />
      ))}
    </Tabs>
  );
};

// 使用 React.memo 优化组件，避免不必要的重新渲染
export default React.memo(CusTabs);
