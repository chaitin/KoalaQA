import React, { useState, useEffect, useCallback } from 'react';
import { Autocomplete, TextField, Box, Typography, CircularProgress } from '@mui/material';
import { useGroupData } from '@/context/GroupDataContext';
import { eventManager, EVENTS } from '@/utils/eventManager';

interface CategorySelectorProps {
  value?: number[];
  onChange: (value: number[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

interface CategoryOption {
  id: number;
  name: string;
  groupName: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  value = [],
  onChange,
  placeholder = '请选择分类',
  label = '选择分类',
  disabled = false,
  error = false,
  helperText,
}) => {
  const { groups, loading, refresh } = useGroupData();
  const [options, setOptions] = useState<CategoryOption[]>([]);

  // 将 groups 数据转换为选项列表
  useEffect(() => {
    const categoryOptions: CategoryOption[] = [];
    groups.forEach(group => {
      categoryOptions.push({
        id: group.id || 0,
        name: group.name || '',
        groupName: group.name || '',
      });
    });
    setOptions(categoryOptions);
  }, [groups]);

  // 创建事件处理函数
  const handleCategoryUpdate = useCallback(() => {
    // 当分类更新时，刷新数据
    refresh();
  }, [refresh]);

  // 监听分类更新事件
  useEffect(() => {
    // 注册事件监听
    eventManager.on(EVENTS.CATEGORY_UPDATED, handleCategoryUpdate);

    // 清理事件监听
    return () => {
      eventManager.off(EVENTS.CATEGORY_UPDATED, handleCategoryUpdate);
    };
  }, [handleCategoryUpdate]);

  // 根据value找到对应的选项
  console.log(value)
  const selectedOptions = options.filter(option => (value || []).includes(option.id));

  const handleChange = (event: any, newValue: CategoryOption[] | null) => {
    const selectedIds = (newValue || []).map(option => option.id);
    onChange(selectedIds);
  };

  return (
    <Box>
      <Autocomplete
        multiple
        size='small'
        value={selectedOptions}
        onChange={handleChange}
        options={options}
        getOptionLabel={option => option.groupName}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={loading}
        disabled={disabled}
        renderInput={params => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {option.name}
            </Typography>
          </Box>
        )}
        noOptionsText="暂无分类数据"
        clearOnEscape
        selectOnFocus
        handleHomeEndKeys
        sx={{
          '& .MuiAutocomplete-inputRoot': {
            paddingRight: '14px !important',
          },
        }}
      />
    </Box>
  );
};

export default CategorySelector;
