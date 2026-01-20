import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { useForumStore } from '@/store';
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Autocomplete,
  Menu,
  MenuItem,
  alpha,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
} from '@mui/material';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { message, Modal } from '@ctzhian/ui';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Card from '@/components/card';
import LoadingButton from '@/components/LoadingButton';
import CategorySelector from '@/components/CategorySelector';
import ArticleSelector from '@/components/ArticleSelector';
import { putAdminForum } from '@/api/Forum';
import { ModelForumInfo, ModelForumGroups, ModelDiscussionType, SvcForumBlog } from '@/api/types';
import type { TagOption } from '@/store/forumStore';

import type { ForumItem } from '@/store/slices/forum';

interface ForumLink {
  name: string;
  address: string;
}

interface ForumLinks {
  enabled: boolean;
  links: ForumLink[];
}

interface BlockOriginalState {
  tag_ids: number[];
  blog_ids: number[];
  tag_enabled: boolean;
  links: ForumLinks;
}

interface ForumFormData {
  blocks: (ModelForumInfo & {
    qa_group_ids?: number[];
    issue_group_ids?: number[];
    feedback_group_ids?: number[];
    blog_group_ids?: number[];
    blog_ids?: number[];
    blogs?: SvcForumBlog[];
    tag_ids?: number[];
    tag_enabled?: boolean;
    links?: ForumLinks;
  })[];
}

const commonFieldSx = {
  '& .MuiInputLabel-root': { color: 'text.secondary' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#F8F9FA',
    '& fieldset': { borderColor: 'transparent' },
    '&:hover fieldset': { borderColor: 'transparent' },
    '&.Mui-focused fieldset': { borderColor: 'transparent' },
  },
  '& .MuiInputBase-input': { fontSize: 14 },
  '& .MuiInputBase-input::placeholder': { fontSize: 12 },
  '& .MuiFormHelperText-root': { marginLeft: 0 },
};

// 可拖拽的版块项组件
interface SortableBlockItemProps {
  index: number;
  control: any;
  getValues: () => ForumFormData;
  onRemove: () => void;
  onEdit: () => void;
  onEditCategories: () => void;
  onEditLinks: () => void;
  onSave: () => void;
  forumId?: number;
  isSaving?: boolean;
  originalState?: BlockOriginalState;
}

