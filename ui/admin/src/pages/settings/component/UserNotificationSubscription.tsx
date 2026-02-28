import {
  getAdminSystemNotifySub,
  ModelMessageNotifySubType,
  postAdminSystemNotifySub,
  ModelMessageNotifySubInfo,
} from '@/api';
import Card from '@/components/card';
import { message } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

const notifySubSchema = z.object({
  dingtalk: z.object({
    enabled: z.boolean(),
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
  }),
  wechat: z.object({
    enabled: z.boolean(),
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
    token: z.string().optional(),
    aes_key: z.string().optional(),
    template_id: z.string().optional(),
  }),
}).superRefine((data, ctx) => {
  if (data.dingtalk.enabled) {
    if (!data.dingtalk.client_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '启用钉钉机器人时，ClientID 为必填项',
        path: ['dingtalk', 'client_id'],
      });
    }
    if (!data.dingtalk.client_secret?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '启用钉钉机器人时，ClientSecret 为必填项',
        path: ['dingtalk', 'client_secret'],
      });
    }
  }
  if (data.wechat.enabled) {
    if (!data.wechat.client_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '启用微信公众号时，AppID 为必填项',
        path: ['wechat', 'client_id'],
      });
    }
    if (!data.wechat.client_secret?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '启用微信公众号时，AppSecret 为必填项',
        path: ['wechat', 'client_secret'],
      });
    }
    if (!data.wechat.token?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '启用微信公众号时，Token 为必填项',
        path: ['wechat', 'token'],
      });
    }
    if (!data.wechat.aes_key?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '启用微信公众号时，EncodingAESKey 为必填项',
        path: ['wechat', 'aes_key'],
      });
    }
    if (!data.wechat.template_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '启用微信公众号时，TemplateID 为必填项',
        path: ['wechat', 'template_id'],
      });
    }
  }
});

type NotifySubFormData = z.infer<typeof notifySubSchema>;

