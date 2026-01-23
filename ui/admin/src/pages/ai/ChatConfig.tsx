import Card from '@/components/card';
import { Box, FormControlLabel, Radio, RadioGroup, Stack, Typography, Paper, IconButton, Tooltip } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { message } from '@ctzhian/ui';
import { getAdminSystemWebPlugin, putAdminSystemWebPlugin } from '@/api';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import LoadingButton from '@/components/LoadingButton';

interface OriginalState {
  plugin: boolean;
  enabled: boolean;
  display: boolean;
}

const ChatConfig = () => {
  const [plugin, setPlugin] = useState<'enabled' | 'disabled'>('disabled');
  const [enabled, setEnabled] = useState<'enabled' | 'disabled'>('disabled');
  const [display, setDisplay] = useState<'enabled' | 'disabled'>('disabled');
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('');
  const [originalState, setOriginalState] = useState<OriginalState | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // 从API加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await getAdminSystemWebPlugin();
        if (res) {
          const pluginValue = res.plugin ? 'enabled' : 'disabled';
          const enabledValue = res.enabled ? 'enabled' : 'disabled';
          const displayValue = res.display ? 'enabled' : 'disabled';

          setPlugin(pluginValue);
          setEnabled(enabledValue);
          setDisplay(displayValue);

          // 设置原始状态
          setOriginalState({
            plugin: res.plugin || false,
            enabled: res.enabled || false,
            display: res.display || false,
          });
        }
      } catch (error) {
        console.error('加载配置失败:', error);
        message.error('加载配置失败');
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await putAdminSystemWebPlugin({
        plugin: plugin === 'enabled',
        enabled: enabled === 'enabled',
        display: display === 'enabled',
      });

      // 更新原始状态
      setOriginalState({
        plugin: plugin === 'enabled',
        enabled: enabled === 'enabled',
        display: display === 'enabled',
      });

      message.success('配置已保存');
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 检查是否有未保存的更改
  const hasUnsavedChanges = useMemo(() => {
    if (!originalState) return false;

    const pluginChanged = (plugin === 'enabled') !== originalState.plugin;
    const enabledChanged = (enabled === 'enabled') !== originalState.enabled;
    const displayChanged = (display === 'enabled') !== originalState.display;

    return pluginChanged || enabledChanged || displayChanged;
  }, [plugin, enabled, display, originalState]);

  // 生成嵌入代码
  // 注意：这里假设挂件脚本位于根目录下的 customer-service-widget.js
  // 如果实际部署有差异，可能需要调整
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
          minHeight: 40
        }}
      >
        <Typography variant="subtitle2">智能问答</Typography>
        {hasUnsavedChanges && (
          <LoadingButton
            variant="contained"
            size="small"
            loading={loading}
            onClick={handleSave}
          >
            保存
          </LoadingButton>
        )}
      </Stack>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* 在线支持  */}
        <Stack direction="row" alignItems="center">
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

        {/* 网页挂件 */}
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

        {/* 在社区前台展示 */}
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

        {/* 嵌入代码 - 仅当网页挂件开启时显示，或者一直显示但提示开启？
            用户原话：网页挂件启用后，用户嵌入代码后，才能展示挂件的内容，否则不展示。
            通常这并不意味着隐藏代码块，而是代码块有效性的前提。
            参考图片一直显示。 */}
        <Stack direction="row" alignItems="flex-start" sx={{ mt: 1 }}>
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
      </Box>
    </Card>
  );
};

export default ChatConfig;