const SortableBlockItem: React.FC<SortableBlockItemProps> = ({
  index,
  control,
  getValues,
  onRemove,
  onEdit,
  onEditCategories,
  onEditLinks,
  onSave,
  forumId,
  isSaving = false,
  originalState,
}) => {

  const blogOptions = useWatch({
    control,
    name: `blocks.${index}.blogs`,
  }) as SvcForumBlog[] | undefined;

  const blockName = useWatch({
    control,
    name: `blocks.${index}.name`,
  });

  const blockRouteName = useWatch({
    control,
    name: `blocks.${index}.route_name`,
  });

  // 监听当前的标签和公告值
  const currentTagIds = useWatch({
    control,
    name: `blocks.${index}.tag_ids`,
    defaultValue: [],
  }) as number[];

  const currentBlogIds = useWatch({
    control,
    name: `blocks.${index}.blog_ids`,
    defaultValue: [],
  }) as number[];

  const tagEnabled = useWatch({
    control,
    name: `blocks.${index}.tag_enabled`,
    defaultValue: false,
  }) as boolean;

  const linksEnabled = useWatch({
    control,
    name: `blocks.${index}.links.enabled`,
    defaultValue: false,
  }) as boolean;

  // 比较数组是否相同（排序后比较）
  const arraysEqual = (a: number[], b: number[]) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort((x, y) => x - y);
    const sortedB = [...b].sort((x, y) => x - y);
    return sortedA.every((val, idx) => val === sortedB[idx]);
  };

  // 比较链接是否相同
  const linksEqual = (a: ForumLinks, b: ForumLinks) => {
    if (a.enabled !== b.enabled) return false;
    if (a.links.length !== b.links.length) return false;
    return a.links.every((linkA, idx) => {
      const linkB = b.links[idx];
      return linkA.name === linkB.name && linkA.address === linkB.address;
    });
  };

  // 检查是否有未保存的更改
  const hasUnsavedChanges = useMemo(() => {
    if (!originalState) return false;

    const tagIdsChanged = !arraysEqual(currentTagIds || [], originalState.tag_ids);
    const blogIdsChanged = !arraysEqual(currentBlogIds || [], originalState.blog_ids);
    const tagEnabledChanged = tagEnabled !== originalState.tag_enabled;

    // 使用 getValues 获取最新的链接值，避免 useWatch 的时序问题
    const linksChanged = linksEnabled !== originalState.links.enabled;

    return tagIdsChanged || blogIdsChanged || tagEnabledChanged || linksChanged;
  }, [
    currentTagIds,
    currentBlogIds,
    tagEnabled,
    originalState,
    getValues,
    index,
    linksEnabled,
  ]);

  // 从 store 获取标签
  const tags = useForumStore(state => state.tags);
  const fetchTagsForForums = useForumStore(state => state.fetchTagsForForums);
  const tagOptions = forumId && forumId > 0 ? tags[forumId] || [] : [];
  // 标签输入框内容（用于在选择后清空输入）
  const [tagInputValue, setTagInputValue] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  // 用于跟踪是否已经请求过标签，避免重复请求
  const requestedTagsRef = React.useRef<Set<number>>(new Set());

  React.useEffect(() => {
    if (forumId && forumId > 0) {
      // 如果标签已经存在（包括空数组），则不再请求
      const hasTags = tags[forumId] !== undefined;
      // 如果已经请求过，也不再请求（避免与 refreshForums 的批量请求冲突）
      const hasRequested = requestedTagsRef.current.has(forumId);

      if (!hasTags && !hasRequested) {
        requestedTagsRef.current.add(forumId);
        fetchTagsForForums([forumId]);
      } else if (hasTags) {
        // 如果标签已经存在，清除请求标记（允许后续重新请求，比如标签被清空后）
        requestedTagsRef.current.delete(forumId);
      }
    }
    // 注意：不将 fetchTagsForForums 作为依赖，因为它是稳定的 zustand 函数
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forumId, tags]);

  React.useEffect(() => {
    // 切换版块/新建版块时，避免残留上一次输入
    setTagInputValue('');
  }, [forumId]);

  const { isDragging, attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `block-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleEditClick = () => {
    handleMenuClose();
    onEdit();
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    onRemove();
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        opacity: isDragging ? 0.5 : 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
        mb: 2,
        backgroundColor: 'background.paper',
      }}
    >
      <Stack spacing={2}>
        {/* 版块名称和操作按钮 */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            size="small"
            sx={{
              cursor: 'grab',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
              flexShrink: 0,
            }}
            {...attributes}
            {...listeners}
          >
            <DragIndicatorIcon />
          </IconButton>

          {/* 只读显示板块名称和路由 */}
          <Typography
            variant="subtitle2"
            sx={{
              flex: 1,
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <span>{blockName || '未命名板块'}</span>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {' '}
              /{' '}
            </Box>
            <Box
              component="span"
              sx={{
                color: theme =>
                  theme.palette.mode === 'light'
                    ? theme.palette.grey[400]
                    : theme.palette.grey[500],
              }}
            >
              {blockRouteName || '未设置路由'}
            </Box>
          </Typography>

          {/* 更多菜单 */}
          <IconButton size="small" onClick={handleMenuOpen} sx={{ flexShrink: 0 }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={handleEditClick}>编辑</MenuItem>
            <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
              删除
            </MenuItem>
          </Menu>
        </Stack>

        {/* 帖子分类 - 改为按钮 */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="body2" sx={{ minWidth: 80, fontSize: 14 }}>
            帖子分类
          </Typography>
          <Button variant="outlined" size="small" onClick={onEditCategories}>
            编辑分类
          </Button>
        </Stack>

        {/* 公告内容选择 */}
        <Stack direction="row" alignItems="flex-start" spacing={2}>
          <Typography variant="body2" sx={{ minWidth: 80, fontSize: 14, pt: 1 }}>
            公告
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Controller
              control={control}
              name={`blocks.${index}.blog_ids`}
              render={({ field }) => (
                <ArticleSelector
                  value={field.value || []}
                  onChange={articleIds => {
                    field.onChange(articleIds);
                  }}
                  placeholder={(field.value || []).length > 0 ? '' : '选择公告 (最多3个)'}
                  forumId={forumId}
                  maxSelection={3}
                  textFieldSx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#F8F9FA',
                      borderRadius: '10px',
                      '& fieldset': {
                        borderStyle: 'solid',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      display: 'none',
                    },
                  }}
                  initialOptions={(blogOptions || [])
                    .filter(blog => blog?.id != null)
                    .map(blog => ({
                      id: blog.id || 0,
                      title: blog.title || '',
                    }))}
                />
              )}
            />
          </Box>
        </Stack>

        {/* 标签选择 */}
        <Stack direction="row" alignItems="flex-start" spacing={2}>
          <Typography variant="body2" sx={{ minWidth: 80, fontSize: 14, pt: 1 }}>
            标签
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Controller
              control={control}
              name={`blocks.${index}.tag_enabled`}
              defaultValue={false}
              render={({ field }) => (
                <FormControl>
                  <RadioGroup
                    row
                    value={field.value ? 'enabled' : 'disabled'}
                    onChange={e => field.onChange(e.target.value === 'enabled')}
                  >
                    <FormControlLabel
                      value="disabled"
                      control={<Radio size="small" />}
                      label="禁用"
                    />
                    <FormControlLabel
                      value="enabled"
                      control={<Radio size="small" />}
                      label="启用"
                    />
                  </RadioGroup>
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name={`blocks.${index}.tag_ids`}
              render={({ field }) => {
                if (!tagEnabled) {
                  return null;
                }

                // 确保即使标签数据未加载完成，也能正确显示已选中的标签
                // 使用 field.value 中的 ID 来匹配，如果 tagOptions 中还没有，先创建一个临时对象
                const tagIds: number[] = field.value || [];
                const selectedTags: TagOption[] = tagIds
                  .map((id: number) => {
                    const found = tagOptions.find((tag: TagOption) => (tag.id || 0) === id);
                    if (found) return found;
                    // 如果标签数据还没加载，创建一个临时对象（会在数据加载后自动更新）
                    return { id, name: `加载中...`, count: undefined } as TagOption;
                  })
                  .filter((tag): tag is TagOption => tag !== null && tag !== undefined);

                return (
                  <Autocomplete
                    multiple
                    size="small"
                    value={selectedTags}
                    inputValue={tagInputValue}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === 'reset') return;
                      setTagInputValue(newInputValue);
                    }}
                    onChange={(event, newValue) => {
                      const selectedIds = (newValue || []).map(tag => tag.id || 0);
                      field.onChange(selectedIds);
                    }}
                    options={tagOptions}
                    getOptionLabel={option => option.name || ''}
                    isOptionEqualToValue={(option, value) => (option.id || 0) === (value.id || 0)}
                    disabled={!forumId || forumId <= 0}
                    renderTags={(value, getTagProps) =>
                      value.map((option, idx) => {
                        const { key, ...tagProps } = getTagProps({ index: idx });
                        return (
                          <Box
                            key={key ?? option.id}
                            {...tagProps}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              backgroundColor: '#FFFFFF',
                              borderRadius: '16px',
                              padding: '2px 8px',
                              fontSize: '12px',
                              color: '#333333',
                              cursor: 'pointer',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontSize: '12px', lineHeight: 'normal' }}
                            >
                              {option.name}
                            </Typography>
                            {option.count !== undefined && option.count !== null && (
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: '11px',
                                  lineHeight: 'normal',
                                  color: 'text.secondary',
                                  ml: 0.5,
                                }}
                              >
                                ({option.count})
                              </Typography>
                            )}
                          </Box>
                        );
                      })
                    }
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.id}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                          }}
                        >
                          <Typography variant="body2">{option.name || ''}</Typography>
                          {option.count !== undefined && option.count !== null && (
                            <Typography
                              variant="body2"
                              sx={{ fontSize: '12px', color: 'text.secondary', ml: 1 }}
                            >
                              {option.count}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                    renderInput={params => (
                      <TextField
                        {...params}
                        placeholder={
                          selectedTags.length > 0
                            ? ''
                            : forumId && forumId > 0
                              ? '选择标签'
                              : '新增板块暂不支持选择标签'
                        }
                        error={false}
                        sx={{
                          mt: 1,
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#F8F9FA',
                            borderRadius: '10px',
                            '& fieldset': {
                              borderStyle: 'solid',
                            },
                          },
                        }}
                      />
                    )}
                  />
                );
              }}
            />
          </Box>
        </Stack>

        {/* 常用链接 */}
        <Stack direction="row" alignItems="flex-start" spacing={2}>
          <Typography variant="body2" sx={{ minWidth: 80, fontSize: 14, pt: 1 }}>
            常用链接
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Controller
              control={control}
              name={`blocks.${index}.links.enabled`}
              defaultValue={false}
              render={({ field }) => (
                <FormControl>
                  <RadioGroup
                    row
                    value={field.value ? 'enabled' : 'disabled'}
                    onChange={e => field.onChange(e.target.value === 'enabled')}
                  >
                    <FormControlLabel
                      value="disabled"
                      control={<Radio size="small" />}
                      label="禁用"
                    />
                    <FormControlLabel
                      value="enabled"
                      control={<Radio size="small" />}
                      label="启用"
                    />
                  </RadioGroup>
                </FormControl>
              )}
            />
            {linksEnabled && (<Box sx={{ minHeight: linksEnabled ? 'auto' : 32 }}>
              <Stack direction="row" alignItems="flex-start" sx={{ mt: 1, }}>
                <Button variant="outlined" size="small" onClick={onEditLinks}>
                  编辑常用链接
                </Button>
              </Stack>
            </Box>
            )}
          </Box>
        </Stack>

        {/* 保存按钮 */}
        {forumId && forumId > 0 && hasUnsavedChanges && (
          <Stack direction="row" justifyContent="flex-end">
            <LoadingButton variant="contained" size="small" loading={isSaving} onClick={onSave}>
              保存
            </LoadingButton>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

// 可拖拽的链接项组件
interface SortableLinkItemProps {
  index: number;
  control: any;
  onRemove: () => void;
}

const SortableLinkItem: React.FC<SortableLinkItemProps> = ({ index, control, onRemove }) => {
  const { isDragging, attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `link-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        opacity: isDragging ? 0.5 : 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
        backgroundColor: 'background.paper',
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            size="small"
            sx={{
              cursor: 'grab',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
              flexShrink: 0,
            }}
            {...attributes}
            {...listeners}
          >
            <DragIndicatorIcon />
          </IconButton>
          <Controller
            control={control}
            name={`links.${index}.name`}
            render={({ field: nameField }) => (
              <TextField
                {...nameField}
                fullWidth
                size="small"
                placeholder="链接名称"
                sx={commonFieldSx}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      size="small"
                      onClick={onRemove}
                      sx={{ mr: -1 }}
                    >
                      <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>
                        ×
                      </Box>
                    </IconButton>
                  ),
                }}
              />
            )}
          />
        </Stack>
        <Controller
          control={control}
          name={`links.${index}.address`}
          render={({ field: addressField }) => (
            <TextField
              {...addressField}
              fullWidth
              size="small"
              placeholder="链接地址"
              sx={commonFieldSx}
            />
          )}
        />
      </Stack>
    </Box>
  );
};