const UserNotificationSubscription = () => {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<NotifySubFormData>({
    resolver: zodResolver(notifySubSchema),
    defaultValues: {
      dingtalk: {
        enabled: false,
        client_id: '',
        client_secret: '',
      },
      wechat: {
        enabled: false,
        client_id: '',
        client_secret: '',
        token: '',
        aes_key: '',
        template_id: '',
      },
    },
  });

  const dingtalkEnabled = watch('dingtalk.enabled');
  const wechatEnabled = watch('wechat.enabled');

  const { loading: fetching, run: fetchData } = useRequest(getAdminSystemNotifySub, {
    onSuccess: (res) => {
      const dingtalkSub = res?.items?.find(
        (item) => item.type === ModelMessageNotifySubType.MessageNotifySubTypeDingtalk
      );
      const wechatSub = res?.items?.find(
        (item) => item.type === ModelMessageNotifySubType.MessageNotifySubTypeWechatOfficialAccount
      );

      reset({
        dingtalk: {
          enabled: dingtalkSub?.enabled || false,
          client_id: dingtalkSub?.info?.client_id || '',
          client_secret: dingtalkSub?.info?.client_secret || '',
        },
        wechat: {
          enabled: wechatSub?.enabled || false,
          client_id: wechatSub?.info?.client_id || '',
          client_secret: wechatSub?.info?.client_secret || '',
          token: wechatSub?.info?.token || '',
          aes_key: wechatSub?.info?.aes_key || '',
          template_id: wechatSub?.info?.template_id || '',
        },
      });
    },
  });

  const { loading: saving, runAsync: saveSub } = useRequest(postAdminSystemNotifySub, {
    manual: true,
  });

  const onSubmit = async (data: NotifySubFormData) => {
    try {
      const promises = [];
      if (dirtyFields.dingtalk) {
        promises.push(
          saveSub({
            type: ModelMessageNotifySubType.MessageNotifySubTypeDingtalk,
            enabled: data.dingtalk.enabled,
            info: data.dingtalk.enabled
              ? {
                client_id: data.dingtalk.client_id,
                client_secret: data.dingtalk.client_secret,
              }
              : undefined,
          })
        );
      }
      if (dirtyFields.wechat) {
        promises.push(
          saveSub({
            type: ModelMessageNotifySubType.MessageNotifySubTypeWechatOfficialAccount,
            enabled: data.wechat.enabled,
            info: data.wechat.enabled
              ? {
                client_id: data.wechat.client_id,
                client_secret: data.wechat.client_secret,
                token: data.wechat.token,
                aes_key: data.wechat.aes_key,
                template_id: data.wechat.template_id,
              }
              : undefined,
          })
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        message.success('通知配置保存成功');
        fetchData();
      }
    } catch (error) {
      message.error('保存通知配置失败');
    }
  };

  const renderSectionHeader = (title: string) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        fontSize: 14,
        mb: 2,
      }}
    >
      <Box
        sx={{
          width: 4,
          height: 12,
          borderRadius: 1,
          background: 'linear-gradient(180deg, #2458E5 0%, #5B8FFC 100%)',
          mr: 1,
          display: 'inline-block',
        }}
      />
      <Typography
        variant="body2"
        sx={{
          fontWeight: 500,
          color: '#21222D',
          fontSize: 14,
        }}
      >
        {title}
      </Typography>
    </Box>
  );

  return (
    <Card sx={{ mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isDirty && (
            <Button
              variant="contained"
              size="small"
              disabled={fetching || saving}
              onClick={handleSubmit(onSubmit)}
            >
              保存
            </Button>
          )}
        </Box>
      </Stack>

      {fetching ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>加载中...</Typography>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>
            {/* 钉钉机器人配置 */}
            <Box>
              {renderSectionHeader('钉钉')}
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" sx={{ height: 40 }}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    钉钉
                  </Typography>
                  <Controller
                    name="dingtalk.enabled"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        row
                        value={field.value ? 'enabled' : 'disabled'}
                        onChange={e => field.onChange(e.target.value === 'enabled')}
                      >
                        <FormControlLabel
                          value="disabled"
                          control={<Radio size="small" />}
                          label={<Typography variant="body2">禁用</Typography>}
                        />
                        <FormControlLabel
                          value="enabled"
                          control={<Radio size="small" />}
                          label={<Typography variant="body2">启用</Typography>}
                        />
                      </RadioGroup>
                    )}
                  />
                </Box>

                {dingtalkEnabled && (
                  <>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" sx={{ minWidth: 170 }}>
                        ClientID
                      </Typography>
                      <Controller
                        name="dingtalk.client_id"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            size="small"
                            error={!!errors.dingtalk?.client_id}
                            helperText={errors.dingtalk?.client_id?.message}
                            placeholder="请输入 ClientID"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#F8F9FA',
                                borderRadius: '10px',
                              },
                              '& .MuiInputBase-input': {
                                fontSize: 14,
                              },
                            }}
                          />
                        )}
                      />
                    </Box>

                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" sx={{ minWidth: 170 }}>
                        ClientSecret
                      </Typography>
                      <Controller
                        name="dingtalk.client_secret"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            size="small"
                            type="password"
                            error={!!errors.dingtalk?.client_secret}
                            helperText={errors.dingtalk?.client_secret?.message}
                            placeholder="请输入 ClientSecret"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#F8F9FA',
                                borderRadius: '10px',
                              },
                              '& .MuiInputBase-input': {
                                fontSize: 14,
                              },
                            }}
                          />
                        )}
                      />
                    </Box>
                  </>
                )}
              </Stack>
            </Box>

            <Divider sx={{ borderStyle: 'dashed', }} />

            {/* 微信服务号配置 */}
            <Box>
              {renderSectionHeader('微信服务号')}
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" sx={{ height: 40 }}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    微信服务号
                  </Typography>
                  <Controller
                    name="wechat.enabled"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        row
                        value={field.value ? 'enabled' : 'disabled'}
                        onChange={e => field.onChange(e.target.value === 'enabled')}
                      >
                        <FormControlLabel
                          value="disabled"
                          control={<Radio size="small" />}
                          label={<Typography variant="body2">禁用</Typography>}
                        />
                        <FormControlLabel
                          value="enabled"
                          control={<Radio size="small" />}
                          label={<Typography variant="body2">启用</Typography>}
                        />
                      </RadioGroup>
                    )}
                  />
                </Box>

                {wechatEnabled && (
                  <>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" sx={{ minWidth: 170 }}>
                        AppID
                      </Typography>
                      <Controller
                        name="wechat.client_id"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            size="small"
                            error={!!errors.wechat?.client_id}
                            helperText={errors.wechat?.client_id?.message}
                            placeholder="请输入 AppID"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#F8F9FA',
                                borderRadius: '10px',
                              },
                              '& .MuiInputBase-input': {
                                fontSize: 14,
                              },
                            }}
                          />
                        )}
                      />
                    </Box>

                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" sx={{ minWidth: 170 }}>
                        AppSecret
                      </Typography>
                      <Controller
                        name="wechat.client_secret"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            size="small"
                            type="password"
                            error={!!errors.wechat?.client_secret}
                            helperText={errors.wechat?.client_secret?.message}
                            placeholder="请输入 AppSecret"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#F8F9FA',
                                borderRadius: '10px',
                              },
                              '& .MuiInputBase-input': {
                                fontSize: 14,
                              },
                            }}
                          />
                        )}
                      />
                    </Box>

                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" sx={{ minWidth: 170 }}>
                        Token
                      </Typography>
                      <Controller
                        name="wechat.token"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            size="small"
                            error={!!errors.wechat?.token}
                            helperText={errors.wechat?.token?.message}
                            placeholder="请输入 Token"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#F8F9FA',
                                borderRadius: '10px',
                              },
                              '& .MuiInputBase-input': {
                                fontSize: 14,
                              },
                            }}
                          />
                        )}
                      />
                    </Box>

                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" sx={{ minWidth: 170 }}>
                        EncodingAESKey
                      </Typography>
                      <Controller
                        name="wechat.aes_key"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            size="small"
                            error={!!errors.wechat?.aes_key}
                            helperText={errors.wechat?.aes_key?.message}
                            placeholder="请输入 EncodingAESKey"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#F8F9FA',
                                borderRadius: '10px',
                              },
                              '& .MuiInputBase-input': {
                                fontSize: 14,
                              },
                            }}
                          />
                        )}
                      />
                    </Box>

                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" sx={{ minWidth: 170 }}>
                        TemplateID
                      </Typography>
                      <Controller
                        name="wechat.template_id"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            size="small"
                            error={!!errors.wechat?.template_id}
                            helperText={errors.wechat?.template_id?.message}
                            placeholder="请输入 TemplateID"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#F8F9FA',
                                borderRadius: '10px',
                              },
                              '& .MuiInputBase-input': {
                                fontSize: 14,
                              },
                            }}
                          />
                        )}
                      />
                    </Box>
                  </>
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
      )}
    </Card>
  );
};

export default UserNotificationSubscription;
