import Message from '@ctzhian/ui/dist/Message';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAdminDiscussion, postAdminKbKbIdQuestion } from '../../api';
import { ModelDiscussionListItem, ModelRankTimeGroupItem } from '../../api/types';
import { useForumStore, useConfigStore } from '../../store';
import EditorWrap, { EditorWrapRef } from '../editor';

// ==================== Types ====================
type QuestionWithPosts = ModelRankTimeGroupItem & {
  relatedPosts?: ModelDiscussionListItem[];
};

interface InsightData {
  title: string;
  time: string;
  questions: ModelRankTimeGroupItem[];
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

const EMPTY_CONTENT = '';

// ==================== Custom Hooks ====================
/**
 * 将洞察数据转换为问题列表
 */
function useQuestions(isOpen: boolean, insightData?: InsightData) {
  const [questions, setQuestions] = useState<QuestionWithPosts[]>([]);
  const loadingRef = useRef<Set<string>>(new Set());
  const postsCacheRef = useRef<Map<string, ModelDiscussionListItem[]>>(new Map());

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
        // 如果新数据中已经有 associate_id，使用新数据中的值
        if (item.associate_id !== undefined && item.associate_id > 0) {
          return {
            ...item,
            relatedPosts: [],
          };
        }
        // 如果新数据中没有 associate_id，检查当前 state 中是否有对应的已更新的 associate_id
        const existingQuestion = prev.find(q => q.id === item.id);
        if (existingQuestion?.associate_id !== undefined && existingQuestion.associate_id > 0) {
          return {
            ...item,
            associate_id: existingQuestion.associate_id,
            relatedPosts: existingQuestion.relatedPosts || [],
          };
        }
        // 否则使用新数据
        return {
          ...item,
          relatedPosts: [],
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
  const loadRelatedPosts = useCallback(async (scoreId: string, forumId: number) => {
    console.log('loadRelatedPosts called:', { scoreId, forumId });
    if (!forumId || forumId <= 0 || !scoreId) {
      console.log('loadRelatedPosts: missing forumId or scoreId (or forumId is 0)', {
        forumId,
        scoreId,
      });
      return;
    }

    // 检查缓存
    if (postsCacheRef.current.has(scoreId)) {
      console.log('loadRelatedPosts: using cache for', scoreId);
      const cachedPosts = postsCacheRef.current.get(scoreId) || [];
      setQuestions(prev => {
        const question = prev.find(q => q.score_id === scoreId);
        // 如果已经有相同的数据，不更新
        if (question?.relatedPosts?.length === cachedPosts.length) {
          return prev;
        }
        return prev.map(q => (q.score_id === scoreId ? { ...q, relatedPosts: cachedPosts } : q));
      });
      return;
    }

    // 检查是否正在加载
    if (loadingRef.current.has(scoreId)) {
      console.log('loadRelatedPosts: already loading', scoreId);
      return;
    }

    console.log('loadRelatedPosts: starting request for', scoreId);
    // 标记为正在加载
    loadingRef.current.add(scoreId);

    try {
      const response = await getAdminDiscussion({
        ai: true,
        forum_id: forumId,
        keyword: scoreId,
        page: 1,
        size: 10,
      });

      const relatedPosts = response?.items || [];
      console.log('loadRelatedPosts: received posts', relatedPosts.length);
      postsCacheRef.current.set(scoreId, relatedPosts);
      setQuestions(prev => prev.map(q => (q.score_id === scoreId ? { ...q, relatedPosts } : q)));
    } catch (error) {
      console.error('Failed to load related posts:', error);
      // 即使失败也设置空数组，避免重复请求
      postsCacheRef.current.set(scoreId, []);
      setQuestions(prev =>
        prev.map(q => (q.score_id === scoreId ? { ...q, relatedPosts: [] } : q))
      );
    } finally {
      loadingRef.current.delete(scoreId);
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
                  key={post.uuid || postIndex}
                  variant="caption"
                  onClick={e => {
                    e.stopPropagation();
                    onPostClick(post.uuid || '', question.foreign_id || 0);
                  }}
                  sx={{
                    color: 'text.secondary',
                    cursor: 'pointer',
                    '&:hover': {
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
          maxHeight: '300px',
          '& .tiptap': {
            px: 1,
            height: '100%',
            minHeight: '200px',
            overflow: 'auto',
          },
        }}
      >
        <EditorWrap
          ref={editorRef}
          value={editorValue}
          placeholder="请输入内容"
          readonly={isAssociated}
        />
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
              backgroundColor: STYLES.selectedBorder,
              '&:hover': { backgroundColor: '#4c5ab8' },
              textTransform: 'none',
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

    console.log('useEffect: selected question changed', {
      id: selectedQuestion.id,
      score_id: selectedQuestion.score_id,
      foreign_id: selectedQuestion.foreign_id,
      extra: selectedQuestion.extra,
    });

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

    // 加载关联帖子（foreign_id 为 0 时不请求）
    // 如果已经有相关帖子数据，说明已经加载过，不需要重新请求
    if (
      selectedQuestion.score_id &&
      selectedQuestion.foreign_id &&
      selectedQuestion.foreign_id > 0
    ) {
      // 检查是否已经有相关帖子数据，如果有就不需要重新请求
      if (!selectedQuestion.relatedPosts || selectedQuestion.relatedPosts.length === 0) {
        console.log('useEffect: calling loadRelatedPosts');
        loadRelatedPosts(selectedQuestion.score_id, selectedQuestion.foreign_id);
      } else {
        console.log('useEffect: relatedPosts already loaded, skipping request');
      }
    } else {
      console.log('useEffect: missing score_id or foreign_id (or foreign_id is 0)', {
        score_id: selectedQuestion.score_id,
        foreign_id: selectedQuestion.foreign_id,
      });
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
    console.log('Saving QA pair:', {
      title,
      associateId,
      aiInsightId,
      scoreId: selectedQuestion.score_id,
    });
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
        console.log('Updated associate_id:', {
          questionId: selectedQuestion.id,
          associateId: result,
        });
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

  return (
    <Box
      sx={{
        p: 3,
        width: '100%',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
            发现新的知识缺口
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: STYLES.secondaryText,
              fontSize: '13px',
            }}
          >
            AI 对此类问题理解不足,建议前往知识学习完善相关资料・
            {insightData?.time || '10月10日~10月16日'}
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
      <Grid container spacing={3} sx={{ flex: 1}}>
        {/* Left: Question List */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
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
          sx={{ display: 'flex', flexDirection: 'column' }}
        >
          <EditorSection
            question={selectedQuestion}
            editorRef={editorRef}
            editorValue={editorValue}
            titleValue={titleValue}
            onTitleChange={setTitleValue}
            onSave={handleSave}
            saving={saving}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIInsightDetailModal;
