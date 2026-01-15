import { getAdminDiscussionAsk, ModelAskSession, getAdminDiscussionAskSession, SvcListAsksRes } from '@/api';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { Ellipsis, Table, Modal } from '@ctzhian/ui';
import { Stack, TextField, Typography, Box, Paper, Avatar, CircularProgress } from '@mui/material';
import { useRequest } from 'ahooks';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
import dayjs from 'dayjs';
import { useEffect, useState, useRef, useCallback } from 'react';
import EditorContent from '@/components/EditorContent';

const AskHistory = () => {
  const { page, size, setParams } = useListQueryParams();
  const [keyword, setKeyword] = useState('');
  const [username, setUsername] = useState('');
  const [sessionDetail, setSessionDetail] = useState<ModelAskSession[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 智能问答数据
  const {
    data: askData,
    loading: askLoading,
    run: fetchAskData,
  } = useRequest(
    params => getAdminDiscussionAsk({ page, size, content: params.content, username: params.username }),
    { manual: true }
  );

  // 会话详情数据
  const {
    data: sessionDetailData,
    loading: sessionDetailLoading,
    run: fetchSessionDetail,
  } = useRequest(
    params => {
      if (!params.uuid || !params.user_id) return Promise.resolve({ items: [], total: 0 });
      return getAdminDiscussionAskSession({
        session_id: params.uuid,
        user_id: params.user_id,
        page: params.page || 1,
        size: params.size || 20,
      });
    },
    { manual: true }
  );

  useEffect(() => {
    fetchAskData({
      content: keyword || undefined,
      username: username || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, keyword, username]);

  // 打开详情弹窗
  const handleOpenDetail = async (record: SvcListAsksRes) => {
    if (!record.uuid || !record.user_id) return;
    setDetailModalOpen(true);
    setCurrentSessionId(record.uuid);
    setCurrentUserId(record.user_id);
    setCurrentUsername(record.username || '用户');
    setSessionPage(1);
    setSessionDetail([]);
    setLoadingMore(false);
    // 延迟滚动到顶部，确保 DOM 已更新
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }, 100);
    fetchSessionDetail({ uuid: record.uuid, user_id: record.user_id, page: 1, size: 20 });
  };

  useEffect(() => {
    if (sessionDetailData?.items) {
      const items = sessionDetailData.items || [];
      if (sessionPage === 1) {
        // 第一页，直接设置
        setSessionDetail(items);
      } else {
        // 加载更多，追加数据
        setSessionDetail(prev => [...prev, ...items]);
      }
      setSessionTotal(sessionDetailData.total || 0);
      setLoadingMore(false);
    } else if (sessionDetailData && sessionPage === 1) {
      setSessionDetail([]);
      setSessionTotal(0);
      setLoadingMore(false);
    }
  }, [sessionDetailData, sessionPage]);

  // 加载更多数据
  const loadMore = useCallback(async () => {
    if (loadingMore || !currentSessionId || !currentUserId) return;
    if (sessionDetail.length >= sessionTotal && sessionTotal > 0) return; // 没有更多数据了

    setLoadingMore(true);
    const nextPage = sessionPage + 1;
    setSessionPage(nextPage);
    fetchSessionDetail({
      uuid: currentSessionId,
      user_id: currentUserId,
      page: nextPage,
      size: 20,
    });
  }, [loadingMore, currentSessionId, currentUserId, sessionDetail.length, sessionTotal, sessionPage, fetchSessionDetail]);

  // 滚动监听
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !detailModalOpen) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // 距离底部 50px 时触发加载
      if (scrollHeight - scrollTop - clientHeight < 50) {
        if (!loadingMore && sessionDetail.length < sessionTotal) {
          loadMore();
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [detailModalOpen, sessionDetail.length, sessionTotal, loadingMore, loadMore]);

  // 智能问答的列
  const askColumns: ColumnsType<SvcListAsksRes> = [
    {
      title: '问题',
      dataIndex: 'content',
      render: (_, record) => {
        // 显示内容，如果是用户消息（bot=false）则显示完整内容，否则显示内容的前100个字符
        const isUserMessage = record.bot === false;
        const displayText = record.content || '-';
        const truncatedText = isUserMessage ? displayText : (displayText.length > 100 ? displayText.substring(0, 100) + '...' : displayText);
        return (
          <Ellipsis
            onClick={() => {
              if (record.uuid && record.user_id) {
                handleOpenDetail(record);
              }
            }}
            sx={{
              cursor: record.uuid && record.user_id ? 'pointer' : 'default',
              color: record.uuid && record.user_id ? 'primary.main' : 'text.primary',
              '&:hover': {
                textDecoration: record.uuid && record.user_id ? 'underline' : 'none',
              },
            }}
          >
            {truncatedText}
          </Ellipsis>
        );
      },
    },
    {
      title: '用户',
      dataIndex: 'user_id',
      render: (_, record) => {
        // 暂时显示用户ID，后续可以优化为显示用户名
        return record?.username ?? '-';
      },
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      render: (_, record) => {
        if (!record?.created_at) return '-';
        const time = record.created_at * 1000;
        return (
          <Stack>
            <Typography variant="body2">{dayjs(time).fromNow()}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {dayjs(time).format('YYYY-MM-DD HH:mm:ss')}
            </Typography>
          </Stack>
        );
      },
    },
  ];

  return (
    <>
      <Stack direction="row" alignItems="center"  spacing={2} sx={{ mb: 2 }}>
        <Typography variant="caption">共 {askData?.total || 0} 条记录</Typography>
        <TextField
          label="问题"
          value={keyword}
          size="small"
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              fetchAskData({
                content: keyword || undefined,
                username: username || undefined,
              });
            }
          }}
        />
        <TextField
          label="用户"
          value={username}
          size="small"
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              fetchAskData({
                content: keyword || undefined,
                username: username || undefined,
              });
            }
          }}
        />
      </Stack>
      <Table
        sx={{ mx: -2, flex: 1, height: '0' }}
        PaginationProps={{
          sx: {
            pt: 2,
            mx: 2,
          },
        }}
        loading={askLoading}
        columns={askColumns}
        dataSource={askData?.items || []}
        rowKey="id"
        pagination={{
          page,
          pageSize: size,
          total: askData?.total || 0,
          onChange: (page: number, size: number) => {
            setParams({
              page,
              size,
            });
          },
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setSessionDetail([]);
          setCurrentSessionId('');
          setCurrentUserId(0);
          setCurrentUsername('');
          setSessionPage(1);
          setSessionTotal(0);
        }}
        title="问答记录"
        footer={null}
        width={800}
      >
        <Box
          ref={scrollContainerRef}
          sx={{ maxHeight: '70vh', overflow: 'auto', bgcolor: 'grey.50', p: 2 }}
        >
          {sessionDetailLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                加载中...
              </Typography>
            </Box>
          ) : sessionDetail.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                暂无记录
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2} sx={{ py: 1 }}>
              {sessionDetail.map((item, index) => {
                const isUser = !item.bot;
                const prevItem = sessionDetail[index - 1];
                const showTime =
                  index === 0 ||
                  !prevItem?.created_at ||
                  !item.created_at ||
                  (item.created_at && prevItem.created_at && item.created_at - prevItem.created_at > 300); // 5分钟间隔显示时间

                return (
                  <Box key={item.id || index}>
                    {showTime && item.created_at && (
                      <Box sx={{ textAlign: 'center', my: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            bgcolor: 'background.paper',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            display: 'inline-block',
                          }}
                        >
                          {dayjs(item.created_at * 1000).format('YYYY-MM-DD HH:mm:ss')}
                        </Typography>
                      </Box>
                    )}
                    <Stack
                      direction="row"
                      spacing={1.5}
                      justifyContent={isUser ? 'flex-end' : 'flex-start'}
                      sx={{ mb: 0.5 }}
                    >
                      {!isUser && (
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'primary.main',
                            fontSize: '0.875rem',
                          }}
                        >
                          AI
                        </Avatar>
                      )}
                      <Box
                        sx={{
                          maxWidth: '70%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isUser ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            bgcolor: isUser ? 'primary.main' : 'background.paper',
                            color: isUser ? 'white' : 'text.primary',
                            borderRadius: isUser
                              ? '18px 18px 4px 18px'
                              : '18px 18px 18px 4px',
                            border: isUser
                              ? 'none'
                              : '1px solid',
                            borderColor: 'divider',
                            boxShadow: isUser
                              ? '0 1px 2px rgba(0,0,0,0.1)'
                              : '0 1px 2px rgba(0,0,0,0.05)',
                          }}
                        >
                          <Box
                            sx={{
                              '& *': {
                                color: isUser ? 'white' : 'inherit',
                              },
                              '& a': {
                                color: isUser ? 'rgba(255,255,255,0.8)' : 'primary.main',
                              },
                            }}
                          >
                            <EditorContent content={item.content || ''} />
                          </Box>
                        </Paper>
                      </Box>
                      {isUser && (
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'grey.400',
                            fontSize: '0.875rem',
                          }}
                        >
                          {currentUsername ? (currentUsername.length > 2 ? currentUsername.substring(0, 2) : currentUsername) : '用户'}
                        </Avatar>
                      )}
                    </Stack>
                  </Box>
                );
              })}
              {loadingMore && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                    加载中...
                  </Typography>
                </Box>
              )}
              {!loadingMore && sessionDetail.length > 0 && sessionDetail.length >= sessionTotal && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    没有更多记录了
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </Box>
      </Modal>
    </>
  );
};

export default AskHistory;
