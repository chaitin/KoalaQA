import { ChatType, getAdminChat, getAdminSystemWebPlugin, ModelSuggestQuestionType, putAdminChat, putAdminSystemWebPlugin } from '@/api';
import Card from '@/components/card';
import LoadingButton from '@/components/LoadingButton';
import { message } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LaunchIcon from '@mui/icons-material/Launch';
import { Box, FormControlLabel, IconButton, InputAdornment, InputBase, Link, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import Copy from 'copy-to-clipboard';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type SuggestMode = 'disabled' | 'hot' | 'custom';

const HOT_SUGGEST_QUESTIONS = [
  '如何接入 Webhook？',
  '如何创建应用？',
  '常见问题解答',
];

function inferSuggestMode(questions: string[]): SuggestMode {
  if (!questions || questions.length === 0) return 'disabled';
  const normalized = [...questions].map(s => s.trim()).filter(Boolean);
  if (normalized.length === 0) return 'disabled';
  const hotNormalized = HOT_SUGGEST_QUESTIONS.map(s => s.trim());
  if (normalized.length === hotNormalized.length && normalized.every((q, i) => q === hotNormalized[i])) return 'hot';
  return 'custom';
}

function apiQuestionTypeToSuggestMode(value: ModelSuggestQuestionType | undefined): SuggestMode {
  if (value === ModelSuggestQuestionType.SuggestQuestionTypeDisable) return 'disabled';
  if (value === ModelSuggestQuestionType.SuggestQuestionTypeHot) return 'hot';
  if (value === ModelSuggestQuestionType.SuggestQuestionTypeCustomize) return 'custom';
  return 'disabled';
}

function suggestModeToApiQuestionType(mode: SuggestMode): ModelSuggestQuestionType {
  if (mode === 'disabled') return ModelSuggestQuestionType.SuggestQuestionTypeDisable;
  if (mode === 'hot') return ModelSuggestQuestionType.SuggestQuestionTypeHot;
  return ModelSuggestQuestionType.SuggestQuestionTypeCustomize;
}

interface OriginalState {
  plugin: boolean;
  enabled: boolean;
  display: boolean;
  suggestMode: SuggestMode;
  pluginSuggestMode: SuggestMode;
  suggestQuestions: string[];
  pluginSuggestQuestions: string[];
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
    corp_id: z.string(),
    client_secret: z.string(),
    client_token: z.string(),
    aes_key: z.string(),
    enabled: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) {
      return;
    }

    if (!data.corp_id.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['corp_id'],
      });
    }

    if (!data.client_secret.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['client_secret'],
      });
    }

    if (!data.client_token.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['client_token'],
      });
    }

    if (!data.aes_key.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['aes_key'],
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
  const [suggestMode, setSuggestMode] = useState<SuggestMode>('disabled');
  const [pluginSuggestMode, setPluginSuggestMode] = useState<SuggestMode>('disabled');
  const [suggestQuestions, setSuggestQuestions] = useState<string[]>([]);
  const [pluginSuggestQuestions, setPluginSuggestQuestions] = useState<string[]>([]);
  const [suggestInput, setSuggestInput] = useState('');
  const [pluginSuggestInput, setPluginSuggestInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('');
  const [originalState, setOriginalState] = useState<OriginalState | null>(null);
  const suggestInputRef = useRef<HTMLInputElement | null>(null);
  const pluginSuggestInputRef = useRef<HTMLInputElement | null>(null);

  // Bot Form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
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
        corp_id: '',
        client_secret: '',
        client_token: '',
        aes_key: '',
        enabled: false,
      },
    },
  });

  const dingEnabled = watch('dingBot.enabled');
  const weComEnabled = watch('weComBot.enabled');
  const handleAddSuggest = () => {
    const value = suggestInput.trim();
    if (!value) return;
    if (!suggestQuestions.includes(value)) {
      setSuggestQuestions(prev => [...prev, value]);
    }
    setSuggestInput('');
  };

  const handleAddPluginSuggest = () => {
    const value = pluginSuggestInput.trim();
    if (!value) return;
    if (!pluginSuggestQuestions.includes(value)) {
      setPluginSuggestQuestions(prev => [...prev, value]);
    }
    setPluginSuggestInput('');
  };

  const renderSuggestInput = ({
    placeholder,
    questions,
    inputValue,
    setInputValue,
    onAdd,
    onRemove,
    inputRef,
    keyPrefix,
  }: {
    placeholder: string;
    questions: string[];
    inputValue: string;
    setInputValue: (v: string) => void;
    onAdd: () => void;
    onRemove: (item: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    keyPrefix: string;
  }) => (
    <Box sx={{ flex: 1 }}>
      <Box
        onClick={() => inputRef.current?.focus()}
        sx={{
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 0.75,
          px: 1,
          py: 1,
          minHeight: 44,
          borderRadius: '8px',
          bgcolor: '#f6f8fa',
          cursor: 'text',
          '&:focus-within': {
            border: '1px solid #000',
          },
        }}
      >
        {questions.map(item => (
          <Box
            key={`${keyPrefix}-${item}`}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.35,
              borderRadius: '14px',
              bgcolor: '#ffffff',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                maxWidth: 240,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#161823',
                fontSize: 12,
              }}
            >
              {item}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onRemove(item)}
              sx={{
                width: 12,
                height: 12,
                '&:hover': { bgcolor: '#e9ecef' },
              }}
            >
              ×
            </IconButton>
          </Box>
        ))}
        <InputBase
          inputRef={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={inputValue || questions.length ? '' : placeholder}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          sx={{
            flex: 1,
            minWidth: 200,
            fontSize: 13,
            '& .MuiInputBase-input': {
              p: 0,
              lineHeight: '20px',
              '::placeholder': {
                color: '#9aa0a6',
              },
            },
          }}
        />
      </Box>
    </Box>
  );

  const handleRemoveSuggest = (item: string) => {
    setSuggestQuestions(prev => prev.filter(q => q !== item));
  };

  const handleRemovePluginSuggest = (item: string) => {
    setPluginSuggestQuestions(prev => prev.filter(q => q !== item));
  };

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
          const loadedSuggest = webRes.suggest_questions || [];
          const loadedPluginSuggest = webRes.plugin_suggest_questions || [];
          const loadedSuggestMode =
            webRes.question_type === ModelSuggestQuestionType.SuggestQuestionTypeDisable && loadedSuggest.length > 0
              ? inferSuggestMode(loadedSuggest)
              : apiQuestionTypeToSuggestMode(webRes.question_type);
          const loadedPluginSuggestMode =
            webRes.plugin_question_type === ModelSuggestQuestionType.SuggestQuestionTypeDisable && loadedPluginSuggest.length > 0
              ? inferSuggestMode(loadedPluginSuggest)
              : apiQuestionTypeToSuggestMode(webRes.plugin_question_type);
          setPlugin(webRes.plugin ? 'enabled' : 'disabled');
          setEnabled(webRes.enabled ? 'enabled' : 'disabled');
          setDisplay(webRes.display ? 'enabled' : 'disabled');
          setSuggestMode(loadedSuggestMode);
          setPluginSuggestMode(loadedPluginSuggestMode);
          setSuggestQuestions(loadedSuggest);
          setPluginSuggestQuestions(loadedPluginSuggest);
          setOriginalState({
            plugin: webRes.plugin || false,
            enabled: webRes.enabled || false,
            display: webRes.display || false,
            suggestMode: loadedSuggestMode,
            pluginSuggestMode: loadedPluginSuggestMode,
            suggestQuestions: loadedSuggest,
            pluginSuggestQuestions: loadedPluginSuggest,
          });
        }

        // Load DingBot Config
        const dingRes = await getAdminChat({ type: ChatType.TypeDingtalk });
        const weComRes = await getAdminChat({ type: ChatType.TypeWecomService });

        reset({
          dingBot: {
            client_id: dingRes?.config?.client_id || '',
            client_secret: dingRes?.config?.client_secret || '',
            template_id: dingRes?.config?.template_id || '',
            enabled: dingRes?.enabled || false,
          },
          weComBot: {
            corp_id: weComRes?.config?.corp_id || '',
            client_secret: weComRes?.config?.client_secret || '',
            client_token: weComRes?.config?.client_token || '',
            aes_key: weComRes?.config?.aes_key || '',
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

  const getEffectiveSuggestQuestions = useMemo(() => {
    if (suggestMode === 'disabled') return [];
    if (suggestMode === 'hot') return HOT_SUGGEST_QUESTIONS;
    return (suggestQuestions || []).map(s => s.trim()).filter(Boolean);
  }, [suggestMode, suggestQuestions]);
  const getEffectivePluginSuggestQuestions = useMemo(() => {
    if (pluginSuggestMode === 'disabled') return [];
    if (pluginSuggestMode === 'hot') return HOT_SUGGEST_QUESTIONS;
    return (pluginSuggestQuestions || []).map(s => s.trim()).filter(Boolean);
  }, [pluginSuggestMode, pluginSuggestQuestions]);

  // Check unsaved changes
  const webPluginChanged = useMemo(() => {
    if (!originalState) return false;
    const pluginChanged = (plugin === 'enabled') !== originalState.plugin;
    const enabledChanged = (enabled === 'enabled') !== originalState.enabled;
    const displayChanged = (display === 'enabled') !== originalState.display;
    const suggestModeChanged = suggestMode !== originalState.suggestMode;
    const pluginSuggestModeChanged = pluginSuggestMode !== originalState.pluginSuggestMode;
    const origEffectiveSuggest =
      originalState.suggestMode === 'disabled' ? [] :
        originalState.suggestMode === 'hot' ? HOT_SUGGEST_QUESTIONS :
          (originalState.suggestQuestions || []).map(s => s.trim()).filter(Boolean);
    const origEffectivePluginSuggest =
      originalState.pluginSuggestMode === 'disabled' ? [] :
        originalState.pluginSuggestMode === 'hot' ? HOT_SUGGEST_QUESTIONS :
          (originalState.pluginSuggestQuestions || []).map(s => s.trim()).filter(Boolean);
    const suggestChanged = JSON.stringify(getEffectiveSuggestQuestions) !== JSON.stringify(origEffectiveSuggest);
    const pluginSuggestChanged = JSON.stringify(getEffectivePluginSuggestQuestions) !== JSON.stringify(origEffectivePluginSuggest);
    return pluginChanged || enabledChanged || displayChanged || suggestModeChanged || pluginSuggestModeChanged || suggestChanged || pluginSuggestChanged;
  }, [plugin, enabled, display, suggestMode, pluginSuggestMode, getEffectiveSuggestQuestions, getEffectivePluginSuggestQuestions, originalState]);

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
          question_type: suggestModeToApiQuestionType(suggestMode),
          suggest_questions: getEffectiveSuggestQuestions,
          plugin_suggest_questions: getEffectivePluginSuggestQuestions,
          plugin_question_type: suggestModeToApiQuestionType(pluginSuggestMode),
        });

        setOriginalState({
          plugin: plugin === 'enabled',
          enabled: enabled === 'enabled',
          display: display === 'enabled',
          suggestMode,
          pluginSuggestMode,
          suggestQuestions: getEffectiveSuggestQuestions,
          pluginSuggestQuestions: getEffectivePluginSuggestQuestions,
        });
      }

      // Save Bots if form is dirty and data is provided
      if (isDirty && formData) {
        const promises = [];

        // Save DingBot
        if (dirtyFields.dingBot) {
          promises.push(putAdminChat({
            type: ChatType.TypeDingtalk,
            config: {
              client_id: formData.dingBot.client_id,
              client_secret: formData.dingBot.client_secret,
              template_id: formData.dingBot.template_id,
            },
            enabled: formData.dingBot.enabled,
          }));
        }

        // Save WeComBot
        if (dirtyFields.weComBot) {
          promises.push(putAdminChat({
            type: ChatType.TypeWecomService,
            config: {
              corp_id: formData.weComBot.corp_id,
              client_secret: formData.weComBot.client_secret,
              client_token: formData.weComBot.client_token,
              aes_key: formData.weComBot.aes_key,
            },
            enabled: formData.weComBot.enabled,
          }));
        }

        await Promise.all(promises);

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
          <Typography variant="body2" sx={{ minWidth: '130px', color: 'text.secondary' }}>
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

        <Stack direction="row" alignItems="center" sx={{ pl: 2, mt: 1.5 }}>
          <Typography variant="body2" sx={{ minWidth: '130px', color: 'text.secondary' }}>
            推荐问题
          </Typography>
          <RadioGroup
            row
            value={suggestMode}
            onChange={(e) => setSuggestMode(e.target.value as SuggestMode)}
          >
            <FormControlLabel value="disabled" control={<Radio size="small" />} label={<Typography variant="body2">禁用</Typography>} />
            <FormControlLabel value="hot" control={<Radio size="small" />} label={<Typography variant="body2">使用热门问题</Typography>} />
            <FormControlLabel value="custom" control={<Radio size="small" />} label={<Typography variant="body2">自定义</Typography>} />
          </RadioGroup>
        </Stack>
        {suggestMode === 'custom' && (
          <Stack direction="row" alignItems="flex-start" sx={{ pl: 2, mt: 1.5 }}>
            <Typography variant="body2" sx={{ minWidth: '130px', pt: 1, color: 'text.secondary' }} />
            <Box sx={{ flex: 1 }}>
              {renderSuggestInput({
                placeholder: '回车添加，示例：如何接入Webhook？',
                questions: suggestQuestions,
                inputValue: suggestInput,
                setInputValue: setSuggestInput,
                onAdd: handleAddSuggest,
                onRemove: handleRemoveSuggest,
                inputRef: suggestInputRef,
                keyPrefix: 'support-suggest'
              })}
            </Box>
          </Stack>
        )}

        {/* Section 2: Web Widget */}
        <SectionTitle title="网页挂件" />
        <Stack spacing={2} sx={{ pl: 2 }}>
          <Stack direction="row" alignItems="center">
            <Typography variant="body2" sx={{ minWidth: '130px', color: 'text.secondary' }}>
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
                <Typography variant="body2" sx={{ minWidth: '130px', color: 'text.secondary' }}>
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

              <Stack direction="row" alignItems="center">
                <Typography variant="body2" sx={{ minWidth: '130px', color: 'text.secondary' }}>
                  推荐问题
                </Typography>
                <RadioGroup
                  row
                  value={pluginSuggestMode}
                  onChange={(e) => setPluginSuggestMode(e.target.value as SuggestMode)}
                >
                  <FormControlLabel value="disabled" control={<Radio size="small" />} label={<Typography variant="body2">禁用</Typography>} />
                  <FormControlLabel value="hot" control={<Radio size="small" />} label={<Typography variant="body2">使用热门问题</Typography>} />
                  <FormControlLabel value="custom" control={<Radio size="small" />} label={<Typography variant="body2">自定义</Typography>} />
                </RadioGroup>
              </Stack>
              {pluginSuggestMode === 'custom' && (
                <Stack direction="row" alignItems="flex-start">
                  <Typography variant="body2" sx={{ minWidth: '130px', pt: 1, color: 'text.secondary' }}>

                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    {renderSuggestInput({
                      placeholder: '回车添加，示例：如何快速接入？',
                      questions: pluginSuggestQuestions,
                      inputValue: pluginSuggestInput,
                      setInputValue: setPluginSuggestInput,
                      onAdd: handleAddPluginSuggest,
                      onRemove: handleRemovePluginSuggest,
                      inputRef: pluginSuggestInputRef,
                      keyPrefix: 'plugin-suggest'
                    })}
                  </Box>
                </Stack>
              )}

              <Stack direction="row" alignItems="flex-start">
                <Typography variant="body2" sx={{ minWidth: '130px', pt: 1.5, color: 'text.secondary' }}>
                  嵌入代码
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    value={embedCode}
                    fullWidth
                    size="small"
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" edge="end" onClick={() => {
                            Copy(embedCode)
                            message.success('复制成功')
                          }}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                  />
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
            <Box sx={{ width: 130, flexShrink: 0 }}>
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
              <Box sx={{ width: 130, flexShrink: 0, pt: 1 }}>
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
              <Box sx={{ width: 130, flexShrink: 0, pt: 1 }}>
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
              <Box sx={{ width: 130, flexShrink: 0, pt: 1 }}>
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


        <>
          <SectionTitle title="企业微信客服" />
          <Stack spacing={2} sx={{ pl: 2 }}>
            <Stack direction="row" alignItems="center">
              <Typography variant="body2" sx={{ minWidth: '130px', color: 'text.secondary' }}>
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
                  <Typography variant="body2" sx={{ minWidth: '130px', pt: 1.5, color: 'text.secondary' }}>
                    回调地址
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      value={`${origin}/api/chat/bot/wecom_service`}
                      fullWidth
                      size="small"
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" edge="end" onClick={() => { Copy(`${origin}/api/chat/bot/wecom_service`); message.success('复制成功') }}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                    />
                  </Box>
                </Stack>

                <Stack direction="row" alignItems="flex-start">
                  <Box sx={{ width: 130, flexShrink: 0, pt: 1 }}>
                    <Stack direction="row">
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>企业 ID</Typography>
                      <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                    </Stack>
                  </Box>
                  <TextField
                    {...register('weComBot.corp_id')}
                    placeholder=""
                    fullWidth
                    size="small"
                    error={!!errors.weComBot?.corp_id}
                    helperText={errors.weComBot?.corp_id?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                  />
                </Stack>

                {/* <Stack direction="row" alignItems="flex-start">
                    <Box sx={{ width: 130, flexShrink: 0, pt: 1 }}>
                      <Stack direction="row">
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Agent ID</Typography>
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
                  </Stack> */}


                <Stack direction="row" alignItems="flex-start">
                  <Box sx={{ width: 130, flexShrink: 0, pt: 1 }}>
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
                  <Box sx={{ width: 130, flexShrink: 0, pt: 1 }}>
                    <Stack direction="row">
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Token</Typography>
                      <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                    </Stack>
                  </Box>
                  <TextField
                    {...register('weComBot.client_token')}
                    placeholder=""
                    fullWidth
                    size="small"
                    error={!!errors.weComBot?.client_token}
                    helperText={errors.weComBot?.client_token?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                  />
                </Stack>

                <Stack direction="row" alignItems="flex-start">
                  <Box sx={{ width: 130, flexShrink: 0, pt: 1 }}>
                    <Stack direction="row">
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Encoding Aes Key</Typography>
                      <Typography variant="body2" color="error.main" >*</Typography>
                    </Stack>
                  </Box>
                  <TextField
                    {...register('weComBot.aes_key')}
                    placeholder=""
                    fullWidth
                    size="small"
                    error={!!errors.weComBot?.aes_key}
                    helperText={errors.weComBot?.aes_key?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                  />
                </Stack>
              </>
            )}
          </Stack>
        </>



      </Box>
    </Card >
  );
};

export default ChatConfig;
