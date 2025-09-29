import {
  getAdminSystemLoginMethod,
  ModelAuth,
  ModelAuthConfig,
  ModelAuthInfo,
  putAdminSystemLoginMethod,
} from '@/api';
import Card from '@/components/card';
import { message } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useRequest } from 'ahooks';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

// 登录方式类型枚举
enum AuthType {
  PASSWORD = 1, // 密码认证
  OIDC = 2, // OIDC认证
}

// 登录方式选项
const AUTH_TYPE_OPTIONS = [
  { label: '密码认证', value: AuthType.PASSWORD },
  { label: 'OIDC', value: AuthType.OIDC },
];

// Zod 验证模式
const loginMethodSchema = z.object({
  enable_register: z.boolean(),
  public_access: z.boolean(),
  auth_types: z
    .array(z.number())
    .min(1, '至少需要选择一个登录方式')
    .refine(types => types.length > 0, '至少需要选择一个登录方式'),
  password_config: z
    .object({
      button_desc: z.string().optional(),
    })
    .optional(),
  oidc_config: z
    .object({
      url: z.string().url('请输入有效的URL地址').optional().or(z.literal('')),
      client_id: z.string().optional(),
      client_secret: z.string().optional(),
      button_desc: z.string().optional(),
    })
    .optional(),
});

type LoginMethodFormData = z.infer<typeof loginMethodSchema>;

