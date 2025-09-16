import {
  getAdminSystemLoginMethod,
  ModelAuth,
  ModelAuthConfig,
  ModelAuthInfo,
  putAdminSystemLoginMethod,
} from '@/api';
import Card from '@/components/card';
import { message } from '@c-x/ui';
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import React, { useState } from 'react';

// 登录方式类型枚举
enum AuthType {
  PASSWORD = 1, // 密码认证
  OIDC = 2, // OIDC认证
  WECHAT = 3, // 企业微信（预留）
}

// 登录方式选项
const AUTH_TYPE_OPTIONS = [
  { label: '密码认证', value: AuthType.PASSWORD },
  { label: 'OIDC', value: AuthType.OIDC },
  { label: '企业微信', value: AuthType.WECHAT, disabled: true }, // 暂不支持
];

const LoginMethod: React.FC = () => {
  const [enableRegister, setEnableRegister] = useState(true);
  const [publicAccess, setPublicAccess] = useState(true);
  const [selectedAuthTypes, setSelectedAuthTypes] = useState<number[]>([AuthType.PASSWORD]);
  const [oidcConfig, setOidcConfig] = useState({
    url: '',
    client_id: '',
    client_secret: '',
    button_text: 'OIDC 登录',
  });

  // 获取当前配置
  const { data, loading } = useRequest(getAdminSystemLoginMethod, {
    onSuccess: res => {
      if (res) {
        const { enable_register, public_access, auth_infos } = res;
        setEnableRegister(enable_register ?? true);
        setPublicAccess(public_access ?? true);

        // 从 auth_infos 中提取认证类型
        const authTypes = auth_infos?.map((info: ModelAuthInfo) => info.type).filter(Boolean) ?? [
          AuthType.PASSWORD,
        ];
        setSelectedAuthTypes(authTypes as number[]);

        // 如果有 OIDC 配置，加载配置信息
        const oidcInfo = auth_infos?.find((info: ModelAuthInfo) => info.type === AuthType.OIDC);
        if (oidcInfo?.config?.oauth) {
          setOidcConfig({
            url: oidcInfo.config.oauth.url ?? '',
            client_id: oidcInfo.config.oauth.client_id ?? '',
            client_secret: oidcInfo.config.oauth.client_secret ?? '',
            button_text: 'OIDC 登录',
          });
        }
      }
    },
    onError: () => {
      message.error('加载登录配置失败');
    },
  });

  const handleSave = async () => {
    try {
      // 验证OIDC配置
      if (selectedAuthTypes.includes(AuthType.OIDC)) {
        if (!oidcConfig.url || !oidcConfig.client_id || !oidcConfig.client_secret) {
          message.error('请完善OIDC配置信息');
          return;
        }
      }

      // 构建认证信息
      const authInfos: ModelAuthInfo[] = selectedAuthTypes.map(type => {
        const authInfo: ModelAuthInfo = { type };

        // 如果选择了OIDC，添加配置
        if (type === AuthType.OIDC) {
          const config: ModelAuthConfig = {
            oauth: {
              url: oidcConfig.url,
              client_id: oidcConfig.client_id,
              client_secret: oidcConfig.client_secret,
            },
          };
          authInfo.config = config;
        }

        return authInfo;
      });

      const requestData: ModelAuth = {
        enable_register: enableRegister,
        public_access: publicAccess,
        auth_infos: authInfos,
      };

      await putAdminSystemLoginMethod(requestData);
      message.success('登录配置保存成功');
    } catch (error) {
      message.error('保存登录配置失败');
      console.error('Save login method config error:', error);
    }
  };

  const handleAuthTypeChange = (event: SelectChangeEvent<number[]>) => {
    const values = event.target.value as number[];
    // 确保至少选择一个认证方式
    if (values.length === 0) {
      message.error('至少需要选择一个登录方式');
      return;
    }
    setSelectedAuthTypes(values);
  };

  const handleRemoveAuthType = (valueToRemove: number) => {
    const newValues = selectedAuthTypes.filter(value => value !== valueToRemove);
    // 确保至少选择一个认证方式
    if (newValues.length === 0) {
      message.error('至少需要选择一个登录方式');
      return;
    }
    setSelectedAuthTypes(newValues);
  };

  const isOidcSelected = selectedAuthTypes.includes(AuthType.OIDC);
  const hasChanges =
    data &&
    (enableRegister !== (data.enable_register ?? true) ||
      publicAccess !== (data.public_access ?? true) ||
      JSON.stringify(selectedAuthTypes.sort()) !==
        JSON.stringify(
          data.auth_infos
            ?.map((info: ModelAuthInfo) => info.type)
            .filter(Boolean)
            .sort() ?? [AuthType.PASSWORD]
        ));

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

      <Stack spacing={3}>
        {/* 用户注册开关 */}
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={enableRegister}
                onChange={e => setEnableRegister(e.target.checked)}
              />
            }
            label="用户注册"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
            选择禁用则前台不提供注册入口
          </Typography>
        </Box>

        {/* 公开访问开关 */}
        <Box>
          <FormControlLabel
            control={
              <Switch checked={publicAccess} onChange={e => setPublicAccess(e.target.checked)} />
            }
            label="公开访问"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
            选择禁用则需要登录才可以访问整个社区；选择启用则默认不登录可以查看，需要登录后才可以发表
          </Typography>
        </Box>

        {/* 登录方式选择 */}
        <FormControl fullWidth>
          <InputLabel>登录方式</InputLabel>
          <Select
            multiple
            value={selectedAuthTypes}
            onChange={handleAuthTypeChange}
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
              <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            至少选择一个，默认密码认证
          </Typography>
        </FormControl>

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
              <TextField
                label="服务器地址"
                placeholder="https://your-oidc-server.com"
                value={oidcConfig.url}
                onChange={e => setOidcConfig(prev => ({ ...prev, url: e.target.value }))}
                required
                fullWidth
                type="url"
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink: !!oidcConfig.url || undefined,
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />

              <TextField
                label="Client ID"
                placeholder="your-client-id"
                value={oidcConfig.client_id}
                onChange={e => setOidcConfig(prev => ({ ...prev, client_id: e.target.value }))}
                required
                fullWidth
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink: !!oidcConfig.client_id || undefined,
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />

              <TextField
                label="Client Secret"
                placeholder="your-client-secret"
                value={oidcConfig.client_secret}
                onChange={e => setOidcConfig(prev => ({ ...prev, client_secret: e.target.value }))}
                required
                fullWidth
                type="password"
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink: !!oidcConfig.client_secret || undefined,
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />

              <TextField
                label="按钮文案"
                placeholder="OIDC 登录"
                value={oidcConfig.button_text}
                onChange={e => setOidcConfig(prev => ({ ...prev, button_text: e.target.value }))}
                fullWidth
                size="small"
                helperText="登录页面显示的按钮文字"
                slotProps={{
                  inputLabel: {
                    shrink: !!oidcConfig.button_text || undefined,
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />

              <Box
                sx={{
                  backgroundColor: '#e8f4fd',
                  border: '1px solid #bbdefb',
                  borderRadius: 1,
                  p: 2,
                  mt: 2,
                }}
              >
                <Typography variant="body2" sx={{ color: '#1565c0', lineHeight: 1.5 }}>
                  <strong>💡 说明：</strong>
                  通过第三方账号首次登录的用户将自动注册账号，默认为普通用户角色
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {/* 保存按钮 */}
        <Box>
          {(hasChanges || isOidcSelected) && (
            <Button variant="contained" color="primary" onClick={handleSave} disabled={loading}>
              保存
            </Button>
          )}
        </Box>
      </Stack>
    </Card>
  );
};

export default LoginMethod;
