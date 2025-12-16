import { getAdminModelList, ModelLLM, ModelLLMType, putAdminModelIdActive } from '@/api';
import Card from '@/components/card';
import { addOpacityToColor } from '@/utils';
import { ModelModal } from '@ctzhian/modelkit';
import { message } from '@ctzhian/ui';
import { Box, Button, CircularProgress, Stack, Switch, useTheme } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { modelService } from './services/modelService';

const model = Object.values(ModelLLMType);

interface ModelConfig {
  key: ModelLLMType;
  title: string;
  description: string;
  isInUse: boolean;
  isRequired: boolean;
}

interface ModelManagementModalProps {
  open: boolean;
  mandatory?: boolean;
  onClose?: () => void;
  onConfigured?: () => void;
}

const ModelManagementModal = ({
  open,
  mandatory = false,
  onConfigured,
}: ModelManagementModalProps) => {
  const theme = useTheme();
  const [editData, setEditData] = useState<ModelLLM | null>(null);
  const [modelList, setModelList] = useState<ModelLLM[]>([]);
  const [activeLoadingMap, setActiveLoadingMap] = useState<Record<string, boolean>>({});

  // 模型配置数组
  const modelConfigs = useMemo<ModelConfig[]>(() => {
    const configs: ModelConfig[] = [
      {
        key: ModelLLMType.LLMTypeChat,
        title: '智能对话模型',
        description: '在机器人回答、智能总结、AI 洞察等场景使用',
        isInUse: modelList.some(item => item.type === ModelLLMType.LLMTypeChat),
        isRequired: true,
      },
      {
        key: ModelLLMType.LLMTypeEmbedding,
        title: '向量模型',
        description: '在知识库学习、发帖、机器人回答、智能搜索、AI 洞察等场景使用',
        isInUse: modelList.some(item => item.type === ModelLLMType.LLMTypeEmbedding),
        isRequired: true,
      },
      {
        key: ModelLLMType.LLMTypeRerank,
        title: '重排序模型',
        description: '在机器人回答、智能搜索、相似帖、AI 洞察等场景',
        isInUse: modelList.some(item => item.type === ModelLLMType.LLMTypeRerank),
        isRequired: true,
      },
      {
        key: ModelLLMType.LLMTypeAnalysis,
        title: '文档分析模型',
        description: '提升文档分析能力，启用后机器人回答等效果会得到加强',
        isInUse: modelList.some(item => item.type === ModelLLMType.LLMTypeAnalysis),
        isRequired: false,
      },
      {
        key: ModelLLMType.LLMTypeAnalysisVL,
        title: '图像分析模型',
        description: '提升图片识别分析能力，启用后机器人回答等效果会得到加强',
        isInUse: modelList.some(item => item.type === ModelLLMType.LLMTypeAnalysisVL),
        isRequired: false,
      },
    ];
    return configs;
  }, [modelList]);

  const getModel = useCallback(() => {
    getAdminModelList().then(res => {
      const filteredModels = res.filter(item => model.includes(item.type as any));
      setModelList(filteredModels);
      // 如果已经有配置的模型，且是强制模式，则调用onConfigured回调
      if (mandatory && filteredModels.length > 0 && onConfigured) {
        onConfigured();
      }
    });
  }, [mandatory, onConfigured]);

  useEffect(() => {
    getModel();
  }, [getModel]);
  const handleRefresh = () => {
    getModel();
  };

  if (!open) return null;

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
        {modelConfigs.map(config => {
          const item = modelList.find(item => item.type === config.key);
          const itemIdNum = item?.id;
          const itemId = itemIdNum != null ? String(itemIdNum) : '';
          const isLoading = itemId ? !!activeLoadingMap[itemId] : false;
          const isActive = item?.is_active ?? true;
          return (
            <Card
              key={config.key}
              sx={{ border: '1px solid', px: 2, py: 1, borderColor: 'divider' }}
            >
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
                gap={1}
                sx={{ mt: 1 }}
              >
                <Stack spacing={1}>
                  <Stack direction={'row'} alignItems={'center'} gap={1} sx={{ flexGrow: 1 }}>
                    <Box
                      sx={{
                        fontSize: 14,
                        lineHeight: '20px',
                        color: 'text.main',
                      }}
                    >
                      {config.title}
                    </Box>
                    <Box
                      sx={{
                        fontSize: 12,
                        px: 1,
                        lineHeight: '20px',
                        borderRadius: '10px',
                        bgcolor: config.isRequired
                          ? addOpacityToColor(theme.palette.info.main, 0.1)
                          : addOpacityToColor(theme.palette.primary.main, 0.1),
                        color: config.isRequired ? 'info.main' : 'primary.main',
                        textTransform: 'capitalize',
                      }}
                    >
                      {config.isRequired ? '必选' : '可选'}
                    </Box>
                    {[ModelLLMType.LLMTypeAnalysisVL, ModelLLMType.LLMTypeAnalysis].includes(
                      config.key
                    ) && (
                      <Stack direction="row" alignItems="center" gap={0.5} sx={{ ml: 0.5 }}>
                        {isLoading ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Switch
                            size="small"
                            checked={!!item && !!isActive}
                            disabled={!itemId || isLoading}
                            onChange={async (_, checked) => {
                              if (itemIdNum == null) {
                                message.error('请先配置模型');
                                return;
                              }
                              const prev = isActive;
                              // 乐观更新
                              setModelList(list =>
                                list.map(m =>
                                  m.id === itemIdNum ? { ...m, is_active: checked } : m
                                )
                              );
                              setActiveLoadingMap(m => ({ ...m, [itemId]: true }));
                              try {
                                await putAdminModelIdActive({ id: itemIdNum }, { active: checked });
                                message.success(checked ? '已启用' : '已禁用');
                                getModel();
                              } catch {
                                // 回滚
                                setModelList(list =>
                                  list.map(m =>
                                    m.id === itemIdNum ? { ...m, is_active: prev } : m
                                  )
                                );
                                message.error('操作失败');
                              } finally {
                                setActiveLoadingMap(m => ({ ...m, [itemId]: false }));
                              }
                            }}
                          />
                        )}
                      </Stack>
                    )}
                  </Stack>
                  <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{config.description}</Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  {item ? (
                    <>
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
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setEditData(item);
                        }}
                      >
                        修改
                      </Button>
                    </>
                  ) : (
                    <>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: config.isRequired
                            ? addOpacityToColor(theme.palette.error.main, 0.1)
                            : addOpacityToColor(theme.palette.primary.main, 0.1),
                          color: config.isRequired ? 'error.main' : 'primary.main',
                        }}
                      >
                        {config.isRequired ? '必填模型' : '可选模型'}
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setEditData({ type: config.key } as ModelLLM);
                        }}
                      >
                        配置
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>
            </Card>
          );
        })}
      </Stack>

      <ModelModal
        open={!!editData}
        onClose={() => {
          setEditData(null);
        }}
        refresh={handleRefresh}
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

export default ModelManagementModal;
