import React, { useState, useEffect, useCallback } from 'react';
import { Autocomplete, TextField, Box, Typography, CircularProgress } from '@mui/material';
import { getAdminGroup } from '@/api';
import { useRequest } from 'ahooks';
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
  const [options, setOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取分类数据
  const { run: fetchCategories } = useRequest(
    async () => {
      setLoading(true);
      try {
        const response = await getAdminGroup();
        const groups = response?.items || [];

        // 将分组和分组项展平为选项列表
        const categoryOptions: CategoryOption[] = [];
        groups.forEach(group => {
          categoryOptions.push({
            id: group.id || 0,
            name: group.name || '',
            groupName: group.name || '',
          });
        });

        setOptions(categoryOptions);
      } catch (error) {
        console.error('获取分类列表失败:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    {
      manual: true,
    }
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 创建事件处理函数
  const handleCategoryUpdate = useCallback(() => {
    // 当分类更新时，重新获取分类数据
    fetchCategories();
  }, [fetchCategories]);

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
