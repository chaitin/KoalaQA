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
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Icon, Modal } from '@ctzhian/ui';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { CSSProperties, forwardRef, useCallback, useState } from 'react';
import {
  Control,
  Controller,
  useFieldArray,
  UseFormGetValues,
  UseFormTrigger,
} from 'react-hook-form';

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

interface LinkItemProps {
  linkId: string;
  linkIndex: number;
  groupIndex: number;
  control: Control<any>;
  onRemove: () => void;
  withOpacity?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  style?: CSSProperties;
}

const LinkItem = forwardRef<HTMLDivElement, LinkItemProps>(
  (
    {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      linkId,
      linkIndex,
      groupIndex,
      control,
      onRemove,
      withOpacity,
      isDragging,
      dragHandleProps,
      style,
      ...props
    },
    ref
  ) => {
    const inlineStyles: CSSProperties = {
      opacity: withOpacity ? '0.5' : '1',
      cursor: isDragging ? 'grabbing' : 'grab',
      ...style,
    };

    return (
      <Box ref={ref} style={inlineStyles} {...props}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 1.5,
            backgroundColor: 'background.default',
          }}
        >
          <IconButton
            size="small"
            sx={{
              cursor: 'grab',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
              flexShrink: 0,
            }}
            {...dragHandleProps}
          >
            <DragIndicatorIcon />
          </IconButton>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              flexShrink: 0,
              fontSize: 12,
              minWidth: 20,
            }}
          >
            {linkIndex + 1}.
          </Typography>
          <Controller
            control={control}
            name={`brand_groups.${groupIndex}.links.${linkIndex}.name`}
            rules={{ required: '请输入选项名称' }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                placeholder="输入选项名称"
                size="small"
                error={!!error}
                helperText={error?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                }}
                sx={commonFieldSx}
              />
            )}
          />
          <IconButton
            size="small"
            onClick={onRemove}
            sx={{
              flexShrink: 0,
              color: 'text.tertiary',
              '&:hover': {
                color: 'error.main',
              },
            }}
          >
            <Icon type="icon-guanbi-fill" />
          </IconButton>
        </Stack>
      </Box>
    );
  }
);

LinkItem.displayName = 'LinkItem';

const SortableLinkItem: React.FC<LinkItemProps> = ({ linkId, ...rest }) => {
  const { isDragging, attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: linkId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  return (
    <LinkItem
      ref={setNodeRef}
      style={style}
      withOpacity={isDragging}
      dragHandleProps={{
        ...attributes,
        ...listeners,
      }}
      linkId={linkId}
      {...rest}
    />
  );
};

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
  groupIndex: number;
  control: Control<any>;
  getValues: UseFormGetValues<any>;
  trigger: UseFormTrigger<any>;
  onSave: () => void | Promise<void>;
}

const EditDialog: React.FC<EditDialogProps> = ({
  open,
  onClose,
  onCancel,
  groupIndex,
  control,
  getValues,
  trigger,
  onSave,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
    move: moveLink,
  } = useFieldArray({
    control,
    name: `brand_groups.${groupIndex}.links`,
  });

  const handleLinkDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleLinkDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = linkFields.findIndex(
          (_, index) => `link-${groupIndex}-${index}` === active.id
        );
        const newIndex = linkFields.findIndex(
          (_, index) => `link-${groupIndex}-${index}` === over!.id
        );
        if (oldIndex !== -1 && newIndex !== -1) {
          moveLink(oldIndex, newIndex);
        }
      }
      setActiveId(null);
    },
    [linkFields, moveLink, groupIndex]
  );

  const handleLinkDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleAddLink = () => {
    appendLink({ name: '', id: 0 });
  };

  const handleRemoveLink = (linkIndex: number) => {
    removeLink(linkIndex);
  };

  // 处理确定按钮点击
  const handleOk = useCallback(async () => {
    // 触发表单验证
    const nameField = `brand_groups.${groupIndex}.name` as const;
    const linksField = `brand_groups.${groupIndex}.links` as const;

    // 验证分类名称
    const isNameValid = await trigger(nameField);
    if (!isNameValid) {
      return;
    }

    // 获取当前表单值
    const links = getValues(linksField) || [];

    // 检查选项列表是否为空
    if (!links || links.length === 0) {
      return;
    }

    // 验证每个选项名称
    let allLinksValid = true;
    for (let i = 0; i < links.length; i++) {
      const linkField = `brand_groups.${groupIndex}.links.${i}.name` as const;
      const isLinkValid = await trigger(linkField);
      if (!isLinkValid) {
        allLinksValid = false;
      }
    }

    // 如果所有验证都通过，保存并关闭弹窗（不需要恢复）
    if (allLinksValid) {
      await onSave();
      onClose();
    }
  }, [groupIndex, getValues, trigger, onClose, onSave]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title="编辑分类"
      onOk={handleOk}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 2,
        },
      }}
    >
      <Stack spacing={3} sx={{ mt: 1 }}>
        {/* 分类名称 */}
        <Box>
          <Controller
            control={control}
            name={`brand_groups.${groupIndex}.name`}
            rules={{
              required: '请输入分类名称',
              minLength: {
                value: 1,
                message: '分类名称不能为空',
              },
              maxLength: {
                value: 50,
                message: '分类名称不能超过50个字符',
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                placeholder="输入分类名称"
                label="分类名称"
                size="small"
                error={!!error}
                helperText={error?.message}
                sx={commonFieldSx}
                onChange={e => {
                  field.onChange(e.target.value);
                }}
              />
            )}
          />
        </Box>

        {/* 选项列表 */}
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontSize: 14, fontWeight: 500 }}>
              选项
            </Typography>
            <Button
              size="small"
              variant="text"
              color="info"
              onClick={handleAddLink}
              sx={{
                fontSize: 14,
                minWidth: 'auto',
                px: 1.5,
              }}
            >
              + 添加选项
            </Button>
          </Stack>

          {linkFields.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleLinkDragStart}
              onDragEnd={handleLinkDragEnd}
              onDragCancel={handleLinkDragCancel}
            >
              <SortableContext
                items={linkFields.map((_, index) => `link-${groupIndex}-${index}`)}
                strategy={rectSortingStrategy}
              >
                <Stack spacing={1.5}>
                  {linkFields.map((link, linkIndex) => (
                    <SortableLinkItem
                      key={link.id || linkIndex}
                      linkId={`link-${groupIndex}-${linkIndex}`}
                      linkIndex={linkIndex}
                      groupIndex={groupIndex}
                      control={control}
                      onRemove={() => handleRemoveLink(linkIndex)}
                    />
                  ))}
                </Stack>
              </SortableContext>
              <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
                {activeId ? (
                  <LinkItem
                    isDragging
                    linkId={activeId}
                    linkIndex={parseInt(activeId.split('-')[2])}
                    groupIndex={groupIndex}
                    control={control}
                    onRemove={() => {}}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <Box
              sx={{
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                p: 3,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                暂无选项，点击"添加选项"按钮添加
              </Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Modal>
  );
};

export default EditDialog;
