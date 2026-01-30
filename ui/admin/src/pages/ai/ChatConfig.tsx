import Card from '@/components/card';
import { Box, FormControlLabel, Radio, RadioGroup, Stack, Typography, Paper, IconButton, Tooltip, Switch, Link, TextField } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { message } from '@ctzhian/ui';
import { getAdminSystemWebPlugin, putAdminSystemWebPlugin, getAdminChat, putAdminChat, ChatType } from '@/api';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import LoadingButton from '@/components/LoadingButton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import LaunchIcon from '@mui/icons-material/Launch';

interface OriginalState {
  plugin: boolean;
  enabled: boolean;
  display: boolean;
}

const dingBotSchema = z
  .object({
    client_id: z.string(),
    client_secret: z.string(),
    template_id: z.string(),
    enabled: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) {
      return;
    }

    if (!data.client_id.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['client_id'],
      });
    }

    if (!data.client_secret.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['client_secret'],
      });
    }

    if (!data.template_id.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['template_id'],
      });
    }
  });

const weComBotSchema = z
  .object({
    client_id: z.string(),
    client_secret: z.string(),
    token: z.string(),
    encoding_aes_key: z.string(),
    enabled: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) {
      return;
    }

    if (!data.client_id.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['client_id'],
      });
    }

    if (!data.client_secret.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['client_secret'],
      });
    }

    if (!data.token.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['token'],
      });
    }

    if (!data.encoding_aes_key.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['encoding_aes_key'],
      });
    }
  });

const formSchema = z.object({
  dingBot: dingBotSchema,
  weComBot: weComBotSchema,
});

type FormData = z.infer<typeof formSchema>;