const Forum: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<number | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categoryBlockIndex, setCategoryBlockIndex] = useState<number | null>(null);
  const [showLinksDialog, setShowLinksDialog] = useState(false);
  const [linksBlockIndex, setLinksBlockIndex] = useState<number | null>(null);
  const [savingBlockIndex, setSavingBlockIndex] = useState<number | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // 存储每个板块的原始状态，用于检测未保存的更改
  const [blockOriginalStates, setBlockOriginalStates] = useState<Map<number, BlockOriginalState>>(new Map());
  const { refreshForums } = useForumStore();
  const hasInitializedRef = React.useRef(false);

  // 从 store 获取板块数据
  const { forums: storeForums, loading: storeLoading } = useForumStore();

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const { control, reset, getValues } = useForm<ForumFormData>({
    defaultValues: {
      blocks: [],
    },
    mode: 'onChange',
  });

  // 用于新增/编辑板块的独立表单
  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
  } = useForm<{ name: string; route_name: string }>({
    defaultValues: {
      name: '',
      route_name: '',
    },
  });

  // 用于分类编辑的独立表单
  const {
    control: categoryControl,
    handleSubmit: handleCategorySubmitForm,
    reset: resetCategoryForm,
  } = useForm<{
    qa_group_ids: number[];
    issue_group_ids: number[];
    blog_group_ids: number[];
  }>({
    defaultValues: {
      qa_group_ids: [],
      issue_group_ids: [],
      blog_group_ids: [],
    },
  });

  // 用于常用链接编辑的独立表单
  const {
    control: linksControl,
    handleSubmit: handleLinksSubmitForm,
    reset: resetLinksForm,
  } = useForm<{
    links: ForumLink[];
  }>({
    defaultValues: {
      links: [],
    },
  });

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
    move: moveLink,
  } = useFieldArray({
    control: linksControl,
    name: 'links',
  });

  const {
    fields: blockFields,
    append: appendBlock,
    remove: removeBlock,
    move: moveBlock,
    update: updateBlock,
  } = useFieldArray({
    control,
    name: 'blocks',
    keyName: 'fieldKey',
  });

  // 将 store 中的论坛数据转换为表单格式
  const convertForumsToBlocks = useCallback((forums: ForumItem[]) => {
    return forums.map(block => {
      const groupsArray = Array.isArray(block.groups) ? block.groups : [];

      const qaGroups = groupsArray.find(g => g.type === ModelDiscussionType.DiscussionTypeQA);
      const feedbackGroups = groupsArray.find(
        g => g.type === ModelDiscussionType.DiscussionTypeFeedback
      );
      const issueGroups = groupsArray.find(g => g.type === ModelDiscussionType.DiscussionTypeIssue);
      const blogGroups = groupsArray.find(g => g.type === ModelDiscussionType.DiscussionTypeBlog);

      // 解析 links 数据
      let linksData: ForumLinks = { enabled: false, links: [] };
      if (block.links) {
        if (typeof block.links === 'object' && 'enabled' in block.links) {
          linksData = {
            enabled: (block.links as any).enabled || false,
            links: (block.links as any).links || [],
          };
        }
      }

      return {
        ...block,
        qa_group_ids: qaGroups?.group_ids || [],
        issue_group_ids: issueGroups?.group_ids || [],
        feedback_group_ids: feedbackGroups?.group_ids || [],
        blog_group_ids: blogGroups?.group_ids || [],
        blog_ids: block.blog_ids || [],
        blogs: block.blogs || [],
        tag_ids: (block as any).tag_ids || [],
        tag_enabled: (block as any).tag_enabled || false,
        links: linksData,
      };
    });
  }, []);

  // 设置或更新原始状态
  const updateBlockOriginalStates = useCallback((blocks: ForumFormData['blocks']) => {
    const newOriginalStates = new Map<number, BlockOriginalState>();
    blocks.forEach((block, index) => {
      if (block.id) {
        newOriginalStates.set(block.id, {
          tag_ids: block.tag_ids || [],
          blog_ids: block.blog_ids || [],
          tag_enabled: block.tag_enabled ?? false,
          links: block.links || { enabled: false, links: [] },
        });
      }
    });
    setBlockOriginalStates(newOriginalStates);
  }, []);

  // 统一的数据加载和更新逻辑
  useEffect(() => {
    // 如果正在加载中，不处理
    if (storeLoading) {
      return;
    }

    // 如果没有数据，尝试刷新
    if (storeForums.length === 0 && !hasInitializedRef.current) {
      refreshForums();
      return;
    }

    // 如果有数据且还未初始化，进行初始化
    if (storeForums.length > 0 && !hasInitializedRef.current) {
      const blocks = convertForumsToBlocks(storeForums);
      reset({ blocks }, { keepDefaultValues: false });
      updateBlockOriginalStates(blocks);
      setIsInitialLoading(false);
      hasInitializedRef.current = true;
      return;
    }

    // 如果已经初始化，且数据有变化，更新表单（比如保存后刷新）
    if (hasInitializedRef.current && storeForums.length > 0) {
      const blocks = convertForumsToBlocks(storeForums);
      const currentBlocks = getValues('blocks');

      // 简单比较：如果数量不同或 ID 序列不同，则更新
      const shouldUpdate =
        blocks.length !== currentBlocks.length ||
        blocks.some((block, idx) => {
          const current = currentBlocks[idx];
          return !current || block.id !== current.id;
        });

      if (shouldUpdate) {
        reset({ blocks }, { keepDefaultValues: false });
        updateBlockOriginalStates(blocks);
      }
    }
  }, [storeForums, storeLoading, reset, convertForumsToBlocks, getValues, refreshForums, updateBlockOriginalStates]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // 保存所有板块
  const handleSaveAll = useCallback(async () => {
    try {
      const data = getValues();
      if (data.blocks.length === 0) {
        message.error('请至少创建一个版块');
        return;
      }

      const forums = data.blocks.map((block, index) => {
        const groups: ModelForumGroups[] = [];

        if (block.qa_group_ids && block.qa_group_ids.length > 0) {
          groups.push({
            type: ModelDiscussionType.DiscussionTypeQA,
            group_ids: block.qa_group_ids,
          });
        }
        if (block.issue_group_ids && block.issue_group_ids.length > 0) {
          groups.push({
            type: ModelDiscussionType.DiscussionTypeIssue,
            group_ids: block.issue_group_ids,
          });
        }
        if (block.blog_group_ids && block.blog_group_ids.length > 0) {
          groups.push({
            type: ModelDiscussionType.DiscussionTypeBlog,
            group_ids: block.blog_group_ids,
          });
        }

        // 直接从表单读取 links.enabled 的值，确保获取最新值
        const linksEnabled = getValues(`blocks.${index}.links.enabled`) ?? false;
        const linksList = block.links?.links ?? [];

        return {
          id: block.id,
          name: block.name?.trim() || '',
          route_name: block.route_name?.trim() || '',
          index: index + 1,
          groups: groups.length > 0 ? groups : undefined,
          tag_ids: block.tag_ids && block.tag_ids.length > 0 ? block.tag_ids : undefined,
          tag_enabled: block.tag_enabled ?? false,
          blog_ids: block.blog_ids && block.blog_ids.length > 0 ? block.blog_ids : undefined,
          links: {
            enabled: linksEnabled,
            links: linksList,
          },
        };
      });

      await putAdminForum({ forums });
      await refreshForums();
    } catch (error) {
      console.error('保存失败:', error);
      throw error;
    }
  }, [getValues, refreshForums]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = blockFields.findIndex((_, index) => `block-${index}` === active.id);
        const newIndex = blockFields.findIndex((_, index) => `block-${index}` === over!.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          moveBlock(oldIndex, newIndex);
          // 拖拽后需要保存所有板块
          await handleSaveAll();
        }
      }
      setActiveId(null);
    },
    [blockFields, moveBlock, handleSaveAll]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleAddBlock = () => {
    if (blockFields.length >= 3) {
      message.error('最多只能创建3个版块');
      return;
    }
    resetEditForm({
      name: '',
      route_name: '',
    });
    setShowAddDialog(true);
  };

  const handleAddBlockSubmit = handleEditSubmit(async data => {
    // 检查路由名称是否重复
    const currentBlocks = getValues('blocks');
    const duplicate = currentBlocks.find(
      block => block.route_name?.trim() === data.route_name.trim()
    );
    if (duplicate) {
      message.error('路由名称不能与其他版块重复');
      return;
    }

    // 先添加到表单
    appendBlock({
      name: data.name.trim(),
      route_name: data.route_name.trim(),
      index: blockFields.length + 1,
      qa_group_ids: [],
      feedback_group_ids: [],
      issue_group_ids: [],
      blog_group_ids: [],
      blog_ids: [],
      blogs: [],
      tag_ids: [],
      tag_enabled: false,
      links: { enabled: false, links: [] },
    });
    setShowAddDialog(false);

    // 立即保存以获取 forumId
    try {
      await handleSaveAll();
      message.success('版块创建成功');
    } catch {
      message.error('版块创建失败');
    }
  });

  const handleEditBlock = (index: number) => {
    const block = blockFields[index];
    resetEditForm({
      name: block.name || '',
      route_name: block.route_name || '',
    });
    setEditingBlockIndex(index);
    setShowEditDialog(true);
  };

  const handleEditBlockSubmit = handleEditSubmit(async data => {
    if (editingBlockIndex === null) return;

    // 检查路由名称是否重复
    const currentBlocks = getValues('blocks');
    const duplicate = currentBlocks.find(
      (block, idx) =>
        idx !== editingBlockIndex && block.route_name?.trim() === data.route_name.trim()
    );
    if (duplicate) {
      message.error('路由名称不能与其他版块重复');
      return;
    }

    updateBlock(editingBlockIndex, {
      ...blockFields[editingBlockIndex],
      name: data.name.trim(),
      route_name: data.route_name.trim(),
    });
    setShowEditDialog(false);
    setEditingBlockIndex(null);
    // 保存所有板块
    try {
      await handleSaveAll();
      message.success('版块更新成功');
    } catch {
      message.error('版块更新失败');
    }
  });

  const handleRemoveBlock = (index: number) => {
    setBlockToDelete(index);
    setDeleteConfirmText('');
    setShowDeleteDialog(true);
  };

  const confirmDeleteBlock = async () => {
    if (blockToDelete === null) return;

    const block = blockFields[blockToDelete];
    if (deleteConfirmText.trim() !== (block.name || '').trim()) {
      message.error('输入的板块名称不正确');
      return;
    }

    // 从表单中删除
    removeBlock(blockToDelete);
    setShowDeleteDialog(false);
    setBlockToDelete(null);
    setDeleteConfirmText('');

    // 保存以更新后端
    try {
      await handleSaveAll();
      message.success('版块删除成功');
    } catch {
      message.error('版块删除失败');
    }
  };

  const cancelDeleteBlock = () => {
    setShowDeleteDialog(false);
    setBlockToDelete(null);
    setDeleteConfirmText('');
  };

  const handleEditCategories = (index: number) => {
    const block = blockFields[index];
    resetCategoryForm({
      qa_group_ids: block.qa_group_ids || [],
      issue_group_ids: block.issue_group_ids || [],
      blog_group_ids: block.blog_group_ids || [],
    });
    setCategoryBlockIndex(index);
    setShowCategoryDialog(true);
  };

  const handleCategorySubmit = handleCategorySubmitForm(async data => {
    if (categoryBlockIndex === null) return;

    updateBlock(categoryBlockIndex, {
      ...blockFields[categoryBlockIndex],
      qa_group_ids: data.qa_group_ids || [],
      issue_group_ids: data.issue_group_ids || [],
      blog_group_ids: data.blog_group_ids || [],
    });
    setShowCategoryDialog(false);
    setCategoryBlockIndex(null);
    message.success('分类更新成功');
    // 保存所有板块
    await handleSaveAll();
  });

  const handleEditLinks = (index: number) => {
    const block = blockFields[index];
    const links = block.links?.links || [];
    resetLinksForm({
      links: links.length > 0 ? links : [],
    });
    setLinksBlockIndex(index);
    setShowLinksDialog(true);
  };

  const handleLinkDragStart = useCallback((event: DragStartEvent) => {
    setActiveLinkId(event.active.id as string);
  }, []);

  const handleLinkDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = linkFields.findIndex((_, index) => `link-${index}` === active.id);
        const newIndex = linkFields.findIndex((_, index) => `link-${index}` === over!.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          moveLink(oldIndex, newIndex);
        }
      }
      setActiveLinkId(null);
    },
    [linkFields, moveLink]
  );

  const handleLinkDragCancel = useCallback(() => {
    setActiveLinkId(null);
  }, []);

  const handleLinksSubmit = handleLinksSubmitForm(async data => {
    if (linksBlockIndex === null) return;

    const currentBlock = blockFields[linksBlockIndex];

    updateBlock(linksBlockIndex, {
      ...currentBlock,
      links: {
        enabled: true,
        links: data.links.filter(link => link.name.trim() && link.address.trim()),
      },
    });
    setShowLinksDialog(false);
    setLinksBlockIndex(null);
    message.success('常用链接更新成功');
    // 保存所有板块
    await handleSaveAll();
  });

  // 保存单个板块（只保存标签和公告）
  const handleSaveBlock = async (index: number) => {
    if (!blockFields[index]?.id) {
      message.error('新建板块需要先保存基础信息');
      return;
    }

    setSavingBlockIndex(index);
    try {
      const allBlocks = getValues('blocks');

      // 构建完整的板块数据（包含所有板块）
      const forums = allBlocks.map((b, idx) => {
        const groups: ModelForumGroups[] = [];

        if (b.qa_group_ids && b.qa_group_ids.length > 0) {
          groups.push({
            type: ModelDiscussionType.DiscussionTypeQA,
            group_ids: b.qa_group_ids,
          });
        }
        if (b.issue_group_ids && b.issue_group_ids.length > 0) {
          groups.push({
            type: ModelDiscussionType.DiscussionTypeIssue,
            group_ids: b.issue_group_ids,
          });
        }
        if (b.blog_group_ids && b.blog_group_ids.length > 0) {
          groups.push({
            type: ModelDiscussionType.DiscussionTypeBlog,
            group_ids: b.blog_group_ids,
          });
        }

        // 直接从表单读取 links.enabled 的值，确保获取最新值
        const linksEnabled = getValues(`blocks.${idx}.links.enabled`) ?? false;
        const linksList = b.links?.links ?? [];

        return {
          id: b.id,
          name: b.name?.trim() || '',
          route_name: b.route_name?.trim() || '',
          index: idx + 1,
          groups: groups.length > 0 ? groups : undefined,
          tag_ids: b.tag_ids && b.tag_ids.length > 0 ? b.tag_ids : undefined,
          tag_enabled: b.tag_enabled ?? false,
          blog_ids: b.blog_ids && b.blog_ids.length > 0 ? b.blog_ids : undefined,
          links: {
            enabled: linksEnabled,
            links: linksList,
          },
        };
      });

      await putAdminForum({ forums });
      message.success('保存成功');

      // 更新当前板块的本地状态，确保原始值同步更新
      const currentBlock = allBlocks[index];
      updateBlock(index, {
        ...currentBlock,
        tag_ids: currentBlock.tag_ids || [],
        tag_enabled: currentBlock.tag_enabled ?? false,
        blog_ids: currentBlock.blog_ids || [],
        links: {
          enabled: currentBlock.links?.enabled ?? false,
          links: currentBlock.links?.links || [],
        },
      });

      // 更新原始状态
      updateBlockOriginalStates(allBlocks);

      await refreshForums();
    } catch {
      console.error('保存失败');
      message.error('保存失败');
    } finally {
      setSavingBlockIndex(null);
    }
  };

  // 如果正在初始加载，显示加载状态
  if (isInitialLoading) {
    return (
      <Card>
        <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            正在加载版块数据...
          </Typography>
        </Stack>
      </Card>
    );
  }

  const blockToDeleteName = blockToDelete !== null ? blockFields[blockToDelete]?.name || '' : '';

  return (
    <Card>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography
            sx={{
              fontSize: 14,
              lineHeight: '32px',
              flexShrink: 0,
            }}
            variant="subtitle2"
          >
            板块管理
          </Typography>
          {blockFields.length < 3 && (
            <Button variant="text" color="info" onClick={handleAddBlock}>
              新增板块
            </Button>
          )}
        </Stack>
        {blockFields.length >= 3 && <Alert severity="info">最多支持创建3个版块</Alert>}
        {blockFields.length === 0 && <Alert severity="warning">请至少创建一个版块</Alert>}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={blockFields.map((_, index) => `block-${index}`)}
            strategy={rectSortingStrategy}
          >
            {blockFields.map((block, index) => (
              <SortableBlockItem
                key={block.fieldKey || index}
                index={index}
                control={control}
                getValues={getValues}
                onRemove={() => handleRemoveBlock(index)}
                onEdit={() => handleEditBlock(index)}
                onEditCategories={() => handleEditCategories(index)}
                onEditLinks={() => handleEditLinks(index)}
                onSave={() => handleSaveBlock(index)}
                forumId={block.id}
                isSaving={savingBlockIndex === index}
                originalState={block.id ? blockOriginalStates.get(block.id) : undefined}
              />
            ))}
          </SortableContext>

          <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
            {activeId ? (
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: 'background.paper',
                  boxShadow: 3,
                }}
              >
                <Typography variant="body2">
                  {blockFields[parseInt(activeId.split('-')[1])]?.name || '版块'}
                </Typography>
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Stack>

      {/* 新增板块弹窗 */}
      <Modal
        open={showAddDialog}
        onCancel={() => setShowAddDialog(false)}
        title="新增板块"
        footer={
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button variant="contained" onClick={handleAddBlockSubmit}>
              确定
            </Button>
          </Stack>
        }
      >
        <Stack spacing={3} sx={{ py: 2 }}>
          <Controller
            control={editControl}
            name="name"
            rules={{
              required: '请输入版块名称',
              minLength: {
                value: 1,
                message: '版块名称不能为空',
              },
              maxLength: {
                value: 50,
                message: '版块名称不能超过50个字符',
              },
              pattern: {
                value: /^[^\s].*[^\s]$|^[^\s]$/,
                message: '版块名称不能以空格开头或结尾',
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="版块名称"
                size="small"
                error={!!error}
                helperText={error?.message}
                sx={commonFieldSx}
              />
            )}
          />

          <Controller
            control={editControl}
            name="route_name"
            rules={{
              required: '请输入路由名称',
              pattern: {
                value: /^[a-zA-Z0-9_-]+$/,
                message: '路由名称只能包含字母、数字、下划线和连字符',
              },
              maxLength: {
                value: 30,
                message: '路由名称不能超过30个字符',
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="路由名称"
                size="small"
                error={!!error}
                helperText={error?.message || '只能包含字母、数字、下划线和连字符'}
                sx={commonFieldSx}
              />
            )}
          />
        </Stack>
      </Modal>

      {/* 编辑板块弹窗 */}
      <Modal
        open={showEditDialog}
        onCancel={() => {
          setShowEditDialog(false);
          setEditingBlockIndex(null);
        }}
        title="编辑板块"
        footer={
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setShowEditDialog(false);
                setEditingBlockIndex(null);
              }}
            >
              取消
            </Button>
            <Button variant="contained" onClick={handleEditBlockSubmit}>
              保存
            </Button>
          </Stack>
        }
      >
        <Stack spacing={3} sx={{ py: 2 }}>
          <Controller
            control={editControl}
            name="name"
            rules={{
              required: '请输入版块名称',
              minLength: {
                value: 1,
                message: '版块名称不能为空',
              },
              maxLength: {
                value: 50,
                message: '版块名称不能超过50个字符',
              },
              pattern: {
                value: /^[^\s].*[^\s]$|^[^\s]$/,
                message: '版块名称不能以空格开头或结尾',
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="版块名称"
                size="small"
                error={!!error}
                helperText={error?.message}
                sx={commonFieldSx}
              />
            )}
          />

          <Controller
            control={editControl}
            name="route_name"
            rules={{
              required: '请输入路由名称',
              pattern: {
                value: /^[a-zA-Z0-9_-]+$/,
                message: '路由名称只能包含字母、数字、下划线和连字符',
              },
              maxLength: {
                value: 30,
                message: '路由名称不能超过30个字符',
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="路由名称"
                size="small"
                error={!!error}
                helperText={error?.message || '只能包含字母、数字、下划线和连字符'}
                sx={commonFieldSx}
              />
            )}
          />
        </Stack>
      </Modal>

      {/* 编辑分类弹窗 */}
      <Modal
        open={showCategoryDialog}
        onCancel={() => {
          setShowCategoryDialog(false);
          setCategoryBlockIndex(null);
        }}
        title="编辑分类"
        footer={
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setShowCategoryDialog(false);
                setCategoryBlockIndex(null);
              }}
            >
              取消
            </Button>
            <Button variant="contained" onClick={() => handleCategorySubmit()}>
              保存
            </Button>
          </Stack>
        }
      >
        <Stack spacing={3} sx={{ py: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2" sx={{ minWidth: 80, fontSize: 14 }}>
              问题分类
            </Typography>
            <Box sx={{ flex: 1 }}>
              <Controller
                control={categoryControl}
                name="qa_group_ids"
                render={({ field }) => (
                  <CategorySelector
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="请选择问题分类"
                    textFieldSx={commonFieldSx}
                  />
                )}
              />
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2" sx={{ minWidth: 80, fontSize: 14 }}>
              Issue 类型
            </Typography>
            <Box sx={{ flex: 1 }}>
              <Controller
                control={categoryControl}
                name="issue_group_ids"
                render={({ field }) => (
                  <CategorySelector
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="请选择 Issue 分类"
                    textFieldSx={commonFieldSx}
                  />
                )}
              />
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2" sx={{ minWidth: 80, fontSize: 14 }}>
              文章分类
            </Typography>
            <Box sx={{ flex: 1 }}>
              <Controller
                control={categoryControl}
                name="blog_group_ids"
                render={({ field }) => (
                  <CategorySelector
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="请选择文章分类"
                    textFieldSx={commonFieldSx}
                  />
                )}
              />
            </Box>
          </Stack>
        </Stack>
      </Modal>

      {/* 删除确认对话框 */}
      <Dialog
        open={showDeleteDialog}
        onClose={cancelDeleteBlock}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 400,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>确认删除板块</DialogTitle>
        <DialogContent>
          <Alert
            severity="error"
            sx={theme => ({
              mb: 2,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              color: theme.palette.error.main,
            })}
          >
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              警告: 此操作无法撤销
            </Typography>
            <Typography variant="body2">
              删除板块&apos;{blockToDeleteName}&apos;会将板块内所有帖子都删除。
            </Typography>
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            请输入板块名称 <strong>{blockToDeleteName}</strong> 以确认删除
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder="输入板块名称"
            sx={commonFieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" onClick={cancelDeleteBlock}>
            取消
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteBlock}
            disabled={deleteConfirmText.trim() !== blockToDeleteName.trim()}
          >
            确认删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 常用链接编辑对话框 */}
      <Modal
        open={showLinksDialog}
        onCancel={() => {
          setShowLinksDialog(false);
          setLinksBlockIndex(null);
        }}
        title="常用链接"
        footer={
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setShowLinksDialog(false);
                setLinksBlockIndex(null);
              }}
            >
              取消
            </Button>
            <Button variant="contained" onClick={handleLinksSubmit}>
              确定
            </Button>
          </Stack>
        }
      >
        <Stack spacing={2} sx={{ py: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontSize: 14 }}>
              链接
            </Typography>
            <Button
              variant="text"
              color="info"
              size="small"
              startIcon={<Box component="span">+</Box>}
              onClick={() => {
                appendLink({ name: '', address: '' });
              }}
            >
              添加链接
            </Button>
          </Stack>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleLinkDragStart}
            onDragEnd={handleLinkDragEnd}
            onDragCancel={handleLinkDragCancel}
          >
            <SortableContext
              items={linkFields.map((_, index) => `link-${index}`)}
              strategy={rectSortingStrategy}
            >
              <Stack spacing={2}>
                {linkFields.map((link, linkIndex) => (
                  <SortableLinkItem
                    key={link.id || linkIndex}
                    index={linkIndex}
                    control={linksControl}
                    onRemove={() => removeLink(linkIndex)}
                  />
                ))}
                {linkFields.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: 'center', py: 2 }}
                  >
                    暂无链接，点击"添加链接"添加
                  </Typography>
                )}
              </Stack>
            </SortableContext>

            <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
              {activeLinkId ? (
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    backgroundColor: 'background.paper',
                    boxShadow: 3,
                  }}
                >
                  <Typography variant="body2">
                    {linkFields[Number.parseInt(activeLinkId.split('-')[1])]?.name || '链接'}
                  </Typography>
                </Box>
              ) : null}
            </DragOverlay>
          </DndContext>
        </Stack>
      </Modal>
    </Card>
  );
};

export default Forum;