const LoginMethod: React.FC = () => {
  const [showClientSecret, setShowClientSecret] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<LoginMethodFormData>({
    resolver: zodResolver(loginMethodSchema),
    defaultValues: {
      enable_register: true,
      public_access: true,
      auth_types: [AuthType.PASSWORD],
      password_config: {
        button_desc: '密码登录',
      },
      oidc_config: {
        url: '',
        client_id: '',
        client_secret: '',
        button_desc: 'OIDC 登录',
      },
    },
  });

  const watchedAuthTypes = watch('auth_types');
  const isPasswordSelected = watchedAuthTypes?.includes(AuthType.PASSWORD) ?? false;
  const isOidcSelected = watchedAuthTypes?.includes(AuthType.OIDC) ?? false;

  // 获取当前配置
  const { data, loading } = useRequest(getAdminSystemLoginMethod, {
    onSuccess: res => {
      if (res) {
        const { enable_register, public_access, auth_infos } = res;

        // 从 auth_infos 中提取认证类型和配置
        const authTypes = auth_infos?.map((info: ModelAuthInfo) => info.type).filter(Boolean) ?? [
          AuthType.PASSWORD,
        ];

        // 获取密码认证配置
        const passwordInfo = auth_infos?.find(
          (info: ModelAuthInfo) => info.type === AuthType.PASSWORD
        );
        const passwordConfig = {
          button_desc: passwordInfo?.button_desc ?? '密码登录',
        };

        // 获取 OIDC 配置
        const oidcInfo = auth_infos?.find((info: ModelAuthInfo) => info.type === AuthType.OIDC);
        const oidcConfig = {
          url: oidcInfo?.config?.oauth?.url ?? '',
          client_id: oidcInfo?.config?.oauth?.client_id ?? '',
          client_secret: oidcInfo?.config?.oauth?.client_secret ?? '',
          button_desc: oidcInfo?.button_desc ?? 'OIDC 登录',
        };

        reset({
          enable_register: enable_register ?? true,
          public_access: public_access ?? true,
          auth_types: authTypes as number[],
          password_config: passwordConfig,
          oidc_config: oidcConfig,
        });
      }
    },
    onError: () => {
      message.error('加载登录配置失败');
    },
  });

  const onSubmit = async (formData: LoginMethodFormData) => {
    try {
      // 验证OIDC配置
      if (formData.auth_types.includes(AuthType.OIDC)) {
        if (
          !formData.oidc_config?.url ||
          !formData.oidc_config?.client_id ||
          !formData.oidc_config?.client_secret
        ) {
          message.error('请完善OIDC配置信息');
          return;
        }
      }

      // 构建认证信息
      const authInfos: ModelAuthInfo[] = formData.auth_types.map(type => {
        const authInfo: ModelAuthInfo = { type };

        if (type === AuthType.PASSWORD) {
          authInfo.button_desc = formData.password_config?.button_desc || '密码登录';
        } else if (type === AuthType.OIDC && formData.oidc_config) {
          authInfo.button_desc = formData.oidc_config.button_desc || 'OIDC 登录';
          const config: ModelAuthConfig = {
            oauth: {
              url: formData.oidc_config.url || '',
              client_id: formData.oidc_config.client_id || '',
              client_secret: formData.oidc_config.client_secret || '',
            },
          };
          authInfo.config = config;
        }

        return authInfo;
      });

      const requestData: ModelAuth = {
        enable_register: formData.enable_register,
        public_access: formData.public_access,
        auth_infos: authInfos,
      };

      await putAdminSystemLoginMethod(requestData);
      message.success('登录配置保存成功');

      // 重新获取数据以更新表单状态
      reset(formData);
    } catch (error) {
      message.error('保存登录配置失败');
      console.error('Save login method config error:', error);
    }
  };

  const handleRemoveAuthType = (valueToRemove: number) => {
    const currentTypes = watch('auth_types') || [];
    const newTypes = currentTypes.filter(value => value !== valueToRemove);

    if (newTypes.length === 0) {
      message.error('至少需要选择一个登录方式');
      return;
    }

    setValue('auth_types', newTypes, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <Card sx={{ mb: 2 }}>
      <Box
        sx={{
          fontSize: 14,
          lineHeight: '32px',
          flexShrink: 0,
          mb: 2,
        }}
      >
        登录注册管理
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3}>
          {/* 用户注册开关 */}
          <Box>
            <Controller
              name="enable_register"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={field.onChange} />}
                  label="开放用户注册"
                />
              )}
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
              选择禁用则前台不提供注册入口
            </Typography>
          </Box>

          {/* 公开访问开关 */}
          <Box>
            <Controller
              name="public_access"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={field.onChange} />}
                  label="允许访问控制"
                />
              )}
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
              选择禁用则需要登录才可以访问整个社区；选择启用则默认不登录可以查看，需要登录后才可以发表
            </Typography>
          </Box>

          {/* 登录方式选择 */}
          <FormControl fullWidth error={!!errors.auth_types}>
            <InputLabel>登录方式</InputLabel>
            <Controller
              name="auth_types"
              control={control}
              render={({ field }) => (
                <Select
                  multiple
                  value={field.value || []}
                  onChange={field.onChange}
                  input={<OutlinedInput label="登录方式" />}
                  renderValue={selected => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as number[]).map(value => {
                        const option = AUTH_TYPE_OPTIONS.find(opt => opt.value === value);
                        return (
                          <Chip
                            key={value}
                            label={option?.label}
                            size="small"
                            onDelete={() => handleRemoveAuthType(value)}
                            deleteIcon={<span>×</span>}
                            sx={{
                              backgroundColor: '#f5f5f5',
                              border: '1px solid #e0e0e0',
                              '& .MuiChip-deleteIcon': {
                                fontSize: '18px',
                                color: '#666',
                                '&:hover': {
                                  color: '#333',
                                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                },
                              },
                            }}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {AUTH_TYPE_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
            {errors.auth_types && <FormHelperText>{errors.auth_types.message}</FormHelperText>}
          </FormControl>

          {/* 密码认证配置 */}
          {isPasswordSelected && (
            <Box
              sx={{
                border: '2px solid #e8f5e8',
                borderRadius: 2,
                backgroundColor: '#fafbfc',
                p: 3,
                mt: 2,
                position: 'relative',
                '&::before': {
                  content: '"密码认证配置"',
                  position: 'absolute',
                  top: -12,
                  left: 16,
                  backgroundColor: '#fafbfc',
                  px: 1,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#2e7d32',
                },
              }}
            >
              <Controller
                name="password_config.button_desc"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="按钮文案"
                    placeholder="密码登录"
                    fullWidth
                    size="small"
                    slotProps={{
                      inputLabel: {
                        shrink: !!field.value || undefined,
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                      },
                    }}
                  />
                )}
              />
            </Box>
          )}

          {/* OIDC 配置 */}
          {isOidcSelected && (
            <Box
              sx={{
                border: '2px solid #e3f2fd',
                borderRadius: 2,
                backgroundColor: '#fafbfc',
                p: 3,
                mt: 2,
                position: 'relative',
                '&::before': {
                  content: '"OIDC 配置"',
                  position: 'absolute',
                  top: -12,
                  left: 16,
                  backgroundColor: '#fafbfc',
                  px: 1,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#1976d2',
                },
              }}
            >
              <Stack spacing={3}>
                <Controller
                  name="oidc_config.url"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="服务器地址"
                      placeholder="https://your-oidc-server.com"
                      required
                      fullWidth
                      type="url"
                      size="small"
                      error={!!errors.oidc_config?.url}
                      helperText={errors.oidc_config?.url?.message}
                      slotProps={{
                        inputLabel: {
                          shrink: !!field.value || undefined,
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        },
                      }}
                    />
                  )}
                />

                <Controller
                  name="oidc_config.client_id"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Client ID"
                      placeholder="your-client-id"
                      required
                      fullWidth
                      size="small"
                      slotProps={{
                        inputLabel: {
                          shrink: !!field.value || undefined,
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        },
                      }}
                    />
                  )}
                />

                <Controller
                  name="oidc_config.client_secret"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Client Secret"
                      placeholder="your-client-secret"
                      required
                      fullWidth
                      type={showClientSecret ? 'text' : 'password'}
                      size="small"
                      slotProps={{
                        inputLabel: {
                          shrink: !!field.value || undefined,
                        },
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle client secret visibility"
                                onClick={() => setShowClientSecret(!showClientSecret)}
                                onMouseDown={event => event.preventDefault()}
                                edge="end"
                                size="small"
                              >
                                {showClientSecret ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        },
                      }}
                    />
                  )}
                />

                <Controller
                  name="oidc_config.button_desc"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="按钮文案"
                      placeholder="OIDC 登录"
                      fullWidth
                      size="small"
                      slotProps={{
                        inputLabel: {
                          shrink: !!field.value || undefined,
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        },
                      }}
                    />
                  )}
                />
              </Stack>
            </Box>
          )}

          {/* 保存按钮 */}
          <Box>
            {isDirty && (
              <Stack direction="row" spacing={2}>
                <Button variant="outlined" onClick={() => reset()} disabled={loading}>
                  取消
                </Button>
                <Button type="submit" variant="contained" color="primary" disabled={loading}>
                  保存
                </Button>
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>
    </Card>
  );
};

export default LoginMethod;
