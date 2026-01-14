import Card from '@/components/card';
import { Box, Chip, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useState, useEffect } from 'react';
import { message } from '@ctzhian/ui';
import { getAdminSystemWebPlugin, putAdminSystemWebPlugin } from '@/api';

const ChatConfig = () => {
  const [enabled, setEnabled] = useState<'enabled' | 'disabled'>('disabled');
  const [display, setDisplay] = useState<'enabled' | 'disabled'>('disabled');
  const [loading, setLoading] = useState(false);

  // 从API加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await getAdminSystemWebPlugin();
        if (res) {
          setEnabled(res.enabled ? 'enabled' : 'disabled');
          setDisplay(res.display ? 'enabled' : 'disabled');
        }
      } catch (error) {
        console.error('加载配置失败:', error);
        message.error('加载配置失败');
      }
    };
    loadConfig();
  }, []);

  // 保存配置
  const handleEnabledChange = async (value: 'enabled' | 'disabled') => {
    if (loading) return;

    setLoading(true);
    try {
      await putAdminSystemWebPlugin({
        enabled: value === 'enabled',
        display: display === 'enabled',
      });
      setEnabled(value);
      message.success('配置已更新');
    } catch (error) {
      console.error('更新配置失败:', error);
      message.error('更新配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDisplayChange = async (value: 'enabled' | 'disabled') => {
    if (loading) return;

    setLoading(true);
    try {
      await putAdminSystemWebPlugin({
        enabled: enabled === 'enabled',
        display: value === 'enabled',
      });
      setDisplay(value);
      message.success('配置已更新');
    } catch (error) {
      console.error('更新配置失败:', error);
      message.error('更新配置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden', mt: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="subtitle2">智能对话 </Typography>
        <Chip label="Beta" color="primary" size="small" />
      </Stack>

      <Box sx={{ p: 2 }}>
        {/* 启用配置 */}
        {/* <Stack direction="row" alignItems="center">
          <Typography variant="subtitle2" sx={{ minWidth: '24%' }}>
            启用网页挂件
          </Typography>
          <RadioGroup
            row
            value={enabled}
            onChange={(e) => handleEnabledChange(e.target.value as 'enabled' | 'disabled')}
          >
            <FormControlLabel value="disabled" control={<Radio />} label="禁用" />
            <FormControlLabel value="enabled" control={<Radio />} label="启用" />
          </RadioGroup>
        </Stack> */}

        {/* 显示配置 - 暂时隐藏 */}
        <Stack direction="row" alignItems="center">
          <Typography variant="subtitle2" sx={{ minWidth: '24%' }}>
            在线支持
          </Typography>
          <RadioGroup
            row
            value={display}
            onChange={e => handleDisplayChange(e.target.value as 'enabled' | 'disabled')}
          >
            <FormControlLabel value="disabled" control={<Radio />} label="禁用" />
            <FormControlLabel value="enabled" control={<Radio />} label="启用" />
          </RadioGroup>
        </Stack>
      </Box>
    </Card>
  );
};

export default ChatConfig;
