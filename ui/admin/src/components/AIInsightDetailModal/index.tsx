import Message from '@ctzhian/ui/dist/Message';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getAdminRankAiInsightAiInsightIdDiscussion,
  getAdminRankHotQuestionHotQuestionId,
  postAdminKbKbIdQuestion,
} from '../../api';
import { ModelRankTimeGroupItem } from '../../api/types';
import { useForumStore, useConfigStore } from '../../store';
import EditorWrap, { EditorWrapRef } from '../editor';

// ==================== Types ====================
type InsightCategory = 'knowledgeGap' | 'hotQuestion' | 'invalidKnowledge';

type RelatedQuestionItem = {
  id?: number;
  title: string;
  discussion_id?: string;
  deleted?: boolean;
  forum_id?: number;
};

type QuestionWithPosts = ModelRankTimeGroupItem & {
  category: InsightCategory;
  relatedPosts?: RelatedQuestionItem[];
  clusterTotal?: number;
  parsedExtra?: any;
};

interface InsightData {
  title: string;
  time: string;
  timeStart?: number;
  questions: ModelRankTimeGroupItem[];
  category: InsightCategory;
}

interface AIInsightDetailModalProps {
  open: boolean;
  onClose: () => void;
  insightData?: InsightData;
  onUpdateAssociateId?: (questionId: number, associateId: number) => void;
}

// ==================== Constants ====================
const STYLES = {
  primaryText: '#333',
  secondaryText: '#666',
  selectedBg: '#f0f4ff',
  selectedBorder: '#5c6bc0',
  defaultBg: 'rgb(246 247 250)',
  dividerLine: 'rgb(170 179 210)',
} as const;

const TYPE_LABELS: Record<number, string> = {
  0: '未知类型',
  1: '问答对',
  2: '通用文档',
  3: '知识库',
  4: '在线网页',
};

const DOC_TYPE = {
  question: 1,
  document: 2,
  space: 3,
  web: 4,
} as const;

const DIALOG_BODY_HEIGHT = '70vh';

const EMPTY_CONTENT = '';

// ==================== Custom Hooks ====================
/**
 * 将洞察数据转换为问题列表
 */
