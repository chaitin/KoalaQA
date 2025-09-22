import { getAdminModelList, ModelLLM, ModelLLMType } from '@/api';
import ErrorJSON from '@/assets/json/error.json';
import Card from '@/components/card';
import LottieIcon from '@/components/lottieIcon';
import { useAppDispatch, useAppSelector } from '@/store';
import { addOpacityToColor } from '@/utils';
import { message } from '@c-x/ui';
import { Box, Button, Stack, useTheme } from '@mui/material';
import { DEFAULT_MODEL_PROVIDERS, ModelModal } from '@ctzhian/modelkit';
import { Icon } from 'ct-mui';
import { useEffect, useState } from 'react';
import { modelService } from './services/modelService';

const model = Object.values(ModelLLMType);
const Settings = () => {
  const theme = useTheme();
  const { user } = useAppSelector(state => state.config);
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const [editData, setEditData] = useState<ModelLLM | null>(null);
  const [modelList, setModelList] = useState<ModelLLM[]>([]);
  const getModel = () => {
    getAdminModelList().then(res => {
      setModelList(res.filter(item => model.includes(item.type as any)));
    });
  };

  useEffect(() => {
    getModel();
  }, []);

  return (
    <>
      <Stack
        component={Card}
        spacing={3}
        sx={{
          flex: 1,
          p: 2,
          overflow: 'hidden',
          overflowY: 'auto',
        }}
      >
        {model.map(key => {
          const item = modelList.find(item => item.type === key);
          return (
            <Card key={key} sx={{ border: '1px solid', borderColor: 'divider' }}>
              {!item ? (
                <>
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={1}
                    sx={{
                      fontSize: 14,
                      lineHeight: '24px',
                      fontWeight: 'bold',
                      minWidth: '300px',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ textTransform: 'capitalize' }}>{key} 模型</Box>
                    <Stack
                      alignItems={'center'}
                      justifyContent={'center'}
                      sx={{
                        width: 22,
                        height: 22,
                        cursor: 'pointer',
                      }}
                    >
                      <LottieIcon id="warning" src={ErrorJSON} style={{ width: 20, height: 20 }} />
                    </Stack>
                    <Box sx={{ color: 'error.main' }}>
                      未配置无法使用，如果没有可用模型，可参考&nbsp;
                      <Box
                        component={'a'}
                        sx={{ color: 'primary.main', cursor: 'pointer' }}
                        href="https://pandawiki.docs.baizhi.cloud/node/01973ffe-e1bc-7165-9a71-e7aa461c05ea"
                        target="_blank"
                      >
                        文档
                      </Box>
                    </Box>
                  </Stack>
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    justifyContent={'center'}
                    sx={{ my: '0px', ml: 2, fontSize: 14 }}
                  >
                    <Box sx={{ height: '20px', color: 'text.auxiliary' }}>尚未配置，</Box>
                    <Button
                      sx={{ minWidth: 0, px: 0, height: '20px' }}
                      onClick={() => {
                        setOpen(true);
                        setEditData(item ? item : { type: key });
                      }}
                    >
                      去添加
                    </Button>
                  </Stack>
                </>
              ) : (
                <>
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    justifyContent={'space-between'}
                    gap={1}
                    sx={{ mt: 1 }}
                  >
                    <Stack direction={'row'} alignItems={'center'} gap={1} sx={{ flexGrow: 1 }}>
                      <Icon
                        type={
                          DEFAULT_MODEL_PROVIDERS[
                            item.provider as keyof typeof DEFAULT_MODEL_PROVIDERS
                          ].icon
                        }
                        sx={{ fontSize: 18 }}
                      />
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          color: 'text.auxiliary',
                        }}
                      >
                        {DEFAULT_MODEL_PROVIDERS[
                          item.provider as keyof typeof DEFAULT_MODEL_PROVIDERS
                        ].cn ||
                          DEFAULT_MODEL_PROVIDERS[
                            item.provider as keyof typeof DEFAULT_MODEL_PROVIDERS
                          ].label ||
                          '其他'}
                        &nbsp;&nbsp;/
                      </Box>
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          fontFamily: 'Gbold',
                          ml: -0.5,
                        }}
                      >
                        {item.model}
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                          textTransform: 'capitalize',
                        }}
                      >
                        {item.type} 模型
                      </Box>
                    </Stack>
                    <Box
                      sx={{
                        fontSize: 12,
                        px: 1,
                        lineHeight: '20px',
                        borderRadius: '10px',
                        bgcolor: addOpacityToColor(theme.palette.success.main, 0.1),
                        color: 'success.main',
                      }}
                    >
                      状态正常
                    </Box>
                    {item && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setOpen(true);
                          setEditData(item);
                        }}
                      >
                        修改
                      </Button>
                    )}
                  </Stack>
                </>
              )}
            </Card>
          );
        })}
      </Stack>

      <ModelModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditData(null);
        }}
        refresh={getModel}
        data={
          editData?.id ? { ...editData, id: editData?.id + '', model_name: editData?.model } : null
        }
        model_type={editData?.type || ''}
        modelService={modelService}
        language="zh-CN"
        messageComponent={message}
        is_close_model_remark={true}
      />
    </>
  );
};
export default Settings;
