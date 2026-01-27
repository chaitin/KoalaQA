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
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  MenuItem,
  OutlinedInput,
  Radio,
  RadioGroup,
  Select,
  Stack,
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
  WECOM = 3, //企业微信认证
  WECHAT = 4, // 微信扫码认证
}

// 登录方式选项
const AUTH_TYPE_OPTIONS = [
  { label: '密码认证', value: AuthType.PASSWORD },
  { label: 'OIDC 认证', value: AuthType.OIDC },
  { label: '企业微信认证', value: AuthType.WECOM },
  { label: '微信扫码认证', value: AuthType.WECHAT },
];

// Zod 验证模式
const loginMethodSchema = z.object({
  need_review: z.boolean(),
  public_access: z.boolean(),
  prompt: z.string().optional(),
  auth_types: z
    .array(z.number())
    .min(1, '至少需要选择一个登录方式')
    .refine(types => types.length > 0, '至少需要选择一个登录方式'),
  password_config: z
    .object({
      button_desc: z.string().optional(),
      enable_register: z.boolean().optional(),
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
  wecom_config: z
    .object({
      corp_id: z.string().optional(),
      client_id: z.string().optional(),
      secret: z.string().optional(),
      button_desc: z.string().optional(),
    })
    .optional(),
  wechat_config: z
    .object({
      app_id: z.string().optional(),
      app_secret: z.string().optional(),
      button_desc: z.string().optional(),
      enable_register: z.boolean().optional(),
    })
    .optional(),
}).refine(
  (data) => {
    if (data.need_review && !data.prompt?.trim()) {
      return false;
    }
    return true;
  },
  {
    message: '需要审批时，用户申请提示语不能为空',
    path: ['prompt'],
  }
);

type LoginMethodFormData = z.infer<typeof loginMethodSchema>;


const LoginMethod: React.FC = () => {
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showWecomSecret, setShowWecomSecret] = useState(false);
  const [showWechatSecret, setShowWechatSecret] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<LoginMethodFormData>({
    resolver: zodResolver(loginMethodSchema),
    defaultValues: {
      need_review: false,
      public_access: true,
      prompt: '',
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
      wecom_config: {
        corp_id: '',
        client_id: '',
        secret: '',
        button_desc: '企业微信登陆',
      },
      wechat_config: {
        app_id: '',
        app_secret: '',
        button_desc: '微信扫码登录',
      },
    },
  });

  const watchedAuthTypes = watch('auth_types');
  const watchedNeedReview = watch('need_review');
  const isPasswordSelected = watchedAuthTypes?.includes(AuthType.PASSWORD) ?? false;
  const isOidcSelected = watchedAuthTypes?.includes(AuthType.OIDC) ?? false;
  const isWecomSelected = watchedAuthTypes?.includes(AuthType.WECOM) ?? false;
  const isWechatSelected = watchedAuthTypes?.includes(AuthType.WECHAT) ?? false;

  // 获取当前配置
  const { loading } = useRequest(getAdminSystemLoginMethod, {
    onSuccess: res => {
      if (res) {
        const { need_review, public_access, auth_infos } = res;

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
          enable_register: passwordInfo?.enable_register ?? false,
        };

        // 获取 OIDC 配置
        const oidcInfo = auth_infos?.find((info: ModelAuthInfo) => info.type === AuthType.OIDC);
        const oidcConfig = {
          url: oidcInfo?.config?.oauth?.url ?? '',
          client_id: oidcInfo?.config?.oauth?.client_id ?? '',
          client_secret: oidcInfo?.config?.oauth?.client_secret ?? '',
          button_desc: oidcInfo?.button_desc ?? 'OIDC 登录',
        };

        // 获取企业微信配置
        const wecomInfo = auth_infos?.find((info: ModelAuthInfo) => info.type === AuthType.WECOM);
        const wecomConfig = {
          corp_id: wecomInfo?.config?.oauth?.corp_id ?? '',
          client_id: wecomInfo?.config?.oauth?.client_id ?? '',
          secret: wecomInfo?.config?.oauth?.client_secret ?? '',
          button_desc: wecomInfo?.button_desc ?? '企业微信登陆',
        };

        // 获取微信扫码配置
        const wechatInfo = auth_infos?.find((info: ModelAuthInfo) => info.type === AuthType.WECHAT);
        const wechatConfig = {
          app_id: wechatInfo?.config?.oauth?.client_id ?? '',
          app_secret: wechatInfo?.config?.oauth?.client_secret ?? '',
          button_desc: wechatInfo?.button_desc ?? '微信扫码登录',
          enable_register: wechatInfo?.enable_register ?? false,
        };

        reset({
          need_review: need_review ?? false,
          public_access: public_access ?? true,
          prompt: res?.prompt,
          auth_types: authTypes as number[],
          password_config: passwordConfig,
          oidc_config: oidcConfig,
          wecom_config: wecomConfig,
          wechat_config: wechatConfig,
        });
      }
    },
    onError: () => {
      message.error('加载登录配置失败');
    },
  });

  const onSubmit = async (formData: LoginMethodFormData) => {
    try {
      // 验证用户申请提示语
      if (formData.need_review && !formData.prompt?.trim()) {
        message.error('请输入用户申请提示语');
        return;
      }

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

      // 验证企业微信配置
      if (formData.auth_types.includes(AuthType.WECOM)) {
        if (
          !formData.wecom_config?.corp_id ||
          !formData.wecom_config?.client_id ||
          !formData.wecom_config?.secret
        ) {
          message.error('请完善企业微信配置信息');
          return;
        }
      }

      // 验证微信扫码配置
      if (formData.auth_types.includes(AuthType.WECHAT)) {
        if (
          !formData.wechat_config?.app_id ||
          !formData.wechat_config?.app_secret
        ) {
          message.error('请完善微信扫码配置信息');
          return;
        }
      }

      // 构建认证信息
      // 构建认证信息策略映射
      const authInfoStrategies: Record<number, () => ModelAuthInfo> = {
        [AuthType.PASSWORD]: () => ({
          type: AuthType.PASSWORD,
          button_desc: formData.password_config?.button_desc || '密码登录',
          enable_register: formData.password_config?.enable_register ?? false,
        }),
        [AuthType.OIDC]: () => ({
          type: AuthType.OIDC,
          button_desc: formData.oidc_config?.button_desc || 'OIDC 登录',
          config: {
            oauth: {
              url: formData.oidc_config?.url || '',
              client_id: formData.oidc_config?.client_id || '',
              client_secret: formData.oidc_config?.client_secret || '',
            },
          },
        }),
        [AuthType.WECOM]: () => ({
          type: AuthType.WECOM,
          button_desc: formData.wecom_config?.button_desc || '企业微信登陆',
          config: {
            oauth: {
              corp_id: formData.wecom_config?.corp_id || '',
              client_id: formData.wecom_config?.client_id || '',
              client_secret: formData.wecom_config?.secret || '',
            },
          },
        }),
        [AuthType.WECHAT]: () => ({
          type: AuthType.WECHAT,
          button_desc: formData.wechat_config?.button_desc || '微信扫码登录',
          enable_register: formData.wechat_config?.enable_register ?? false,
          config: {
            oauth: {
              client_id: formData.wechat_config?.app_id || '',
              client_secret: formData.wechat_config?.app_secret || '',
            },
          },
        }),
      };

      const authInfos: ModelAuthInfo[] = formData.auth_types
        .map(type => authInfoStrategies[type]?.())
        .filter(Boolean);

      const requestData: ModelAuth = {
        need_review: formData.need_review,
        public_access: formData.public_access,
        prompt: formData.prompt,
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

  return (
    <Card sx={{ mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          sx={{
            fontSize: 14,
            lineHeight: '32px',
            flexShrink: 0,
          }}
          variant="subtitle2"
        >
          登录注册管理
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isDirty && (
            <Button
              type="submit"
              variant="contained"
              size="small"
              disabled={loading}
              onClick={handleSubmit(onSubmit, (e) => { console.log(e) })}
            >
              保存
            </Button>
          )}
        </Box>
      </Stack>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack gap={1}>
          {/* 公开访问 */}
          <Box display="flex" alignItems="center">
            <Typography variant="body2" sx={{ minWidth: 170 }}>
              公开访问
            </Typography>
            <Controller
              name="public_access"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  row
                  value={field.value ? 'allow' : 'disallow'}
                  onChange={e => field.onChange(e.target.value === 'allow')}
                >
                  <FormControlLabel
                    value="allow"
                    control={<Radio size="small" />}
                    label="允许公开访问"
                  />
                  <FormControlLabel
                    value="disallow"
                    control={<Radio size="small" />}
                    label="不允许公开访问"
                  />
                </RadioGroup>
              )}
            />
          </Box>

          {/* 新用户注册审批方式 */}
          <Box display="flex" alignItems="center">
            <Typography variant="body2" sx={{ minWidth: 170 }}>
              新用户注册
            </Typography>
            <Controller
              name="need_review"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  row
                  value={field.value ? 'review' : 'direct'}
                  onChange={e => field.onChange(e.target.value === 'review')}
                >
                  <FormControlLabel
                    value="direct"
                    control={<Radio size="small" />}
                    label="直接注册"
                  />
                  <FormControlLabel
                    value="review"
                    control={<Radio size="small" />}
                    label="需审批"
                  />
                </RadioGroup>
              )}
            />
          </Box>

          {/* 用户申请提示语 - 仅在需要审批时显示 */}
          {watchedNeedReview && (
            <Box display="flex" alignItems="flex-start" sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 170, mt: 1 }}>
                用户申请提示语<span style={{ color: 'red' }}>*</span>
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Controller
                  name="prompt"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      placeholder="如：您的注册申请已提交，请等待管理员审批。"
                      required
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      error={!!errors.prompt}
                      helperText={errors.prompt?.message}
                      InputLabelProps={{
                        shrink: false,
                      }}
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
            </Box>
          )}

          {/* 登录方式选择 */}
          <Box display="flex" alignItems="center">
            <Typography variant="body2" sx={{ mr: 2, minWidth: 155 }}>
              登录方式
            </Typography>
            <Box flex={1}>
              <FormControl fullWidth error={!!errors.auth_types}>
                <Controller
                  name="auth_types"
                  control={control}
                  render={({ field }) => (
                    <Select
                      multiple
                      value={field.value || []}
                      variant='outlined'
                      onChange={field.onChange}
                      input={<OutlinedInput />}
                      sx={{
                        '& .MuiSelect-select': {
                          py: 1,
                        },
                      }}
                      renderValue={selected => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {(selected as number[]).map(value => {
                            const option = AUTH_TYPE_OPTIONS.find(opt => opt.value === value);
                            return (
                              <Box
                                key={value}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '16px',
                                  padding: '2px 8px',
                                  fontSize: '12px',
                                  color: '#333333',
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{ fontSize: '12px', lineHeight: 'normal' }}
                                >
                                  {option?.label}
                                </Typography>
                              </Box>
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
            </Box>
          </Box>

          {/* 密码认证配置 */}
          {isPasswordSelected && (
            <>
              <Box
                sx={{
                  borderTop: '1px dashed #e0e0e0',
                  mt: 3,
                }}
              />
              <Box
                sx={{
                  borderRadius: 1,
                  backgroundColor: 'white',
                  py: 3,
                  minHeight: 64,
                }}
              >
                <Box
                  sx={{
                    left: 16,
                    backgroundColor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    py: 0,
                    fontSize: 14,
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
                    密码认证配置
                  </Typography>
                </Box>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ minWidth: 170 }}>
                      开放用户注册
                    </Typography>
                    <Controller
                      name="password_config.enable_register"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup
                          row
                          value={field.value ? 'enable' : 'disable'}
                          onChange={e => field.onChange(e.target.value === 'enable')}
                        >
                          <FormControlLabel
                            value="enable"
                            control={<Radio size="small" />}
                            label="开放用户注册"
                          />
                          <FormControlLabel
                            value="disable"
                            control={<Radio size="small" />}
                            label="不开放用户注册"
                          />
                        </RadioGroup>
                      )}
                    />
                  </Box>

                  <Stack direction="row" alignItems="center" >
                    <Typography variant="body2" sx={{ minWidth: 170 }}>
                      登录按钮文案
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Controller
                        name="password_config.button_desc"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            placeholder="请输入"
                            fullWidth
                            size="small"
                            InputLabelProps={{
                              shrink: false,
                            }}
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
                  </Stack>
                </Stack>
              </Box>
            </>
          )}

          {/* OIDC 配置 */}
          {isOidcSelected && (
            <>
              <Box
                sx={{
                  borderTop: '1px dashed #e0e0e0',
                }}
              />
              <Box
                sx={{
                  borderRadius: 1,
                  backgroundColor: 'white',
                  py: 3,
                  minHeight: 64,
                }}
              >
                <Box
                  sx={{
                    left: 16,
                    backgroundColor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    py: 0,
                    fontSize: 14,
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
                    OIDC 配置
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    服务器地址<span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="oidc_config.url"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="请输入"
                          required
                          fullWidth
                          type="url"
                          size="small"
                          error={!!errors.oidc_config?.url}
                          helperText={errors.oidc_config?.url?.message}
                          InputLabelProps={{
                            shrink: false,
                          }}
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
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    Client ID<span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="oidc_config.client_id"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="请输入"
                          required
                          fullWidth
                          size="small"
                          InputLabelProps={{
                            shrink: false,
                          }}
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
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    Client Secret<span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="oidc_config.client_secret"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="请输入"
                          required
                          fullWidth
                          type={showClientSecret ? 'text' : 'password'}
                          size="small"
                          InputProps={{
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
                          }}
                          InputLabelProps={{
                            shrink: false,
                          }}
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
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    按钮文案
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="oidc_config.button_desc"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="请输入"
                          fullWidth
                          size="small"
                          InputLabelProps={{
                            shrink: false,
                          }}
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
                </Stack>
              </Stack>
            </>
          )}

          {/* 企业微信配置 */}
          {isWecomSelected && (
            <>
              <Box
                sx={{
                  borderTop: '1px dashed #e0e0e0',
                }}
              />
              <Box
                sx={{
                  borderRadius: 1,
                  backgroundColor: 'white',
                  py: 3,
                  minHeight: 64,
                }}
              >
                <Box
                  sx={{
                    left: 16,
                    backgroundColor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    py: 0,
                    fontSize: 14,
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
                    企业微信配置
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    企业 ID<span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="wecom_config.corp_id"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="请输入"
                          required
                          fullWidth
                          size="small"
                          InputLabelProps={{
                            shrink: false,
                          }}
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
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    Agent ID<span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="wecom_config.client_id"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="请输入"
                          required
                          fullWidth
                          size="small"
                          InputLabelProps={{
                            shrink: false,
                          }}
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
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    Secret<span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="wecom_config.secret"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="请输入"
                          required
                          fullWidth
                          type={showWecomSecret ? 'text' : 'password'}
                          size="small"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="toggle wecom secret visibility"
                                  onClick={() => setShowWecomSecret(!showWecomSecret)}
                                  onMouseDown={event => event.preventDefault()}
                                  edge="end"
                                  size="small"
                                >
                                  {showWecomSecret ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          InputLabelProps={{
                            shrink: false,
                          }}
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
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    按钮文案
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="wecom_config.button_desc"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="请输入"
                          fullWidth
                          size="small"
                          InputLabelProps={{
                            shrink: false,
                          }}
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
                </Stack>
              </Stack>
            </>
          )}

          {/* 微信扫码配置 */}
          {isWechatSelected && (
            <>
              <Box
                sx={{
                  borderTop: '1px dashed #e0e0e0',
                }}
              />
              <Box
                sx={{
                  borderRadius: 1,
                  backgroundColor: 'white',
                  py: 3,
                  minHeight: 64,
                }}
              >
                <Box
                  sx={{
                    left: 16,
                    backgroundColor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    py: 0,
                    fontSize: 14,
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
                    微信扫码配置
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={1.5}>
                <Box display="flex" alignItems="center">
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    开放用户注册
                  </Typography>
                  <Controller
                    name="wechat_config.enable_register"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        row
                        value={field.value ? 'enable' : 'disable'}
                        onChange={e => field.onChange(e.target.value === 'enable')}
                      >
                        <FormControlLabel
                          value="enable"
                          control={<Radio size="small" />}
                          label="开放用户注册"
                        />
                        <FormControlLabel
                          value="disable"
                          control={<Radio size="small" />}
                          label="不开放用户注册"
                        />
                      </RadioGroup>
                    )}
                  />
                </Box>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    App ID<span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="wechat_config.app_id"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="请输入"
                          required
                          fullWidth
                          size="small"
                          InputLabelProps={{
                            shrink: false,
                          }}
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
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    App Secret<span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="wechat_config.app_secret"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="请输入"
                          required
                          fullWidth
                          type={showWechatSecret ? 'text' : 'password'}
                          size="small"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="toggle wechat secret visibility"
                                  onClick={() => setShowWechatSecret(!showWechatSecret)}
                                  onMouseDown={event => event.preventDefault()}
                                  edge="end"
                                  size="small"
                                >
                                  {showWechatSecret ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          InputLabelProps={{
                            shrink: false,
                          }}
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
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    按钮文案
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="wechat_config.button_desc"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="请输入"
                          fullWidth
                          size="small"
                          InputLabelProps={{
                            shrink: false,
                          }}
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
                </Stack>
              </Stack>
            </>
          )}
        </Stack>
      </Box>
    </Card>
  );
};

export default LoginMethod;