function useQuestions(isOpen: boolean, insightData?: InsightData) {
  const [questions, setQuestions] = useState<QuestionWithPosts[]>([]);
  const loadingRef = useRef<Set<string>>(new Set());
  const postsCacheRef = useRef<Map<string, RelatedQuestionItem[]>>(new Map());

  // 初始化问题列表
  useEffect(() => {
    if (!isOpen || !insightData?.questions?.length) {
      setQuestions([]);
      postsCacheRef.current.clear();
      loadingRef.current.clear();
      return;
    }

    // 在初始化时，保留已经更新过的 associate_id
    setQuestions(prev => {
      const convertedQuestions: QuestionWithPosts[] = insightData.questions.map(item => {
        let parsedExtra: any = undefined;
        if (item.extra) {
          try {
            parsedExtra = JSON.parse(item.extra);
          } catch (e) {
            parsedExtra = undefined;
          }
        }
        const presetTotal = (item as any).hit ?? (item as any).score ?? (item as any).count ?? 0;
        // 如果新数据中已经有 associate_id，使用新数据中的值
        if (item.associate_id !== undefined && item.associate_id > 0) {
          return {
            ...item,
            category: insightData.category,
            relatedPosts: [],
            clusterTotal: presetTotal,
            parsedExtra,
          };
        }
        // 如果新数据中没有 associate_id，检查当前 state 中是否有对应的已更新的 associate_id
        const existingQuestion = prev.find(q => q.id === item.id);
        if (existingQuestion?.associate_id !== undefined && existingQuestion.associate_id > 0) {
          return {
            ...item,
            category: insightData.category,
            associate_id: existingQuestion.associate_id,
            relatedPosts: existingQuestion.relatedPosts || [],
            clusterTotal: existingQuestion.clusterTotal ?? presetTotal,
            parsedExtra: existingQuestion.parsedExtra ?? parsedExtra,
          };
        }
        // 否则使用新数据
        return {
          ...item,
          category: insightData.category,
          relatedPosts: [],
          clusterTotal: presetTotal,
          parsedExtra,
        };
      });

      return convertedQuestions;
    });

    postsCacheRef.current.clear();
    loadingRef.current.clear();
  }, [isOpen, insightData]);

  /**
   * 加载问题的关联帖子
   */
  const loadRelatedPosts = useCallback(async (question: QuestionWithPosts) => {
    if (!question?.score_id) return;
    if (question.category === 'invalidKnowledge') return;

    const cacheKey = `${question.category}-${question.score_id}`;

    if (postsCacheRef.current.has(cacheKey)) {
      const cachedPosts = postsCacheRef.current.get(cacheKey) || [];
      setQuestions(prev =>
        prev.map(q => (q.score_id === question.score_id ? { ...q, relatedPosts: cachedPosts } : q))
      );
      return;
    }

    if (loadingRef.current.has(cacheKey)) {
      return;
    }

    loadingRef.current.add(cacheKey);

    try {
      let relatedPosts: RelatedQuestionItem[] = [];
      if (question.category === 'knowledgeGap') {
        const response = await getAdminRankAiInsightAiInsightIdDiscussion({
          aiInsightId: question.id!,
        });
        relatedPosts = (response.items || []).map(item => ({
          id: item.id,
          title: item.title || '无标题',
          discussion_id: item.discussion_id,
          deleted: item.deleted,
          forum_id: question.foreign_id || item.rank_id,
        }));
      } else {
        const hotQuestionId = question.id || question.foreign_id || (question as any)?.rank_id;
        if (!hotQuestionId) {
          console.warn('Hot question id missing, skip loadRelatedPosts');
          loadingRef.current.delete(cacheKey);
          return;
        }
        const response = await getAdminRankHotQuestionHotQuestionId({
          hotQuestionId,
          page: 1,
          size: 50,
        });
        relatedPosts = (response.items || []).map(item => ({
          id: item.id,
          title: item.content || '无标题',
          discussion_id: item.discussion_uuid,
          forum_id: item.id,
        }));
      }

      postsCacheRef.current.set(cacheKey, relatedPosts);
      setQuestions(prev =>
        prev.map(q =>
          q.score_id === question.score_id
            ? {
              ...q,
              relatedPosts,
              clusterTotal: q.clusterTotal ?? relatedPosts.length,
            }
            : q,
        )
      );
    } catch (error) {
      console.error('Failed to load related posts:', error);
      postsCacheRef.current.set(cacheKey, []);
      setQuestions(prev =>
        prev.map(q =>
          q.score_id === question.score_id
            ? {
              ...q,
              relatedPosts: [],
              clusterTotal: q.clusterTotal || 0,
            }
            : q,
        )
      );
    } finally {
      loadingRef.current.delete(cacheKey);
    }
  }, []);

  /**
   * 更新问题的 associate_id
   */
  const updateQuestionAssociateId = useCallback(
    (questionId: number | undefined, associateId: number) => {
      if (questionId === undefined) return;
      setQuestions(prev =>
        prev.map(q => (q.id === questionId ? { ...q, associate_id: associateId } : q))
      );
    },
    []
  );

  return { questions, loadRelatedPosts, updateQuestionAssociateId };
}

/**
 * 处理问答对保存逻辑
 */
