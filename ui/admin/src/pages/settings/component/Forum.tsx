import React, { useState, useCallback, useEffect } from 'react';
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
  Grid,
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
import { Icon, message } from '@ctzhian/ui';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import Card from '@/components/card';
import LoadingButton from '@/components/LoadingButton';
import CategorySelector from '@/components/CategorySelector';
import ArticleSelector from '@/components/ArticleSelector';
import { putAdminForum } from '@/api/Forum';
import {
  ModelForumInfo,
  ModelForumGroups,
  ModelDiscussionType,
  SvcForumBlog,
} from '@/api/types';
import type { ForumItem } from '@/store/slices/forum';

interface ForumFormData {
  blocks: (ModelForumInfo & {
    qa_group_ids?: number[];
    issue_group_ids?: number[];
    feedback_group_ids?: number[];
    blog_group_ids?: number[];
    blog_ids?: number[];
    blogs?: SvcForumBlog[];
  })[];
}

// 可拖拽的版块项组件
interface SortableBlockItemProps {
  index: number;
  control: any;
  onRemove: () => void;
  setIsEdit: (value: boolean) => void;
  forumId?: number;
}

const SortableBlockItem: React.FC<SortableBlockItemProps> = ({
  index,
  control,
  onRemove,
  setIsEdit,
  forumId,
}) => {
  const blogOptions = useWatch({
    control,
    name: `blocks.${index}.blogs`,
  }) as SvcForumBlog[] | undefined;

  const { isDragging, attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `block-${index}`,
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
        borderRadius: 2,
        p: 2,
        mb: 2,
      }}
    >
      <Stack spacing={2}>
        {/* 版块名称和操作按钮 */}
        <Stack direction="row" alignItems='baseline' spacing={1}>
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
            name={`blocks.${index}.name`}
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
                placeholder="输入版块名称"
                label="版块名称"
                size="small"
                error={!!error}
                helperText={error?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />

          {/* 路由名称输入框 */}
          <Controller
            control={control}
            name={`blocks.${index}.route_name`}
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
              validate: (value, formValues) => {
                if (!value || !value.trim()) return true; // 必填验证由required处理

                // 检查是否与其他版块的route_name重复
                const currentBlocks = formValues.blocks || [];
                const duplicateIndex = currentBlocks.findIndex(
                  (block: ModelForumInfo, blockIndex: number) =>
                    blockIndex !== index && block.route_name?.trim() === value.trim()
                );

                if (duplicateIndex !== -1) {
                  return '路由名称不能与其他版块重复';
                }

                return true;
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                placeholder="用于URL路径"
                label="路由名称"
                size="small"
                error={!!error}
                helperText={error?.message || '只能包含字母、数字、下划线和连字符'}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
          <IconButton size="small" onClick={onRemove}>
            <Icon type="icon-guanbi-fill" sx={{ color: 'text.tertiary' }} />
          </IconButton>
        </Stack>

        {/* 分类选择 - 每行两个 */}
        <Grid container spacing={2}>
          {/* 分类选择 - 问答 */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              control={control}
              name={`blocks.${index}.qa_group_ids`}
              render={({ field, fieldState: { error } }) => (
                <Box>
                  <CategorySelector
                    value={field.value || []}
                    onChange={groupIds => {
                      field.onChange(groupIds);
                      setIsEdit(true);
                    }}
                    placeholder="请选择问答分类"
                    label="问答分类"
                    error={!!error}
                  />
                  {error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      {error.message}
                    </Typography>
                  )}
                </Box>
              )}
            />
          </Grid>

          {/* 分类选择 - 反馈 */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              control={control}
              name={`blocks.${index}.issue_group_ids`}
              render={({ field, fieldState: { error } }) => (
                <Box>
                  <CategorySelector
                    value={field.value || []}
                    onChange={groupIds => {
                      field.onChange(groupIds);
                      setIsEdit(true);
                    }}
                    placeholder="请选择 Issue 分类"
                    label="Issue 分类"
                    error={!!error}
                  />
                  {error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      {error.message}
                    </Typography>
                  )}
                </Box>
              )}
            />
          </Grid>

          {/* 分类选择 - 文章 */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              control={control}
              name={`blocks.${index}.blog_group_ids`}
              render={({ field, fieldState: { error } }) => (
                <Box>
                  <CategorySelector
                    value={field.value || []}
                    onChange={groupIds => {
                      field.onChange(groupIds);
                      setIsEdit(true);
                    }}
                    placeholder="请选择文章分类"
                    label="文章分类"
                    error={!!error}
                  />
                  {error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      {error.message}
                    </Typography>
                  )}
                </Box>
              )}
            />
          </Grid>
        </Grid>

        {/* 公告内容选择 */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Controller
              control={control}
              name={`blocks.${index}.blog_ids`}
              render={({ field, fieldState: { error } }) => (
                <Box>
                  <ArticleSelector
                    value={field.value || []}
                    onChange={articleIds => {
                      field.onChange(articleIds);
                      setIsEdit(true);
                    }}
                    placeholder="请选择公告内容"
                    label="选择公告内容"
                    forumId={forumId}
                    maxSelection={3}
                    error={!!error}
                    helperText={error?.message}
                    initialOptions={(blogOptions || [])
                      .filter(blog => blog?.id != null)
                      .map(blog => ({
                        id: blog.id || 0,
                        title: blog.title || '',
                      }))}
                  />
                </Box>
              )}
            />
          </Grid>
        </Grid>
        
      </Stack>
    </Box>
  );
};

const Forum: React.FC = () => {
  const [isEdit, setIsEdit] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { refreshForums } = useForumStore();
  
  // 从 store 获取板块数据
  const { forums: storeForums, loading: storeLoading } = useForumStore();

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const { control, handleSubmit, reset } = useForm<ForumFormData>({
    defaultValues: {
      blocks: [],
    },
    mode: 'onChange', // 实时验证
  });

  const {
    fields: blockFields,
    append: appendBlock,
    remove: removeBlock,
    move: moveBlock,
  } = useFieldArray({
    control,
    name: 'blocks',
    keyName: 'fieldKey', // 使用 fieldKey 作为 react-hook-form 的内部 key，避免覆盖真实的 id
  });

  // 将 store 中的论坛数据转换为表单格式
  const convertForumsToBlocks = useCallback((forums: ForumItem[]) => {
    return forums.map(block => {
      // 确保 groups 是数组
      const groupsArray = Array.isArray(block.groups) ? block.groups : [];
      
      const qaGroups = groupsArray.find(g => g.type === ModelDiscussionType.DiscussionTypeQA);
      const feedbackGroups = groupsArray.find(g => g.type === ModelDiscussionType.DiscussionTypeFeedback);
      const issueGroups = groupsArray.find(g => g.type === ModelDiscussionType.DiscussionTypeIssue);
      const blogGroups = groupsArray.find(g => g.type === ModelDiscussionType.DiscussionTypeBlog);
      
      return {
        ...block,
        qa_group_ids: qaGroups?.group_ids || [],
        issue_group_ids: issueGroups?.group_ids || [],
        feedback_group_ids: feedbackGroups?.group_ids || [],
        blog_group_ids: blogGroups?.group_ids || [],
        blog_ids: block.blog_ids || [],
        blogs: block.blogs || [],
      };
    });
  }, []);

  // 初始化：从 store 加载数据，如果 store 为空则请求 API
  useEffect(() => {
    const loadData = async () => {
      try {
        if (isInitialLoading) {
          setIsInitialLoading(true);
        }

        // 如果 store 中有数据，直接使用
        if (storeForums.length > 0) {
          const blocks = convertForumsToBlocks(storeForums);
          reset({ blocks });
          setIsInitialLoading(false);
          return;
        }

        // 如果 store 中没有数据且不在加载中，则请求 API
        if (!storeLoading) {
          await refreshForums();
        }
      } catch (error) {
        console.error('获取版块数据失败:', error);
        reset({ blocks: [] });
        setIsInitialLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  // 当 store 中的数据变化时，更新表单
  useEffect(() => {
    if (storeForums.length > 0) {
      const blocks = convertForumsToBlocks(storeForums);
      reset({ blocks });
    }
    // 当请求完成（loading 为 false）时，无论是否有数据，都应该结束初始加载状态
    if (!storeLoading && isInitialLoading) {
      setIsInitialLoading(false);
    }
  }, [storeForums, storeLoading, reset, convertForumsToBlocks, isInitialLoading]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = blockFields.findIndex((_, index) => `block-${index}` === active.id);
        const newIndex = blockFields.findIndex((_, index) => `block-${index}` === over!.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          moveBlock(oldIndex, newIndex);
          setIsEdit(true);
        }
      }
      setActiveId(null);
    },
    [blockFields, moveBlock]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleAddBlock = () => {
    if (blockFields.length >= 3) {
      message.error('最多只能创建3个版块');
      return;
    }
    appendBlock({
      name: '',
      route_name: '',
      index: blockFields.length + 1,
      qa_group_ids: [],
      feedback_group_ids: [],
      issue_group_ids: [],
      blog_group_ids: [],
      blog_ids: [],
      blogs: [],
    });
    setIsEdit(true);
  };

  const handleRemoveBlock = (index: number) => {
    setBlockToDelete(index);
    setShowDeleteDialog(true);
  };

  const confirmDeleteBlock = () => {
    if (blockToDelete !== null) {
      removeBlock(blockToDelete);
      setIsEdit(true);
    }
    setShowDeleteDialog(false);
    setBlockToDelete(null);
  };

  const cancelDeleteBlock = () => {
    setShowDeleteDialog(false);
    setBlockToDelete(null);
  };

  const onSubmit = async (data: ForumFormData) => {
    // 检查是否有版块
    if (data.blocks.length === 0) {
      message.error('请至少创建一个版块');
      return;
    }

    // 检查版块名称是否重复
    const names = data.blocks.map(block => block.name?.trim() || '');
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      message.error('版块名称不能重复');
      return;
    }

    // 检查路由名称是否重复
    const routeNames = data.blocks.map(block => block.route_name?.trim() || '');
    const uniqueRouteNames = new Set(routeNames);
    if (routeNames.length !== uniqueRouteNames.size) {
      message.error('路由名称不能重复');
      return;
    }

    setIsLoading(true);
    try {
      // 将表单数据转换为 API 需要的格式
      const forums = data.blocks.map((block, index) => {
        const groups: ModelForumGroups[] = [];
        
        // 为每种类型添加对应的分类
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
        if (block.feedback_group_ids && block.feedback_group_ids.length > 0) {
          groups.push({
            type: ModelDiscussionType.DiscussionTypeFeedback,
            group_ids: block.feedback_group_ids,
          });
        }
        if (block.blog_group_ids && block.blog_group_ids.length > 0) {
          groups.push({
            type: ModelDiscussionType.DiscussionTypeBlog,
            group_ids: block.blog_group_ids,
          });
        }
        if (block.issue_group_ids && block.issue_group_ids.length > 0) {
          groups.push({
            type: ModelDiscussionType.DiscussionTypeIssue,
            group_ids: block.issue_group_ids,
          });
        }
        
        return {
          id: block.id,
          name: block.name?.trim() || '',
          route_name: block.route_name?.trim() || '',
          index: index + 1, // 设置排序索引
          groups: groups.length > 0 ? groups : undefined,
          blog_ids: block.blog_ids && block.blog_ids.length > 0 ? block.blog_ids : undefined,
        };
      });

      await putAdminForum({ forums });
      setIsEdit(false);
      message.success('版块保存成功');
      // 强制刷新数据，确保所有组件都能获取到最新的板块列表
      await refreshForums();
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存版块失败');
    } finally {
      setIsLoading(false);
    }
  };

  const onCancel = () => {
    // 从 store 重新加载数据
    if (storeForums.length > 0) {
      const blocks = convertForumsToBlocks(storeForums);
      reset({ blocks });
    }
    setIsEdit(false);
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
            版块管理
          </Typography>
          {isEdit && (
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={onCancel}>
                取消
              </Button>
              <LoadingButton
                variant="contained"
                loading={isLoading}
                onClick={handleSubmit(onSubmit)}
                disabled={blockFields.length === 0}
              >
                保存
              </LoadingButton>
            </Stack>
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
                onRemove={() => handleRemoveBlock(index)}
                setIsEdit={setIsEdit}
                forumId={block.id}
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

        {blockFields.length < 3 && (
          <Button
            variant="text"
            color="info"
            onClick={handleAddBlock}
            sx={{ alignSelf: 'flex-start' }}
          >
            新增一个版块
          </Button>
        )}
      </Stack>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onClose={cancelDeleteBlock}>
        <DialogTitle>确认删除版块</DialogTitle>
        <DialogContent>
          <Typography>
            如果删除版块，该版块下的所有的问答、反馈等内容也会被删除，请确认？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            删除后将无法恢复，请谨慎操作。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteBlock}>取消</Button>
          <Button onClick={confirmDeleteBlock} color="error" variant="contained">
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default Forum;
