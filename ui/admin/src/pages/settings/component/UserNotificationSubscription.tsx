import {
  getAdminSystemNotifySub,
  ModelMessageNotifySubType,
  postAdminSystemNotifySub,
  SvcMessageNotifySubCreateReq,
} from '@/api';
import Card from '@/components/card';
import { message } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const userNotificationSchema = z
  .object({
    enabled: z.boolean(),
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 当启用时，所有字段必填
    if (data.enabled) {
      if (!data.client_id || data.client_id.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '启用钉钉机器人时，ClientID 为必填项',
          path: ['client_id'],
        });
      }
      if (!data.client_secret || data.client_secret.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '启用钉钉机器人时，ClientSecret 为必填项',
          path: ['client_secret'],
        });
      }
    }
  });

type UserNotificationFormData = {
  enabled: boolean;
  client_id?: string;
  client_secret?: string;
};

const UserNotificationSubscription = () => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<UserNotificationFormData>({
    resolver: zodResolver(userNotificationSchema),
    defaultValues: {
      enabled: false,
      client_id: '',
      client_secret: '',
    },
  });

  const enabled = watch('enabled');

  // 获取当前配置
  const { loading, run: fetchData } = useRequest(getAdminSystemNotifySub, {
    manual: true,
    onSuccess: res => {
      const dingtalkSub = res?.items?.find(
        item => item.type === ModelMessageNotifySubType.MessageNotifySubTypeDingtalk
      );
      if (dingtalkSub) {
        reset({
          enabled: dingtalkSub.enabled || false,
          client_id: dingtalkSub.info?.client_id || '',
          client_secret: dingtalkSub.info?.client_secret || '',
        });
      } else {
        reset({
          enabled: false,
          client_id: '',
          client_secret: '',
        });
      }
    },
  });

  // 提交表单
  const onSubmit = async (data: UserNotificationFormData) => {
    try {
      const req: SvcMessageNotifySubCreateReq = {
        enabled: data.enabled,
        type: ModelMessageNotifySubType.MessageNotifySubTypeDingtalk,
        info: data.enabled
          ? {
              client_id: data.client_id,
              client_secret: data.client_secret,
            }
          : undefined,
      };
      await postAdminSystemNotifySub(req);
      reset(data);
      message.success('保存成功');
      fetchData();
    } catch (error) {
      message.error('保存失败');
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography
          sx={{
            fontSize: 14,
            lineHeight: '32px',
            flexShrink: 0,
          }}
          variant="subtitle2"
        >
          用户通知订阅
        </Typography>
        <Box sx={{ my: -1 }}>
          {isDirty && (
            <Button
              onClick={handleSubmit(onSubmit)}
              type="submit"
              variant="contained"
              size="small"
              color="primary"
            >
              保存
            </Button>
          )}
        </Box>
      </Stack>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>加载中...</Typography>
        </Box>
      ) : (
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" sx={{ minWidth: 140 }}>
              钉钉机器人
            </Typography>
            <FormControl fullWidth>
              <RadioGroup
                row
                value={enabled ? 'enabled' : 'disabled'}
                onChange={e => {
                  setValue('enabled', e.target.value === 'enabled', {
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                }}
              >
                <FormControlLabel value="disabled" control={<Radio />} label="禁用" />
                <FormControlLabel value="enabled" control={<Radio />} label="启用" />
              </RadioGroup>
            </FormControl>
          </Stack>

          {enabled && (
            <>
              <Box display="flex" alignItems="center">
                <Typography variant="body2" sx={{ mr: 2, minWidth: 120 }}>
                  ClientID
                </Typography>
                <TextField
                  fullWidth
                  {...register('client_id')}
                  required
                  error={!!errors.client_id}
                  helperText={errors.client_id?.message}
                  placeholder="请输入 ClientID"
                />
              </Box>

              <Box display="flex" alignItems="center">
                <Typography variant="body2" sx={{ mr: 2, minWidth: 120 }}>
                  ClientSecret
                </Typography>
                <TextField
                  fullWidth
                  {...register('client_secret')}
                  required
                  error={!!errors.client_secret}
                  helperText={errors.client_secret?.message}
                  placeholder="请输入 ClientSecret"
                  type="password"
                />
              </Box>
            </>
          )}
        </Stack>
      )}
    </Card>
  );
};

export default UserNotificationSubscription;
