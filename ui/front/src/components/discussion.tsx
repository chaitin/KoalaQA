'use client';
import { ModelDiscussionDetail } from '@/api';
import { postDiscussion, putDiscussionDiscId } from '@/api/Discussion';
import { Icon } from '@/components';
import UserAvatar from '@/components/UserAvatar';
import EditorWrap from '@/components/editor/edit/Wrap';
import Modal from '@/components/modal';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Autocomplete,
  Box,
  Chip,
  FormControl,
  FormHelperText,
  Stack,
  styled,
  TextField,
} from '@mui/material';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import z from 'zod';
import { CommonContext } from './commonProvider';

export const Tag = styled(Chip)({
  borderRadius: '3px',
  height: 22,
  backgroundColor: '#F2F3F5',
});

export const ImgLogo = styled('div')(({ theme }) => {
  return {
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
    padding: '2px',
    border: '1px solid #eee',
    borderRadius: '4px',
    fontSize: 14,
    lineHeight: 1,
    fontWeight: 600,
    textAlign: 'center',
    backgroundColor: '#fff',
    img: {
      display: 'block',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    },
  };
});

interface ReleaseModalProps {
  data?: ModelDiscussionDetail;
  selectedTags: string[];
  status?: 'create' | 'edit';
  open: boolean;
  onClose: () => void;
  onOk: () => void;
  initialTitle?: string;
}
const schema = z.object({
  content: z.string().default(''),
  group_ids: z.array(z.number()).default([]),
  tags: z.array(z.string()).default([]).optional(),
  title: z.string().min(1, '请输入讨论主题').default(''),
});
export const ReleaseModal: React.FC<ReleaseModalProps> = ({
  data,
  open,
  onClose,
  onOk,
  status = 'create',
  initialTitle,
}) => {
  const { id } = useParams() || { id: '' };
  const {
    control,
    formState: { errors },
    reset,
    handleSubmit,
    register,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
  });
  const [loading, setLoading] = useState(false);
  const { groups } = useContext(CommonContext);
  const router = useRouter();
  const onSubmit = handleSubmit(async (params) => {
    setLoading(true);
    try {
      if (status === 'edit') {
        await putDiscussionDiscId({ discId: id + '' }, params).then(onOk);
        // 编辑成功后刷新当前页面
        router.refresh();
      } else {
        const uid = await postDiscussion(params);
        // 创建成功后跳转到首页
        router.push(`/discuss/${uid}`);
      }
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!open) {
      reset();
    } else if (status === 'create' && initialTitle) {
      // 当打开创建模态框且有初始标题时，设置标题
      reset({ title: initialTitle });
    }
  }, [open, initialTitle, status, reset]);

  useEffect(() => {
    if (status === 'edit' && data && open) {
      reset(data);
    }
  }, [data, open, reset, status]);

  return (
    <Modal
      title={`${status === 'create' ? '发帖' : '编辑'}提问`}
      open={open}
      onCancel={onClose}
      onOk={onSubmit}
      okText='发布'
      width={800}
      okButtonProps={{
        loading,
        id: 'submit-discussion-id',
      }}
    >
      <Stack gap={3}>
        <TextField
          {...register('title')}
          required
          variant='outlined'
          label='你遇到了什么问题？'
          fullWidth
          error={Boolean(errors.title)}
          helperText={errors.title?.message as string}
          size='small'
          autoComplete='off'
        />
        <FormControl error={!!errors.tags?.message}>
          <Controller
            name='tags'
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={field.value || []}
                onChange={(_, value) => {
                  const normalized = Array.from(
                    new Set(
                      value
                        .map((v) => (typeof v === 'string' ? v.trim() : v))
                        .filter(Boolean)
                    )
                  );
                  field.onChange(normalized);
                }}
                filterSelectedOptions
                size='small'
                renderTags={(value: readonly string[], getTagProps) =>
                  value.map((option: string, index: number) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    const label = (
                      <Stack direction='row' alignItems='center' gap={0.5}>
                        {`# ${option}`}
                      </Stack>
                    );
                    return (
                      <Tag
                        key={key}
                        label={label}
                        size='small'
                        sx={{
                          backgroundColor: '#F2F3F5',
                        }}
                        {...tagProps}
                      />
                    );
                  })
                }
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box
                      key={key}
                      component='li'
                      {...optionProps}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      {option}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label='标签'
                    placeholder='输入后按回车可添加自定义标签'
                  />
                )}
              />
            )}
          />
          <FormHelperText>{errors.tags?.message as string}</FormHelperText>
        </FormControl>
        <FormControl error={!!errors.group_ids?.message}>
          <Controller
            name='group_ids'
            control={control}
            render={({ field }) => {
              const list =
                typeof groups.origin !== 'undefined' ? groups.origin : [];

              const getId = (item: any) =>
                (item?.id ?? item?.item_id) as number;
              const getLabel = (item: any) =>
                item?.name ?? item?.title ?? item?.label ?? '';

              return (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {list.map((topic) => {
                    const options = topic.items || [];
                    const valueForTopic = topic.items?.filter((i) =>
                      field.value?.includes(i.id!)
                    );
                    return (
                      <Box
                        key={topic.id ?? topic.name}
                        sx={{
                          width: 'calc(50% - 8px)',
                          boxSizing: 'border-box',
                        }}
                      >
                        <Autocomplete
                          multiple
                          options={options}
                          value={valueForTopic}
                          isOptionEqualToValue={(option, value) =>
                            getId(option) === getId(value)
                          }
                          getOptionLabel={(option) => getLabel(option)}
                          onChange={(_, newValue) => {
                            const existing =
                              Array.isArray(field.value) ?
                                [...(field.value as number[])]
                              : [];
                            const otherIds = existing.filter(
                              (id) => !options.some((o: any) => getId(o) === id)
                            );
                            const newIds = newValue.map((v: any) => getId(v));
                            // 合并来自各个 Autocomplete 的选择，去重后回传
                            const merged = Array.from(
                              new Set([...otherIds, ...newIds])
                            );
                            field.onChange(merged);
                          }}
                          size='small'
                          renderOption={(props, option) => {
                            return (
                              <Box
                                component='li'
                                {...props}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                {getLabel(option)}
                              </Box>
                            );
                          }}
                          renderTags={(value: readonly any[], getTagProps) =>
                            value.map((option: any, index: number) => {
                              const { key, ...tagProps } = getTagProps({
                                index,
                              });
                              return (
                                <Tag
                                  key={key}
                                  label={
                                    <Stack
                                      direction='row'
                                      alignItems='center'
                                      gap={0.5}
                                    >
                                      {option.icon ?
                                        <Icon type={option.icon} />
                                      : null}
                                      <span>{getLabel(option)}</span>
                                    </Stack>
                                  }
                                  size='small'
                                  {...tagProps}
                                />
                              );
                            })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              required
                              label={`${topic.name}`}
                              placeholder='请选择'
                            />
                          )}
                        />
                      </Box>
                    );
                  })}
                </Box>
              );
            }}
          />
          <FormHelperText>{errors.group_ids?.message as string}</FormHelperText>
        </FormControl>
        <FormControl error={!!errors.content?.message}>
          <Box
            sx={{
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#fff',
            }}
          >
            {/* 编辑器内容 */}
            <Box sx={{ p: 0 }}>
              <Controller
                rules={{ required: '请输入内容' }}
                name='content'
                control={control}
                render={({ field }) => (
                  <EditorWrap
                    detail={{ content: field.value || '' }}
                    onContentChange={(content) => {
                      field.onChange(content);
                    }}
                    showActions={false}
                  />
                )}
              />
            </Box>
          </Box>
          <FormHelperText id='component-error-text'>
            {errors.content?.message as string}
          </FormHelperText>
        </FormControl>
      </Stack>
    </Modal>
  );
};

export const Avatar = ({ src, size = 20 }: { src?: string; size: number }) => {
  // 构造用户对象以适配 UserAvatar 组件
  const user = src && src.trim() !== '' ? { avatar: src } : undefined;
  
  return (
    <UserAvatar
      user={user}
      fallbackSrc="/logo.png"
      showSkeleton={false}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        objectPosition: 'center',
        backgroundColor: '#f5f5f5',
      }}
    />
  );
};