function useSaveQA() {
  const [saving, setSaving] = useState(false);
  const { kb_id: currentKbId } = useConfigStore();

  const saveQA = useCallback(
    async (
      title: string,
      content: string,
      scoreId: string,
      associateId?: number,
      aiInsightId?: number
    ) => {
      if (!currentKbId) {
        Message.warning('请先在设置中选择知识库');
        return false;
      }

      if (!title.trim()) {
        Message.warning('请输入标题');
        return false;
      }

      if (!content.trim()) {
        Message.warning('请输入回答内容');
        return false;
      }

      setSaving(true);
      try {
        const requestBody: any = {
          title,
          markdown: content,
          desc: `从AI洞察生成 - ${scoreId}`,
        };
        // 如果 associateId 存在且 > 0，则添加到请求体中（更新操作）
        // 如果不存在或为 0，则不传递，让后端创建新的问答对
        if (associateId !== undefined && associateId !== null && associateId > 0) {
          requestBody.associate_id = associateId;
        }
        // 如果 aiInsightId 存在且 > 0，则添加到请求体中
        if (aiInsightId !== undefined && aiInsightId !== null && aiInsightId > 0) {
          requestBody.ai_insight_id = aiInsightId;
        }
        const response = await postAdminKbKbIdQuestion({ kbId: currentKbId }, requestBody);
        Message.success('问答对保存成功！');
        // 返回创建的问答对 ID（associate_id）
        // 如果请求中已经传了 associate_id 且 > 0，则返回该值（更新操作）
        // 否则返回新创建的 ID（新建操作）
        const createdId = associateId && associateId > 0 ? associateId : response;
        return createdId || true;
      } catch (error) {
        console.error('Failed to save QA pair:', error);
        Message.error('保存失败，请重试');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [currentKbId]
  );

  return { saving, saveQA };
}

// ==================== Sub Components ====================
interface QuestionItemProps {
  question: QuestionWithPosts;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onPostClick: (uuid: string, forumId: number) => void;
}

const QuestionItem: React.FC<QuestionItemProps> = ({
  question,
  index,
  isSelected,
  onSelect,
  onPostClick,
}) => {
  const hasRelatedPosts = (question.relatedPosts?.length ?? 0) > 0;
  const postCount = question.relatedPosts?.length ?? 0;
  const totalCount = question.clusterTotal ?? postCount;
  const iconBg = 'rgba(0,99,151,0.1)';
  const iconColor = 'rgba(0, 99, 151, 1)';

  return (
    <Box
      sx={{
        bgcolor: 'rgba(0, 99, 151, 0.08)',
        borderRadius: 1,
        p: 1.5,
        mb: 1.5,
        transition: 'all 0.3s',
        cursor: 'pointer',
      }}
      onClick={onSelect}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Avatar
          sx={{
            bgcolor: iconBg,
            color: iconColor,
            width: 20,
            height: 20,
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {index + 1}
        </Avatar>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 0.5 }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: 'rgba(0, 99, 151, 1)',
                fontSize: '13px',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {question.score_id || `问题 ${index + 1}`}
            </Typography>

            <ChevronRightIcon
              sx={{
                fontSize: '18px',
                color: STYLES.secondaryText,
                transform: isSelected ? 'rotate(90deg)' : '',
                ml: 1,
              }}
            />
          </Stack>
        </Box>
      </Stack>

      {isSelected && hasRelatedPosts && (
        <>
          {postCount > 0 && (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: STYLES.secondaryText,
                  fontSize: '12px',
                  ml: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                相关帖子
              </Typography>
              <Box
                sx={{
                  color: 'rgba(0, 99, 151, 1)',
                  bgcolor: '#fff',
                  lineHeight: '16px',
                  px: 0.8,
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '2px',
                }}
              >
                {postCount}
              </Box>
            </Stack>
          )}

          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'rgba(255, 255, 255, 0.80)',
              borderRadius: 1,
              boxShadow: '0px 0px 1px 1px rgba(54,59,76,0.03)',
            }}
          >
            <Stack spacing={1}>
              {question.relatedPosts?.map((post, postIndex) => (
                <Typography
                  key={post.discussion_id || `${question.id}-${postIndex}`}
                  variant="caption"
                  onClick={e => {
                    e.stopPropagation();
                    const targetForumId = post.forum_id || question.foreign_id || 0;
                    if (!post.deleted && post.discussion_id) {
                      onPostClick(post.discussion_id, targetForumId);
                    }
                  }}
                  sx={{
                    color: post.deleted ? 'text.disabled' : 'text.secondary',
                    cursor: post.deleted || !post.discussion_id ? 'default' : 'pointer',
                    '&:hover': post.deleted || !post.discussion_id
                      ? {}
                      : {
                        color: STYLES.selectedBorder,
                        textDecoration: 'underline',
                      },
                    '&::before': {
                      content: '"· "',
                      color: STYLES.secondaryText,
                    },
                  }}
                >
                  {post.title || '无标题'}
                </Typography>
              ))}
            </Stack>
          </Paper>
        </>
      )}
    </Box>
  );
};

// ==================== Hot Question List ====================
interface HotQuestionListProps {
  questions: QuestionWithPosts[];
  expandedId?: number;
  onToggle: (id?: number) => void;
  onPostClick: (uuid: string, forumId: number) => void;
  onLoadPosts: (question: QuestionWithPosts) => void;
}

const HotQuestionList: React.FC<HotQuestionListProps> = ({
  questions,
  expandedId,
  onToggle,
  onPostClick,
  onLoadPosts,
}) => {
  return (
    <Stack spacing={1.25}>
      {questions.slice(0, 5).map((q, idx) => {
        const isOpen = expandedId === q.id;
        const count = q.clusterTotal ?? q.relatedPosts?.length ?? 0;

        return (
          <Box
            key={q.id || idx}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid #e5e7eb',
              transition: 'all 0.2s ease',
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{ cursor: 'pointer' }}
              onClick={() => {
                onToggle(q.id || idx);
                if (!q.relatedPosts || q.relatedPosts.length === 0) {
                  onLoadPosts(q);
                }
              }}
            >
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: '12px',
                  bgcolor: '#e5e7eb',
                  color: '#111827',
                  fontWeight: 700,
                }}
              >
                {idx + 1}
              </Avatar>
              <Typography
                variant="body1"
                fontWeight={600}
                sx={{ flex: 1, color: '#111827', lineHeight: 1.5 }}
                noWrap
              >
                {q.score_id || '热门问题'}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#6b7280' }}>
                <Typography variant="body2" sx={{ minWidth: 44, textAlign: 'right', fontWeight: 600 }}>
                  {count} 次
                </Typography>
                <IconButton size="small">
                  <ChevronRightIcon
                    sx={{
                      fontSize: 18,
                      color: '#6b7280',
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Stack>
            </Stack>

            {isOpen && (q.relatedPosts?.length || 0) > 0 && (
              <>
                <Divider sx={{ mt: 2, mx: -2, }} />
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 1.5,
                    py: 0.5,
                    border: 'none',
                    bgcolor: '#fff',
                    boxShadow: 'none'
                  }}
                >
                  <Stack spacing={0.75}>
                    {q.relatedPosts?.slice(0, 5).map((post, i) => (
                      <Typography
                        key={post.discussion_id || `${q.id}-${i}`}
                        variant="body2"
                        onClick={() => {
                          if (post.discussion_id) {
                            onPostClick(post.discussion_id, post.forum_id || q.foreign_id || 0);
                          }
                        }}
                        sx={{
                          cursor: post.discussion_id ? 'pointer' : 'default',
                          // bgcolor: '#f5f7fb',
                          px: 1.15,
                          py: 0.8,
                          borderRadius: 1,
                          border: '1px solid #e6e8ef',
                          '&:hover': post.discussion_id
                            ? { color: '#2563eb', borderColor: '#d3d8e6', backgroundColor: '#eef2fb' }
                            : {},
                        }}
                      >
                        {post.title || '无标题'}
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              </>
            )}
          </Box>
        );
      })}
    </Stack>
  );
};

interface QuestionListProps {
  questions: QuestionWithPosts[];
  selectedId: number | undefined;
  onSelect: (id: number | undefined) => void;
  onPostClick: (uuid: string, forumId: number) => void;
}

const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  selectedId,
  onSelect,
  onPostClick,
}) => {
  return (
    <Stack spacing={0}>
      {questions.map((question, index) => (
        <QuestionItem
          key={question.id ?? index}
          question={question}
          index={index}
          isSelected={question.id === selectedId}
          onSelect={() => {
            console.log('Question clicked:', { id: question.id, score_id: question.score_id });
            onSelect(question.id);
          }}
          onPostClick={onPostClick}
        />
      ))}
    </Stack>
  );
};

