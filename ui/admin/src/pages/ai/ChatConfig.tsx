import Card from '@/components/card';
import { Box, FormControlLabel, Radio, RadioGroup, Stack, Typography, Paper, IconButton, Tooltip, Switch, Link, TextField } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { message } from '@ctzhian/ui';
import { getAdminSystemWebPlugin, putAdminSystemWebPlugin, getAdminChat, putAdminChat } from '@/api';
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

const dingBotSchema = z.object({
  client_id: z.string().min(1, '必填'),
  client_secret: z.string().min(1, '必填'),
  template_id: z.string().min(1, '必填'),
  enabled: z.boolean(),
});

type DingBotFormData = z.infer<typeof dingBotSchema>;

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

  // DingBot Form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<DingBotFormData>({
    resolver: zodResolver(dingBotSchema),
    defaultValues: {
      client_id: '',
      client_secret: '',
      template_id: '',
      enabled: false,
    },
  });

  const dingEnabled = watch('enabled');

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
        const chatRes = await getAdminChat();
        if (chatRes) {
          reset({
            client_id: chatRes.config?.client_id || '',
            client_secret: chatRes.config?.client_secret || '',
            template_id: chatRes.config?.template_id || '',
            enabled: chatRes.enabled || false,
          });
        }
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

  const handleSave = async (dingData?: DingBotFormData) => {
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

      // Save DingBot if form is dirty and data is provided
      if (isDirty && dingData) {
        await putAdminChat({
          config: {
            client_id: dingData.client_id,
            client_secret: dingData.client_secret,
            template_id: dingData.template_id,
          },
          enabled: dingData.enabled,
        });
        reset(dingData); // Reset dirty state with new data
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
        <Box sx={{ borderTop: '1px dashed #e0e0e0', my: 2 }} />
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
        <Box sx={{ borderTop: '1px dashed #e0e0e0', my: 2 }} />
        <SectionTitle title="钉钉机器人" />
        <Stack spacing={2} sx={{ pl: 2 }}>
          <Stack direction="row" alignItems="center">
            <Box sx={{ width: 120, flexShrink: 0 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>开启</Typography>
            </Box>
            <Switch
              checked={dingEnabled}
              onChange={(e) => {
                setValue('enabled', e.target.checked, { shouldDirty: true });
              }}
              size="small"
              sx={{ mr: 'auto' }}
            />
          </Stack>

          <Stack direction="row" alignItems="flex-start">
            <Box sx={{ width: 120, flexShrink: 0, pt: 1 }}>
              <Stack direction="row">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Client ID</Typography>
                <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
              </Stack>
            </Box>
            <TextField
              {...register('client_id')}
              placeholder=""
              fullWidth
              size="small"
              error={!!errors.client_id}
              helperText={errors.client_id?.message}
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
              {...register('client_secret')}
              placeholder=""
              fullWidth
              size="small"
              error={!!errors.client_secret}
              helperText={errors.client_secret?.message}
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
              {...register('template_id')}
              placeholder="> 钉钉开发平台 > 卡片平台 > 模板列表 > 模板 ID"
              fullWidth
              size="small"
              error={!!errors.template_id}
              helperText={errors.template_id?.message}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
            />
          </Stack>
        </Stack>
      </Box>
    </Card>
  );
};

export default ChatConfig;
