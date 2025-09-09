'use client';
import { ModelDiscussionDetail } from '@/api';
import { postDiscussion, putDiscussionDiscId } from '@/api/Discussion';
import defaultAvatar from '@/asset/img/default_avatar.png';
import { Icon } from '@/components';
import MdEditor from '@/components/mdEditor';
import Modal from '@/components/modal';
import { BBS_TAG_COLOR_ICON, BBS_TAGS } from '@/constant/discussion';
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
import { useParams } from 'next/navigation';
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
  status?: 'create' | 'edit';
  open: boolean;
  onClose: () => void;
  onOk: () => void;
}
const schema = z.object({
  content: z.string().default(''),
  group_ids: z.array(z.number()).default([]),
  tags: z.array(z.string()).default([]),
  title: z.string().min(1, '请输入讨论主题').default(''),
});
export const ReleaseModal: React.FC<ReleaseModalProps> = ({
  data,
  open,
  onClose,
  onOk,
  status = 'create',
}) => {
  const { id } = useParams();
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
  const onSubmit = handleSubmit(async (params) => {
    setLoading(true);
    let newParams = { ...params, group_ids: [1] };
    try {
      if (status === 'edit') {
        await putDiscussionDiscId({ discId: id + '' }, newParams).then(onOk);
      } else {
        await postDiscussion(newParams).then(onOk);
      }
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open]);

  useEffect(() => {
    if (status === 'edit' && data && open) {
      reset(data);
    }
  }, [data, open]);

  return (
    <Modal
      title={`${status === 'create' ? '发布' : '编辑'}主题`}
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
          label='讨论主题'
          fullWidth
          error={Boolean(errors.title)}
          helperText={errors.title?.message as string}
          size='small'
          autoComplete='off'
        />
        <Controller
          name='group_ids'
          control={control}
          rules={{ required: '请输入相关话题' }}
          render={({ field }) => (
            <Autocomplete
              multiple
              id='tags-filled'
              options={groups.flat}
              value={field.value as any}
              onChange={(_, value) => {
                field.onChange(value);
              }}
              size='small'
              freeSolo
              renderTags={(value: readonly string[], getTagProps) =>{
                console.log(value, 'value')
                return ''
              }
                // value.map((option: string, index: number) => {
                //   alert(JSON.stringify(option))
                //   const { key, ...tagProps } = getTagProps({ index });
                //   const label = `# ${option}`;
                //   return (
                //     <Tag
                //       key={key}
                //       label={label}
                //       size='small'
                //       sx={{
                //         backgroundColor: '#F2F3F5',
                //       }}
                //       {...tagProps}
                //     />
                //   );
                // })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='相关话题'
                  required
                  placeholder='请输入相关话题'
                  error={Boolean(errors.group_ids)}
                  helperText={errors.group_ids?.message as string}
                />
              )}
            />
          )}
        />
        {status === 'edit' && (
          <Controller
            name='tags'
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                id='tags-filled'
                options={BBS_TAGS}
                value={field.value}
                onChange={(_, value) => {
                  field.onChange(value);
                }}
                size='small'
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  const current =
                    BBS_TAG_COLOR_ICON[
                      option as keyof typeof BBS_TAG_COLOR_ICON
                    ];
                  return (
                    <Box
                      key={key}
                      component='li'
                      {...optionProps}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <Icon type={current.icon}></Icon> {option}
                    </Box>
                  );
                }}
                renderTags={(value: readonly string[], getTagProps) =>
                  value.map((option: string, index: number) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    const current =
                      BBS_TAG_COLOR_ICON[
                        option as keyof typeof BBS_TAG_COLOR_ICON
                      ];
                    const label = (
                      <Stack
                        direction='row'
                        alignItems='center'
                        sx={{ lineHeight: 1 }}
                        gap={0.5}
                      >
                        {current ?
                          <>
                            <Icon type={current.icon} />
                            {option}
                          </>
                        : `# ${option}`}
                      </Stack>
                    );

                    return (
                      <Tag
                        key={key}
                        label={label}
                        size='small'
                        sx={{
                          backgroundColor:
                            current?.backgroundColor || '#F2F3F5',
                        }}
                        {...tagProps}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label='标签'
                    placeholder='请输入标签'
                  />
                )}
              />
            )}
          />
        )}

        {status === 'create' && (
          <FormControl error={!!errors.content?.message}>
            <Controller
              rules={{ required: '请输入内容' }}
              name='content'
              control={control}
              render={({ field }) => (
                <MdEditor
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                  }}
                />
              )}
            />
            <FormHelperText id='component-error-text'>
              {errors.content?.message as string}
            </FormHelperText>
          </FormControl>
        )}
      </Stack>
    </Modal>
  );
};

const AvatarWrap = styled(Image)(({ theme }) => {
  return {
    borderRadius: '50%',
    display: 'block',
  };
});

export const Avatar = ({ src, size = 20 }: { src?: string; size: number }) => {
  return (
    <AvatarWrap
      src={src || defaultAvatar}
      alt='头像'
      width={size}
      height={size}
    />
  );
};