interface EditorSectionProps {
  question: QuestionWithPosts | undefined;
  editorRef: React.RefObject<EditorWrapRef | null>;
  editorValue: string;
  titleValue: string;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  saving: boolean;
}

const EditorSection: React.FC<EditorSectionProps> = ({
  question,
  editorRef,
  editorValue,
  titleValue,
  onTitleChange,
  onSave,
  saving,
}) => {
  // 检查是否已经关联过问答对
  const isAssociated = question?.associate_id !== undefined && question.associate_id > 0;

  return (
    <Box sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%', pt: 1 }}>
      {/* Question Input Field */}
      <TextField
        label="标题"
        size="small"
        fullWidth
        value={titleValue}
        onChange={e => onTitleChange(e.target.value)}
        disabled={!question || isAssociated}
        sx={{
          fontSize: '14px',
          mb: 2,
          color: STYLES.primaryText,
        }}
        slotProps={{
          inputLabel: {
            shrink: true,
          },
        }}
      />

      {/* Editor */}
      <Paper
        variant="outlined"
        sx={{
          p: 0,
          flex: 1,
          borderColor: 'divider',
          borderRadius: 1,
          mb: 2,
          overflow: 'auto',
          '& .tiptap': {
            px: 1,
            height: '100%',
            minHeight: '200px',
            overflow: 'auto',
          },
        }}
      >
        {!!editorValue && <EditorWrap
          ref={editorRef}
          value={editorValue}
          placeholder="请输入内容"
          readonly={isAssociated}
          showToolbar={false}
          autoFocus={false}
        />}
      </Paper>

      {/* Save Button or Status Text */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        {isAssociated ? (
          <Typography
            variant="body2"
            sx={{
              color: STYLES.secondaryText,
              fontSize: '14px',
              padding: '8px 0',
            }}
          >
            已保存为问答对
          </Typography>
        ) : (
          <Button
            variant="contained"
            onClick={onSave}
            disabled={saving || !question}
            sx={{
              fontSize: '14px',
              padding: '8px 24px',
              borderRadius: 1,
            }}
          >
            {saving ? <CircularProgress size={16} color="inherit" /> : '保存为问答对进行学习'}
          </Button>
        )}
      </Box>
    </Box>
  );
};

// ==================== Main Component ====================
const AIInsightDetailModal: React.FC<AIInsightDetailModalProps> = ({
  open,
  onClose,
  insightData,
  onUpdateAssociateId,
}) => {
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [editorValue, setEditorValue] = useState<string>(EMPTY_CONTENT);
  const [titleValue, setTitleValue] = useState<string>('');
  const editorRef = useRef<EditorWrapRef>(null);
  const { forums } = useForumStore();
  const { questions, loadRelatedPosts, updateQuestionAssociateId } = useQuestions(
    open,
    insightData
  );
  const { saving, saveQA } = useSaveQA();

  // 当前选中的问题
  const selectedQuestion = useMemo(
    () => questions.find(q => q.id === selectedId),
    [questions, selectedId]
  );

  // 初始化时选择第一个问题
  useEffect(() => {
    if (open && questions.length > 0 && !selectedId) {
      const firstQuestionId = questions[0]?.id;
      console.log('Initializing: setting first question id', firstQuestionId);
      if (firstQuestionId) {
        setSelectedId(firstQuestionId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, questions.length, selectedId]);

  // 使用 ref 跟踪上一次的 selectedId，避免重复加载
  const prevSelectedIdRef = useRef<number | undefined>(undefined);

  // 当选中问题变化时，加载关联帖子并更新编辑器内容
  useEffect(() => {
    if (!open || selectedId === undefined) {
      console.log('useEffect: early return', { open, selectedId });
      prevSelectedIdRef.current = selectedId;
      return;
    }

    // 如果 selectedId 没有变化，不执行
    if (prevSelectedIdRef.current === selectedId) {
      console.log('useEffect: selectedId unchanged', selectedId);
      return;
    }

    if (!selectedQuestion) {
      console.log('useEffect: question not found', selectedId);
      prevSelectedIdRef.current = selectedId;
      return;
    }
    // 更新上一次的 selectedId
    prevSelectedIdRef.current = selectedId;

    // 更新编辑器内容和标题
    const extraContent = selectedQuestion.extra || EMPTY_CONTENT;
    console.log('Setting editor value:', { extraContent, hasExtra: !!selectedQuestion.extra });
    setEditorValue(extraContent);
    setTitleValue(selectedQuestion.score_id || '');

    // 通过 ref 显式设置编辑器内容，确保内容被正确设置
    // 使用 setTimeout 确保编辑器已经初始化完成
    const setEditorContent = () => {
      if (editorRef.current) {
        try {
          editorRef.current.setContent(extraContent);
          console.log('Editor content set via ref:', extraContent);
        } catch (error) {
          console.error('Failed to set editor content via ref:', error);
        }
      }
    };

    // 立即尝试设置，如果编辑器还未准备好，延迟再试
    setTimeout(setEditorContent, 0);
    setTimeout(setEditorContent, 100);

    if (!selectedQuestion.relatedPosts || selectedQuestion.relatedPosts.length === 0) {
      void loadRelatedPosts(selectedQuestion);
    }
  }, [open, selectedId, selectedQuestion, loadRelatedPosts]);

  // 处理帖子详情跳转
  const handlePostClick = useCallback(
    (uuid: string, forumId: number) => {
      const forum = forums.find(f => f.id === forumId);
      if (!forum?.route_name) return;

      const baseUrl =
        process.env.NODE_ENV === 'development'
          ? `${window.location.protocol}//${window.location.hostname}:3000`
          : window.location.origin;

      window.open(`${baseUrl}/${forum.route_name}/${uuid}`, '_blank');
    },
    [forums]
  );

  // 处理保存
  const handleSave = useCallback(async () => {
    if (!selectedQuestion) return;

    // 检查是否已经保存过，防止重复提交
    if (selectedQuestion.associate_id !== undefined && selectedQuestion.associate_id > 0) {
      Message.warning('该问题已保存为问答对，无需重复保存');
      return;
    }

    const content = editorRef.current?.getContent() || '';
    const title = titleValue.trim() || selectedQuestion.score_id || '未命名问题';
    const associateId = selectedQuestion.associate_id;
    const aiInsightId = selectedQuestion.id;
    const result = await saveQA(
      title,
      content,
      selectedQuestion.score_id || '',
      associateId,
      aiInsightId
    );

    if (result) {
      // 更新编辑器内容为保存后的内容
      setEditorValue(content);

      // 如果返回的是数字（associate_id），则更新问题的 associate_id
      if (typeof result === 'number' && result > 0) {
        updateQuestionAssociateId(selectedQuestion.id, result);
        // 通知父组件更新 insightData 中的 associate_id
        if (onUpdateAssociateId && selectedQuestion.id) {
          onUpdateAssociateId(selectedQuestion.id, result);
        }
      }
    }
  }, [selectedQuestion, titleValue, saveQA, updateQuestionAssociateId, onUpdateAssociateId]);

  // 处理关闭
  const handleClose = useCallback(() => {
    setSelectedId(undefined);
    setEditorValue(EMPTY_CONTENT);
    setTitleValue('');
    onClose();
  }, [onClose]);

  if (!open) return null;

  const isHot = insightData?.category === 'hotQuestion';
  const isInvalid = insightData?.category === 'invalidKnowledge';

  if (isInvalid) {
    const timeStart = insightData?.timeStart;

    const parseStartFromSubtitle = (subtitle?: string): dayjs.Dayjs | null => {
      if (!subtitle) return null;
      const match = subtitle.match(/(\d{1,2})月(\d{1,2})日/);
      if (!match) return null;
      const month = Number(match[1]);
      const day = Number(match[2]);
      if (Number.isNaN(month) || Number.isNaN(day)) return null;
      return dayjs().month(month - 1).date(day).startOf('day');
    };

    const buildSubtitle = () => {
      const prefix = '发现知识内容可能已不再准确或适用，建议尽快更新';
      let startDay: dayjs.Dayjs | null = null;

      if (timeStart !== undefined && timeStart !== null) {
        const startValue = typeof timeStart === 'number' && timeStart < 1e12
          ? dayjs.unix(timeStart)
          : dayjs(timeStart);
        if (startValue.isValid()) {
          startDay = startValue.startOf('day');
        }
      }

      if (!startDay) {
        startDay = parseStartFromSubtitle(insightData?.time);
      }

      if (!startDay) {
        return insightData?.time ? `${prefix}·${insightData.time}` : prefix;
      }

      const endDay = startDay.add(1, 'month').startOf('month');
      const startStr = startDay.format('M月D日');
      const endStr = endDay.format('M月D日');
      return `${prefix}·${startStr}-${endStr}`;
    };

    const subtitleText = buildSubtitle();

    return (
      <Box
        sx={{
          p: 3,
          width: '100%',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          height: DIALOG_BODY_HEIGHT,
          maxHeight: DIALOG_BODY_HEIGHT,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            mb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a', fontSize: 18 }}>
              识别疑似失效知识
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitleText}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            sx={{
              flexShrink: 0,
              width: '36px',
              height: '36px',
              color: STYLES.secondaryText,
              '&:hover': { color: STYLES.primaryText, backgroundColor: 'rgba(0,0,0,0.04)' },
            }}
          >
            ×
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', pr: 0.5 }}>
          <Stack spacing={1.5}>
            {questions.map((q, idx) => {
              const extra = q.parsedExtra || {};
              const docTitle = extra.title || q.score_id || '未知文档';
              const docTypeCode = extra.type ?? extra.doc_type;
              const docType = typeof docTypeCode === 'number'
                ? TYPE_LABELS[docTypeCode] || '-'
                : docTypeCode || '-';
              const spaceId = extra.space_id || extra.space || 0;
              const folderId = extra.folder_id || extra.folder || extra.folderId || 0;
              const buildDocLink = () => {
                const base = window.location.origin;
                const encodedTitle = encodeURIComponent(docTitle || '');

                if (docTypeCode === DOC_TYPE.question) {
                  return `${base}/admin/ai/qa?id=1&title=${encodedTitle}`;
                }
                if (docTypeCode === DOC_TYPE.web) {
                  return `${base}/admin/ai/web?id=1&title=${encodedTitle}`;
                }
                if (docTypeCode === DOC_TYPE.space) {
                  const params = new URLSearchParams();
                  if (spaceId) params.set('spaceId', String(spaceId));
                  if (folderId) params.set('folderId', String(folderId));
                  if (docTitle) params.set('title', docTitle);
                  if (!params.get('id')) params.set('id', '1');
                  return `${base}/admin/ai/kb/detail?${params.toString()}`;
                }
                // 默认通用文档
                return `${base}/admin/ai/doc?id=1&title=${encodedTitle}`;
              };
              const updatedAtRaw = extra.updated_at;
              const updatedAt = updatedAtRaw
                ? dayjs(
                  typeof updatedAtRaw === 'number' && updatedAtRaw < 1e12
                    ? updatedAtRaw * 1000
                    : updatedAtRaw,
                ).format('YYYY-MM-DD')
                : '-';
              const downvote =
                extra.dislike_count ??
                extra.dislike ??
                extra.downvote ??
                extra.downvote_count ??
                extra.thumb_down ??
                0;
              const hit =
                extra.hit ??
                extra.hit_count ??
                extra.score ??
                extra.count ??
                0;
              const reason = extra.reason || extra.desc || extra.description || extra.summary || '';

              return (
                <Paper
                  key={q.id || idx}
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #e5e7eb',
                    background: 'linear-gradient(135deg, #f9fbff 0%, #ffffff 100%)',
                    userSelect: 'none',
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                    {docType && docType !== '-' ? (
                      <Chip
                        label={docType}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(37, 99, 235, 0.12)',
                          color: '#1d4ed8',
                          borderRadius: '6px',
                          fontWeight: 700,
                          height: 26,
                          px: 0.5,
                        }}
                      />
                    ) : (
                      <Box sx={{ width: 26 }} />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body1"
                          fontWeight={700}
                          onClick={() => {
                            if (!docTitle) return;
                            const targetUrl = buildDocLink();
                            window.open(targetUrl, '_blank');
                          }}
                          sx={{ flex: 1, color: '#0f172a', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', '&:hover': { textDecorationColor: '#0f172a' } }}
                        >
                          {docTitle}
                        </Typography>
                      </Stack>
                      {reason && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} noWrap>
                          {reason}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={2} mt={1.25} alignItems="center" flexWrap="wrap" rowGap={0.75}>
                    <Typography variant="caption" color="text.secondary">
                      更新时间：{updatedAt}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      点踩：{downvote}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      命中：{hit}
                    </Typography>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      </Box>
    );
  }

  if (isHot) {
    return (
      <Box
        sx={{
          p: 3,
          width: '100%',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          height: DIALOG_BODY_HEIGHT,
          maxHeight: DIALOG_BODY_HEIGHT,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            mb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#2563eb' }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a', fontSize: 18 }}>
                近期热门问题
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {insightData?.time || ''}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            sx={{
              flexShrink: 0,
              width: '36px',
              height: '36px',
              color: STYLES.secondaryText,
              '&:hover': { color: STYLES.primaryText, backgroundColor: 'rgba(0,0,0,0.04)' },
            }}
          >
            ×
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <HotQuestionList
            questions={questions}
            expandedId={selectedId}
            onToggle={id => setSelectedId(id)}
            onPostClick={handlePostClick}
            onLoadPosts={loadRelatedPosts}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        width: '100%',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        height: DIALOG_BODY_HEIGHT,
        maxHeight: DIALOG_BODY_HEIGHT,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              color: STYLES.primaryText,
              fontWeight: 'bold',
              mb: 1,
              fontSize: '18px',
            }}
          >
            {insightData?.category === 'hotQuestion' ? '近期热门问题' : '发现新的知识缺口'}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: STYLES.secondaryText,
              fontSize: '13px',
            }}
          >
            {insightData?.category === 'hotQuestion'
              ? '近期热门讨论问题，帮助快速聚焦当前用户痛点'
              : 'AI 对此类问题理解不足，建议完善知识库资料'}
            ・{insightData?.time || '10月10日~10月16日'}
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          sx={{
            flexShrink: 0,
            width: '44px',
            color: STYLES.secondaryText,
            '&:hover': { color: STYLES.primaryText, backgroundColor: 'rgba(0,0,0,0.04)' },
            padding: '4px',
          }}
        >
          ×
        </IconButton>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left: Question List */}
        <Grid
          size={{ xs: 12, md: 4 }}
          sx={{
            overflow: 'auto',
            maxHeight: '100%',
            pr: 1,
          }}
        >
          <QuestionList
            questions={questions}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPostClick={handlePostClick}
          />
        </Grid>

        {/* Right: Editor */}
        <Grid
          size={{ xs: 12, md: 8 }}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '100%',
            minHeight: 0,
          }}
        >
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <EditorSection
              question={selectedQuestion}
              editorRef={editorRef}
              editorValue={editorValue}
              titleValue={titleValue}
              onTitleChange={setTitleValue}
              onSave={handleSave}
              saving={saving}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIInsightDetailModal;