const SectionTitle = ({ title }: { title: string }) => (
  <Box
    sx={{
      left: 16,
      backgroundColor: 'white',
      display: 'flex',
      alignItems: 'center',
      py: 0,
      fontSize: 14,
      mb: 2,
      mt: 2
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

const ChatConfig = () => {
  // Web Plugin State
  const [plugin, setPlugin] = useState<'enabled' | 'disabled'>('disabled');
  const [enabled, setEnabled] = useState<'enabled' | 'disabled'>('disabled');
  const [display, setDisplay] = useState<'enabled' | 'disabled'>('disabled');
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('');
  const [originalState, setOriginalState] = useState<OriginalState | null>(null);

  // Bot Form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dingBot: {
        client_id: '',
        client_secret: '',
        template_id: '',
        enabled: false,
      },
      weComBot: {
        client_id: '',
        client_secret: '',
        token: '',
        encoding_aes_key: '',
        enabled: false,
      },
    },
  });

  const dingEnabled = watch('dingBot.enabled');
  const weComEnabled = watch('weComBot.enabled');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Load Configs
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Load Web Plugin Config
        const webRes = await getAdminSystemWebPlugin();
        if (webRes) {
          setPlugin(webRes.plugin ? 'enabled' : 'disabled');
          setEnabled(webRes.enabled ? 'enabled' : 'disabled');
          setDisplay(webRes.display ? 'enabled' : 'disabled');
          setOriginalState({
            plugin: webRes.plugin || false,
            enabled: webRes.enabled || false,
            display: webRes.display || false,
          });
        }

        // Load DingBot Config
        const dingRes = await getAdminChat({ type: ChatType.TypeDingtalk });
        const weComRes = await getAdminChat({ type: ChatType.TypeWecom });

        reset({
          dingBot: {
            client_id: dingRes?.config?.client_id || '',
            client_secret: dingRes?.config?.client_secret || '',
            template_id: dingRes?.config?.template_id || '',
            enabled: dingRes?.enabled || false,
          },
          weComBot: {
            client_id: weComRes?.config?.client_id || '',
            client_secret: weComRes?.config?.client_secret || '',
            token: weComRes?.config?.token || '',
            encoding_aes_key: weComRes?.config?.encoding_aes_key || '',
            enabled: weComRes?.enabled || false,
          },
        });
      } catch (error) {
        console.error('加载配置失败:', error);
        message.error('加载配置失败');
      }
    };
    loadConfig();
  }, [reset]);

  // Check unsaved changes
  const webPluginChanged = useMemo(() => {
    if (!originalState) return false;
    const pluginChanged = (plugin === 'enabled') !== originalState.plugin;
    const enabledChanged = (enabled === 'enabled') !== originalState.enabled;
    const displayChanged = (display === 'enabled') !== originalState.display;
    return pluginChanged || enabledChanged || displayChanged;
  }, [plugin, enabled, display, originalState]);

  const hasUnsavedChanges = webPluginChanged || isDirty;

  const handleSave = async (formData?: FormData) => {
    if (loading) return;
    setLoading(true);
    try {
      // Save Web Plugin if changed
      if (webPluginChanged) {
        await putAdminSystemWebPlugin({
          plugin: plugin === 'enabled',
          enabled: enabled === 'enabled',
          display: display === 'enabled',
        });

        // Update original state for Web Plugin
        setOriginalState({
          plugin: plugin === 'enabled',
          enabled: enabled === 'enabled',
          display: display === 'enabled',
        });
      }

      // Save Bots if form is dirty and data is provided
      if (isDirty && formData) {
        // Save DingBot
        await putAdminChat({
          type: ChatType.TypeDingtalk,
          config: {
            client_id: formData.dingBot.client_id,
            client_secret: formData.dingBot.client_secret,
            template_id: formData.dingBot.template_id,
          },
          enabled: formData.dingBot.enabled,
        });

        // Save WeComBot
        await putAdminChat({
          type: ChatType.TypeWecom,
          config: {
            client_id: formData.weComBot.client_id,
            client_secret: formData.weComBot.client_secret,
            token: formData.weComBot.token,
            encoding_aes_key: formData.weComBot.encoding_aes_key,
          },
          enabled: formData.weComBot.enabled,
        });

        reset(formData); // Reset dirty state with new data
      }

      message.success('配置已保存');
    } catch (error: any) {
      console.error('保存配置失败:', error);
      message.error(error.message || '保存配置失败');
    } finally {
      setLoading(false);
    }
  };



  const onSaveClick = () => {
    // If DingBot form is valid, handleSubmit will call the callback.
    // We combine the save logic.
    handleSubmit((data) => handleSave(data))();
  };

  const embedCode = `<script src="${origin}/customer-service-widget.js"></script>`;

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden', mt: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: 42
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2">智能问答</Typography>
          <Link
            sx={{ color: 'info.main', cursor: 'pointer', fontSize: '14px' }}
            href="https://koalaqa.docs.baizhi.cloud/node/019bd432-de7b-7a11-aa5e-ceefbf30f4cd"
            target="_blank"
          >
            文档
            <LaunchIcon sx={{ fontSize: 14, ml: 0.5 }} />
          </Link>
        </Stack>
        {hasUnsavedChanges && (
          <LoadingButton
            variant="contained"
            size="small"
            sx={{ height: 30, my: -1 }}
            loading={loading}
            onClick={onSaveClick}
          >
            保存
          </LoadingButton>
        )}
      </Stack>

      <Box sx={{ p: 2 }}>
        {/* Section 1: Online Support */}
        <SectionTitle title="在线支持" />
        <Stack direction="row" alignItems="center" sx={{ pl: 2 }}>
          <Typography variant="body2" sx={{ minWidth: '120px', color: 'text.secondary' }}>
            在线支持
          </Typography>
          <RadioGroup
            row
            value={enabled}
            onChange={(e) => setEnabled(e.target.value as 'enabled' | 'disabled')}
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
        </Stack>

        {/* Section 2: Web Widget */}
        <SectionTitle title="网页挂件" />
        <Stack spacing={2} sx={{ pl: 2 }}>
          <Stack direction="row" alignItems="center">
            <Typography variant="body2" sx={{ minWidth: '120px', color: 'text.secondary' }}>
              网页挂件
            </Typography>
            <RadioGroup
              row
              value={plugin}
              onChange={(e) => setPlugin(e.target.value as 'enabled' | 'disabled')}
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
          </Stack>

          {plugin === 'enabled' && (
            <>
              <Stack direction="row" alignItems="center">
                <Typography variant="body2" sx={{ minWidth: '120px', color: 'text.secondary' }}>
                  在社区前台展示
                </Typography>
                <RadioGroup
                  row
                  value={display}
                  onChange={(e) => setDisplay(e.target.value as 'enabled' | 'disabled')}
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
              </Stack>

              <Stack direction="row" alignItems="flex-start">
                <Typography variant="body2" sx={{ minWidth: '120px', pt: 1.5, color: 'text.secondary' }}>
                  嵌入代码
                </Typography>
                <Box sx={{ flex: 1, maxWidth: '600px' }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      bgcolor: 'action.hover',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      color: 'text.primary',
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="code"
                      sx={{
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        mr: 2
                      }}
                    >
                      {embedCode}
                    </Typography>
                    <CopyToClipboard text={embedCode} onCopy={() => message.success('复制成功')}>
                      <Tooltip title="复制全部">
                        <IconButton size="small">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CopyToClipboard>
                  </Paper>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                    将此代码添加到您网站的 &lt;body&gt; 标签中即可启用挂件
                  </Typography>
                </Box>
              </Stack>
            </>
          )}
        </Stack>

        {/* Section 3: DingTalk Robot */}
        <SectionTitle title="钉钉机器人" />
        <Stack spacing={2} sx={{ pl: 2 }}>
          <Stack direction="row" alignItems="center">
            <Box sx={{ width: 120, flexShrink: 0 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>钉钉机器人</Typography>
            </Box>
            <RadioGroup
              row
              value={dingEnabled ? 'enabled' : 'disabled'}
              onChange={(e) => {
                setValue('dingBot.enabled', e.target.value === 'enabled', { shouldDirty: true });
              }}
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
          </Stack>

          {dingEnabled && <>
            <Stack direction="row" alignItems="flex-start">
              <Box sx={{ width: 120, flexShrink: 0, pt: 1 }}>
                <Stack direction="row">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Client ID</Typography>
                  <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                </Stack>
              </Box>
              <TextField
                {...register('dingBot.client_id')}
                placeholder=""
                fullWidth
                size="small"
                error={!!errors.dingBot?.client_id}
                helperText={errors.dingBot?.client_id?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
              />
            </Stack>

            <Stack direction="row" alignItems="flex-start">
              <Box sx={{ width: 120, flexShrink: 0, pt: 1 }}>
                <Stack direction="row">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Client Secret</Typography>
                  <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                </Stack>
              </Box>
              <TextField
                {...register('dingBot.client_secret')}
                placeholder=""
                fullWidth
                size="small"
                error={!!errors.dingBot?.client_secret}
                helperText={errors.dingBot?.client_secret?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
              />
            </Stack>

            <Stack direction="row" alignItems="flex-start">
              <Box sx={{ width: 120, flexShrink: 0, pt: 1 }}>
                <Stack direction="row">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Template ID</Typography>
                  <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                </Stack>
              </Box>
              <TextField
                {...register('dingBot.template_id')}
                placeholder="> 钉钉开发平台 > 卡片平台 > 模板列表 > 模板 ID"
                fullWidth
                size="small"
                error={!!errors.dingBot?.template_id}
                helperText={errors.dingBot?.template_id?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
              />
            </Stack>
          </>}
        </Stack>

        <SectionTitle title="企业微信客服" />
        <Stack spacing={2} sx={{ pl: 2 }}>
          <Stack direction="row" alignItems="center">
            <Typography variant="body2" sx={{ minWidth: '120px', color: 'text.secondary' }}>
              企业微信客服
            </Typography>
            <RadioGroup
              row
              value={weComEnabled ? 'enabled' : 'disabled'}
              onChange={(e) => {
                setValue('weComBot.enabled', e.target.value === 'enabled', { shouldDirty: true });
              }}
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
          </Stack>

          {weComEnabled && (
            <>
              <Stack direction="row" alignItems="flex-start">
                <Typography variant="body2" sx={{ minWidth: '120px', pt: 1.5, color: 'text.secondary' }}>
                  回调地址
                </Typography>
                <Box sx={{ flex: 1, maxWidth: '600px' }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      bgcolor: 'action.hover',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      color: 'text.primary',
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="code"
                      sx={{
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        mr: 2,
                        userSelect: 'all',
                      }}
                    >
                      {`${origin}/api/inte/wecom/callback`}
                    </Typography>
                    <CopyToClipboard text={`${origin}/api/inte/wecom/callback`} onCopy={() => message.success('复制成功')}>
                      <Tooltip title="复制">
                        <IconButton size="small">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CopyToClipboard>
                  </Paper>
                </Box>
              </Stack>

              <Stack direction="row" alignItems="flex-start">
                <Box sx={{ width: 120, flexShrink: 0, pt: 1 }}>
                  <Stack direction="row">
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>企业 ID</Typography>
                    <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                  </Stack>
                </Box>
                <TextField
                  {...register('weComBot.client_id')}
                  placeholder=""
                  fullWidth
                  size="small"
                  error={!!errors.weComBot?.client_id}
                  helperText={errors.weComBot?.client_id?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                />
              </Stack>

              <Stack direction="row" alignItems="flex-start">
                <Box sx={{ width: 120, flexShrink: 0, pt: 1 }}>
                  <Stack direction="row">
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Corp Secret</Typography>
                    <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                  </Stack>
                </Box>
                <TextField
                  {...register('weComBot.client_secret')}
                  placeholder=""
                  fullWidth
                  size="small"
                  error={!!errors.weComBot?.client_secret}
                  helperText={errors.weComBot?.client_secret?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                />
              </Stack>

              <Stack direction="row" alignItems="flex-start">
                <Box sx={{ width: 120, flexShrink: 0, pt: 1 }}>
                  <Stack direction="row">
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Token</Typography>
                    <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                  </Stack>
                </Box>
                <TextField
                  {...register('weComBot.token')}
                  placeholder=""
                  fullWidth
                  size="small"
                  error={!!errors.weComBot?.token}
                  helperText={errors.weComBot?.token?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                />
              </Stack>

              <Stack direction="row" alignItems="flex-start">
                <Box sx={{ width: 120, flexShrink: 0, pt: 1 }}>
                  <Stack direction="row">
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Encoding Aes Key</Typography>
                    <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                  </Stack>
                </Box>
                <TextField
                  {...register('weComBot.encoding_aes_key')}
                  placeholder=""
                  fullWidth
                  size="small"
                  error={!!errors.weComBot?.encoding_aes_key}
                  helperText={errors.weComBot?.encoding_aes_key?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                />
              </Stack>
            </>
          )}
        </Stack>


      </Box>
    </Card>
  );
};

export default ChatConfig;
