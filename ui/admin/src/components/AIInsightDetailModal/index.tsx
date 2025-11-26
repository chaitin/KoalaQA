import Message from '@ctzhian/ui/dist/Message';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { getAdminDiscussion, postAdminKbKbIdQuestion } from '../../api';
import { ModelDiscussionListItem, ModelRankTimeGroupItem } from '../../api/types';
import { useAppSelector } from '../../store';
import EditorWrap from '../editor';

// 知识缺陷数据结构 - 严格还原原型设计
interface Question {
  id: number;
  score_id: string;
  text: string;
  forum_id: number;
  relatedCount: number;
  relatedPosts: ModelDiscussionListItem[];
  subItems?: { text: string; uuid: string }[];
  content: string;
}

interface InsightData {
  title: string;
  time: string;
  questions: ModelRankTimeGroupItem[];
}

interface AIInsightDetailModalProps {
  open: boolean;
  onClose: () => void;
  insightData?: InsightData;
}

// 默认编辑区内容
const defaultContentText = ``;

// 核心 TSX 组件
const AIInsightDetailModal: React.FC<AIInsightDetailModalProps> = ({
  open,
  onClose,
  insightData,
}) => {
  const [selectedId, setSelectedId] = useState<number>(1); // 默认选择第一个问题
  const [questions, setQuestions] = useState<Question[]>([]);
  const [aiAnswer, setAiAnswer] = useState(defaultContentText);
  const [editedAnswer, setEditedAnswer] = useState(defaultContentText);
  const [saving, setSaving] = useState(false);
  // 从 store 获取板块数据
  const { forums: storeForums, loading: storeLoading } = useAppSelector(state => state.forum);
  const [questionPostsCache, setQuestionPostsCache] = useState<
    Map<string, ModelDiscussionListItem[]>
  >(new Map());
  const [aiAnswerCache, setAiAnswerCache] = useState<Map<string, string>>(new Map());
  const [processedQuestions, setProcessedQuestions] = useState<Set<string>>(new Set());
  const currentKbId = useAppSelector(state => state.config.kb_id);

  // 严格还原原型图的颜色和样式
  const primaryTextColor = '#333';
  const secondaryTextColor = '#666';
  const selectedBgColor = '#f0f4ff'; // 浅蓝色选中背景
  const selectedBorderColor = '#5c6bc0'; // 选中边框色

  // 将洞察数据转换为问题列表
  useEffect(() => {
    if (open && insightData) {
      const convertedQuestions: Question[] = insightData.questions.map((item, index) => ({
        id: index + 1, // 手动创建唯一id，从1开始
        score_id: item.score_id || `question_${index}`,
        forum_id: item.foreign_id || 0,
        text: item.score_id || `问题 ${index + 1}`,
        relatedCount: 0,
        relatedPosts: [],
        content: item.extra || '',
      }));

      setQuestions(convertedQuestions);

      if (convertedQuestions.length > 0) {
        setSelectedId(1); // 选择第一个问题的手动创建的id
        // 自动加载第一个问题的数据
        fetchQuestionCompleteData(convertedQuestions[0].score_id, convertedQuestions[0].forum_id);
      }
    }
  }, [open, insightData]);
  const goPostDetail = (uuid: string, forum_id: number) => () => {
    const forum_name = storeForums.find(item => item.id === forum_id)?.route_name;
    if (!forum_name) return;
    if (process.env.NODE_ENV === 'development') {
      window.open(
        `${window.location.protocol}//${window.location.hostname}:3000/${forum_name}/${uuid}`,
        '_blank'
      );
    } else {
      window.open(`${window.location.origin}/${forum_name}/${uuid}`, '_blank');
    }
  };
  // 获取问题的完整数据
  const fetchQuestionCompleteData = useCallback(
    async (questionScoreId: string, forum_id: number) => {
      // 如果已经处理过这个问题，直接从缓存中获取数据
      if (processedQuestions.has(questionScoreId)) {
        const cachedPosts = questionPostsCache.get(questionScoreId) || [];

        // 更新问题状态（如果需要）
        setQuestions(prev =>
          prev.map(q =>
            q.score_id === questionScoreId
              ? {
                  ...q,
                  relatedCount: cachedPosts.length,
                  relatedPosts: cachedPosts,
                  subItems: cachedPosts.map(post => ({
                    text: post.title || '',
                    uuid: post.uuid || '',
                  })),
                }
              : q
          )
        );

        return;
      }

      try {
        // 获取关联帖子和AI回答
        const response = await getAdminDiscussion({
          ai: true,
          forum_id,
          keyword: questionScoreId,
          page: 1,
          size: 10,
        });

        const relatedPosts = response?.items || [];
        // 更新帖子缓存
        setQuestionPostsCache(prev => new Map(prev.set(questionScoreId, relatedPosts)));

        // 更新问题的关联计数和帖子数据
        setQuestions(prev =>
          prev.map(q =>
            q.score_id === questionScoreId
              ? {
                  ...q,
                  relatedCount: relatedPosts.length,
                  relatedPosts,
                  subItems: relatedPosts.map(post => ({
                    text: post.title || '',
                    uuid: post.uuid || '',
                  })),
                }
              : q
          )
        );

        // 标记问题为已处理
        setProcessedQuestions(prev => new Set(prev).add(questionScoreId));
      } catch (error) {
        // 即使出错也要设置默认值，并标记为已处理以避免重复请求
        setProcessedQuestions(prev => new Set(prev).add(questionScoreId));
      }
    },
    [processedQuestions, questionPostsCache, aiAnswerCache, questions]
  );

  const handleQuestionSelect = (questionId: number) => {
    setSelectedId(questionId);
    const question = questions.find(q => q.id === questionId);
    if (question) {
      fetchQuestionCompleteData(question.score_id, question.forum_id);
    }
  };

  const handleSave = async () => {
    if (!selectedQuestion) return;

    if (!currentKbId) {
      Message.warning('请先在设置中选择知识库');
      return;
    }

    setSaving(true);
    try {
      // 调用创建问答对的API
      await postAdminKbKbIdQuestion(
        { kbId: currentKbId },
        {
          title: selectedQuestion.text,
          markdown: editedAnswer,
          desc: `从AI洞察生成 - ${selectedQuestion.score_id}`,
        }
      );

      // 更新AI回答缓存
      setAiAnswerCache(prev => new Map(prev.set(selectedQuestion.score_id, editedAnswer)));

      // 更新当前显示的回答
      setAiAnswer(editedAnswer);

      Message.success('问答对保存成功！');
    } catch (error) {
      console.error('Failed to save QA pair:', error);
      Message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedAnswer(aiAnswer);
  };

  const handleClose = () => {
    setQuestions([]);
    setAiAnswer(defaultContentText);
    setQuestionPostsCache(new Map());
    setAiAnswerCache(new Map());
    setProcessedQuestions(new Set());
    onClose();
  };
  useEffect(() => {
    const currentQuestion = questions?.find(q => q.id === selectedId);
    const answerContent = currentQuestion?.content || defaultContentText;
    setAiAnswer(answerContent);
    setEditedAnswer(answerContent);
  }, [selectedId, questions]);
  const selectedQuestion = questions.find(q => q.id === selectedId);

  if (!open) return null;

  return (
    <Box
      sx={{
        p: 2,
        width: '100%',
        border: '1px solid #ccc',
        backgroundColor: '#fff',
      }}
    >
      {/* 顶部标题和时间 */}
      <Box sx={{ mb: 2, borderBottom: '1px solid #eee', pb: 1 }}>
        <Typography variant="h6" sx={{ display: 'inline', color: primaryTextColor }}>
          发现新的知识缺陷
        </Typography>
        <Typography variant="body2" sx={{ display: 'inline', ml: 2, color: secondaryTextColor }}>
          {insightData?.time || '10月10日 - 10月16日'}
        </Typography>
        {/* 关闭按钮 */}
        <Box
          sx={{
            float: 'right',
            cursor: 'pointer',
            color: secondaryTextColor,
            fontSize: '20px',
            fontWeight: 'bold',
            '&:hover': { color: primaryTextColor },
          }}
          onClick={handleClose}
        >
          &times;
        </Box>
      </Box>

      {/* AI 提示 */}
      <Typography variant="body2" sx={{ mb: 2, color: secondaryTextColor }}>
        AI 对此类问题理解不足，建议前往知识学习完善相关资料
      </Typography>

      {/* 主体内容布局：左右两栏 */}
      <Grid container spacing={3}>
        {/* 左侧：问题列表/导航 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <List component="nav" disablePadding>
            {questions.map((item, index) => (
              <React.Fragment key={item.id}>
                {/* 主问题项 */}
                <ListItem
                  disablePadding
                  sx={{
                    my: 1,
                    mt: index == 0 ? 0 : 1,
                    ...(item.id === selectedId
                      ? {
                          // 选中状态样式
                          border: '1px solid #ccc',
                          backgroundColor: selectedBgColor,
                          borderLeft: `4px solid ${selectedBorderColor}`,
                          borderRadius: '8px',
                          position: 'relative',
                          zIndex: 2,
                        }
                      : {
                          // 非选中状态样式
                          backgroundColor: 'rgb(246 247 250)',
                          borderLeft: 'none',
                          position: 'relative',
                          zIndex: 1,
                          borderRadius: '8px',
                        }),
                  }}
                >
                  <ListItemButton
                    onClick={() => handleQuestionSelect(item.id)}
                    sx={{
                      py: 0.5,
                      px: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: item.id === selectedId ? selectedBorderColor : '#ccc',
                        color: item.id === selectedId ? 'white' : 'text.main',
                        textAlign: 'center',
                        lineHeight: '24px',
                        fontSize: '14px',
                        mr: 1,
                      }}
                    >
                      {index+1}
                    </Box>
                    <ListItemText
                      primary={item.text}
                      slotProps={{
                        primary: {
                          fontSize: '13px',
                          color: primaryTextColor,
                          fontWeight: item.id === selectedId ? 'bold' : 'normal',
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>

                {/* 关联子项 */}
                {item.id === selectedId && item.subItems && item.subItems.length > 0 && (
                  <Box
                    sx={{
                      p: 1,
                      pb: 2,
                      pl: 4,
                      color: secondaryTextColor,
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: '18px',
                        top: '8px',
                        bottom: '8px',
                        width: '2px',
                        borderRadius: '4px',
                        backgroundColor: 'rgb(170 179 210)',
                        zIndex: 1,
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        相关帖子
                      </Typography>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: selectedBgColor,
                          color: selectedBorderColor,
                          textAlign: 'center',
                          lineHeight: '24px',
                          fontWeight: 'bold',
                          mr: 1,
                        }}
                      >
                        {item.relatedCount}
                      </Box>
                    </Stack>
                    <Stack spacing={2} sx={{ pl: 2, pt: 2, color: 'text.main' }}>
                      {item.subItems.map((sub, index) => (
                        <Button
                          key={index}
                          variant="outlined"
                          size="small"
                          onClick={goPostDetail(sub.uuid, item.forum_id)}
                          sx={{
                            justifyContent: 'flex-start',
                            borderColor: 'divider',
                            fontSize: '12px',
                          }}
                        >
                          {sub.text}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                )}
              </React.Fragment>
            ))}
          </List>
        </Grid>

        {/* 右侧：内容编辑区 */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ p: 0 }}>
            {/* 右侧标题和按钮 */}
            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: primaryTextColor }}>
                {selectedQuestion ? selectedQuestion.text : '请选择一个问题'}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={saving}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    padding: '6px 12px',
                  }}
                >
                  取消
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving || !editedAnswer.trim()}
                  sx={{
                    backgroundColor: selectedBorderColor,
                    '&:hover': { backgroundColor: selectedBorderColor },
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    padding: '6px 12px',
                  }}
                >
                  {saving ? <CircularProgress size={16} color="inherit" /> : '保存为问答对进行学习'}
                </Button>
              </Stack>
            </Stack>

            {/* 模拟编辑区 */}
            <Paper
              variant="outlined"
              sx={{
                p: 0,
                minHeight: '240px',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <EditorWrap value={editedAnswer} onChange={setEditedAnswer} />
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIInsightDetailModal;
