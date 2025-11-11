import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Autocomplete, TextField, Box, Typography, CircularProgress } from '@mui/material';
import { message } from '@ctzhian/ui';
import { getAdminDiscussion } from '@/api/Discussion';
import { ModelDiscussionListItem } from '@/api/types';

interface ArticleSelectorProps {
  value?: number[];
  onChange: (value: number[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  forumId?: number;
  maxSelection?: number;
  initialOptions?: ArticleOption[];
}

interface ArticleOption {
  id: number;
  title: string;
}

const ArticleSelector: React.FC<ArticleSelectorProps> = ({
  value = [],
  onChange,
  placeholder = '请选择公告内容',
  label = '选择公告内容',
  disabled = false,
  error = false,
  helperText,
  forumId,
  maxSelection = 3,
  initialOptions = [],
}) => {
  const pageSize = 10;
  const [options, setOptions] = useState<ArticleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [open, setOpen] = useState(false);
  const [optionCache, setOptionCache] = useState<Record<number, ArticleOption>>({});
  const isFetchingRef = useRef(false);

  const resetData = useCallback(() => {
    setOptions([]);
    setPage(0);
    setHasMore(true);
  }, []);

  const fetchArticles = useCallback(
    async (pageToFetch: number, keyword: string, append = false) => {
      if (!forumId || forumId <= 0 || pageToFetch <= 0 || isFetchingRef.current) {
        return;
      }

      setLoading(true);
      isFetchingRef.current = true;
      try {
        const list = await getAdminDiscussion({
          forum_id: forumId,
          keyword: keyword || undefined,
          page: pageToFetch,
          size: pageSize,
        });

        const items = list?.items || [];
        const articles: ArticleOption[] = items
          .filter((item: ModelDiscussionListItem) => item.type === 'blog')
          .map((item: ModelDiscussionListItem) => ({
            id: item.id || 0,
            title: item.title || '',
          }));

        setOptions(prev => {
          if (!append) {
            return articles;
          }
          const existingIds = new Set(prev.map(option => option.id));
          const merged = articles.filter(article => !existingIds.has(article.id));
          return [...prev, ...merged];
        });

        setOptionCache(prev => {
          const updated = { ...prev };
          articles.forEach(article => {
            updated[article.id] = article;
          });
          return updated;
        });

        setHasMore(articles.length === pageSize);
        setPage(pageToFetch);
      } catch (error) {
        console.error('获取文章列表失败:', error);
        if (!append) {
          setOptions([]);
        }
        setHasMore(false);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [forumId, pageSize]
  );

  useEffect(() => {
    resetData();
    setInputValue('');
    setSearchTerm('');
    setOpen(false);
    setOptionCache({});
  }, [forumId, resetData]);

  useEffect(() => {
    if (!initialOptions?.length) {
      return;
    }
    setOptionCache(prev => {
      const updated = { ...prev };
      let changed = false;
      initialOptions.forEach(option => {
        if (!option) {
          return;
        }
        const { id, title } = option;
        if (id == null) {
          return;
        }
        const normalized: ArticleOption = {
          id,
          title: title || '',
        };
        const cached = updated[id];
        if (!cached || cached.title !== normalized.title) {
          updated[id] = normalized;
          changed = true;
        }
      });
      return changed ? updated : prev;
    });

    setOptions(prev => {
      if (!prev.length) {
        return initialOptions.filter(option => option && option.id != null);
      }
      const existingIds = new Set(prev.map(option => option.id));
      const merged = [
        ...initialOptions.filter(option => option && !existingIds.has(option.id)),
        ...prev,
      ] as ArticleOption[];
      return merged.length === prev.length ? prev : merged;
    });
  }, [initialOptions]);

  useEffect(() => {
    if (!value?.length) {
      return;
    }
    setOptionCache(prev => {
      const updated = { ...prev };
      let changed = false;
      value.forEach(id => {
        if (!updated[id]) {
          updated[id] = { id, title: '' };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [value]);

  const selectedOptions = useMemo(() => {
    if (!value?.length) {
      return [];
    }
    return value
      .map(id => optionCache[id])
      .filter((option): option is ArticleOption => Boolean(option));
  }, [optionCache, value]);

  const handleChange = (event: any, newValue: ArticleOption[] | null) => {
    const selectedIds = (newValue || []).map(option => option.id);
    
    // 限制最多选择数量
    if (selectedIds.length > maxSelection) {
      message.warning(`最多只能选择 ${maxSelection} 个文章`);
      return; // 如果超过最大数量，不更新
    }
    
    if (newValue?.length) {
      setOptionCache(prev => {
        const updated = { ...prev };
        newValue.forEach(option => {
          updated[option.id] = option;
        });
        return updated;
      });
    }

    onChange(selectedIds);
  };

  const handleOpen = () => {
    if (!forumId || forumId <= 0) {
      return;
    }
    setOpen(true);
    if (page === 0) {
      const keyword = searchTerm.trim();
      fetchArticles(1, keyword, false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSearch = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim();
      setSearchTerm(trimmed);
      resetData();
      if (!open) {
        setOpen(true);
      }
      fetchArticles(1, trimmed, false);
    },
    [fetchArticles, open, resetData]
  );

  const handleInputChange = (
    _event: any,
    newInputValue: string,
    reason: string
  ) => {
    if (reason === 'input' || reason === 'clear') {
      setInputValue(newInputValue);
      return;
    }

    if (reason === 'reset') {
      const nativeEvent = _event?.nativeEvent as KeyboardEvent | undefined;
      if (nativeEvent?.type === 'keydown' && nativeEvent.key === 'Enter') {
        handleSearch(inputValue);
      }
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch(inputValue);
    }
  };

  const handleListboxScroll = (event: React.SyntheticEvent) => {
    if (loading || !hasMore) {
      return;
    }
    const target = event.currentTarget as HTMLUListElement;
    if (target.scrollHeight - target.scrollTop - target.clientHeight <= 4) {
      fetchArticles(page + 1, searchTerm, true);
    }
  };

  return (
    <Box>
      <Autocomplete
        open={open}
        multiple
        size="small"
        value={selectedOptions}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onOpen={handleOpen}
        onClose={handleClose}
        options={options}
        getOptionLabel={option => option.title}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={loading}
        disabled={disabled || !forumId}
        // filterOptions={(options) => options} // 禁用客户端过滤，使用服务端搜索
        renderInput={params => (
          <TextField
            {...params}
            label={label}
            placeholder={!forumId ? '请先保存版块后再选择公告内容' : placeholder}
            error={error}
            helperText={helperText || (!forumId ? '新建版块需要先保存后才能选择公告内容' : value.length > 0 ? `已选择 ${value.length}/${maxSelection} 个文章` : `最多可选择 ${maxSelection} 个文章`)}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            inputProps={{
              ...params.inputProps,
              onKeyDown: (
                event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
              ) => {
                const defaultOnKeyDown = params.inputProps.onKeyDown;
                if (defaultOnKeyDown) {
                  defaultOnKeyDown(event as React.KeyboardEvent<HTMLInputElement>);
                }
                handleKeyDown(event);
              },
            }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...optionProps } = props as typeof props & { key?: React.Key };
          return (
            <Box component="li" {...optionProps} key={key ?? option.id}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {option.title}
              </Typography>
            </Box>
          );
        }}
        ListboxProps={{
          onScroll: handleListboxScroll,
          style: { maxHeight: 260 },
        }}
        noOptionsText={
          loading
            ? '正在加载...'
            : !forumId
            ? '请先保存版块后再选择公告内容'
            : searchTerm
            ? '未找到相关文章'
            : '暂无文章数据'
        }
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

export default ArticleSelector;

