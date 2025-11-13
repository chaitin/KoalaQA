import {
  getAdminRankAiInsight,
  getAdminStatDiscussion,
  getAdminStatSearch,
  getAdminStatVisit,
  ModelDiscussionType,
  ModelRankTimeGroup,
} from '@/api';
import Card from '@/components/card';
import CusTabs from '@/components/CusTabs';
import {
  AccessTime,
  Article,
  CheckCircle,
  LightbulbOutlined,
  People,
  RemoveRedEye,
  Search,
  SmartToy,
  TrendingUp,
} from '@mui/icons-material';
import { Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

type TimePeriod = 'today' | 'week' | 'month';

interface StatCardProps {
  value: string | number;
  label: string;
  icon: React.ReactNode;
}

const StatCard = ({ value, label, icon }: StatCardProps) => {
  return (
    <Card
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 600, fontSize: '28px' }}>
        {value}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 2 }}>
        <Box sx={{ fontSize: 20, color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
    </Card>
  );
};

const Dashboard = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');

  // 计算时间范围
  const timeRange = useMemo(() => {
    const now = dayjs();
    let start: dayjs.Dayjs;
    const end: dayjs.Dayjs = now;

    switch (timePeriod) {
      case 'today':
        start = now.startOf('day');
        break;
      case 'week':
        start = now.startOf('week');
        break;
      case 'month':
        start = now.startOf('month');
        break;
    }

    return {
      start_time: start.unix(),
      end_time: end.unix(),
    };
  }, [timePeriod]);

  // 获取访问统计
  const { data: visitData, loading: visitLoading } = useRequest(getAdminStatVisit, {
    refreshDeps: [timeRange],
  });

  // 获取搜索统计
  const { data: searchData, loading: searchLoading } = useRequest(getAdminStatSearch, {
    refreshDeps: [timeRange],
  });

  // 获取讨论统计
  const { data: discussionData, loading: discussionLoading } = useRequest(getAdminStatDiscussion, {
    refreshDeps: [timeRange],
  });

  // 获取 AI 洞察数据
  const { data: aiInsightResponse } = useRequest(getAdminRankAiInsight);

  const loading = visitLoading || searchLoading || discussionLoading;

  // 格式化 AI 洞察数据
  const aiInsightData = useMemo(() => {
    const insightData = aiInsightResponse;
    if (!insightData || insightData.length === 0) {
      return [];
    }

    const now = dayjs();
    const currentWeekStart = now.startOf('week');

    return insightData.slice(0, 3).map((item: ModelRankTimeGroup) => {
      const weekStart = dayjs.unix(item.time || 0);
      const weekEnd = weekStart.add(6, 'day');

      // 判断是否是当前周
      const isCurrentWeek = weekStart.isSame(currentWeekStart, 'day');

      let subtitle: string;
      if (isCurrentWeek) {
        subtitle = '近7天';
      } else {
        // 格式化日期：10月11日-10月18日
        const startStr = weekStart.format('M月D日');
        const endStr = weekEnd.format('M月D日');
        subtitle = `${startStr}-${endStr}`;
      }

      // 将 score_ids 转换为问题列表，如果没有则显示空数组
      const items = (item.score_ids || []).slice(0, 3).map((scoreId: string) => {
        // 如果 scoreId 本身就是一个问题，直接使用；否则可以添加问号
        return scoreId.endsWith('?') || scoreId.endsWith('？') ? scoreId : `${scoreId}?`;
      });

      return {
        title: '发现新的知识缺口',
        subtitle,
        items,
      };
    });
  }, [aiInsightResponse]);

  // 计算统计数据
  const stats = useMemo(() => {
    const visit = visitData || { pv: 0, uv: 0 };
    const search = searchData || 0;
    const discussion = discussionData || {
      discussion: 0,
      bot_accept: 0,
      bot_unknown: 0,
      accept: 0,
      human_resp_time: 0,
      discussions: [],
    };

    const qaDiscussionCount =
      discussion.discussions?.find(item => item.key === ModelDiscussionType.DiscussionTypeQA)
        ?.count ?? 0;
    const botAccept = discussion.bot_accept ?? 0;
    const botUnknown = discussion.bot_unknown ?? 0;
    const acceptCount = discussion.accept ?? 0;

    // 格式化数字，添加千分位
    const formatNumber = (num: number) => {
      return num.toLocaleString('zh-CN');
    };

    // 计算 AI 解决率
    const aiResolutionRate =
      qaDiscussionCount > 0 ? ((botAccept / qaDiscussionCount) * 100).toFixed(1) : '0.0';

    // 计算总解决率
    const totalResolutionRate =
      qaDiscussionCount > 0 ? ((acceptCount / qaDiscussionCount) * 100).toFixed(1) : '0.0';

    // 格式化响应时长（秒转分钟）
    const humanRespTime = discussion.human_resp_time
      ? (discussion.human_resp_time / 60).toFixed(1)
      : '0.0';

    return {
      visitCount: formatNumber(visit.pv || 0),
      visitUserCount: formatNumber(visit.uv || 0),
      searchCount: formatNumber(search),
      postCount: formatNumber(
        discussion.discussions?.reduce((sum, item) => sum + (item.count ?? 0), 0) ?? 0
      ),
      aiSuccessCount: formatNumber(Math.max(qaDiscussionCount - botUnknown, 0)),
      aiResolutionRate: `${aiResolutionRate}%`,
      totalResolutionRate: `${totalResolutionRate}%`,
      humanRespTime: `${humanRespTime} min`,
    };
  }, [visitData, searchData, discussionData]);

  return (
    <Stack component={Card} sx={{ height: '100%', p: 3 }}>
      {/* AI 洞察介绍 */}
      <Box
        sx={{
          mb: 3,
          borderRadius: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AI 洞察
          </Typography>
        </Stack>
        <Grid container spacing={2}>
          {aiInsightData.map(
            (item: { title: string; subtitle: string; items: string[] }, index: number) => (
              <Grid
                key={`${item.subtitle}-${index}`}
                size={{ xs: 12, md: 4 }}
                sx={{ bgcolor: '#F8F9FA', borderRadius: 1 }}
              >
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <LightbulbOutlined sx={{ fontSize: 20, color: 'primary.main' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {item.title}
                    </Typography>
                    <Box
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        fontSize: '13px',
                        mb: 1.5,
                        px: 1,
                        py: 0.5,
                        borderRadius: 3,
                        ml: 'auto!important',
                        bgcolor: 'rgba(39, 125, 255, 0.04)',
                      }}
                    >
                      {item.subtitle}
                    </Box>
                  </Stack>
                  {item.items.length > 0 ? (
                    <Stack
                      component="ol"
                      sx={{ p: 1, m: 0 }}
                      spacing={1}
                    >
                      {item.items.map((text: string, idx: number) => (
                        <Typography
                          component="li"
                          key={`${text}-${idx}`}
                          variant="body2"
                          sx={{ fontSize: '12px' }}
                          color="text.secondary"
                        >
                          {text}
                        </Typography>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      暂无数据
                    </Typography>
                  )}
                </Box>
              </Grid>
            )
          )}
        </Grid>
      </Box>

      {/* 时间选择器 */}
      <Box sx={{ mb: 3 }}>
        <CusTabs
          list={[
            { label: '今日', value: 'today' },
            { label: '本周', value: 'week', disabled: true },
            { label: '本月', value: 'month', disabled: true },
          ]}
          value={timePeriod}
          onChange={value => setTimePeriod(value as TimePeriod)}
        />
      </Box>

      {/* 统计卡片 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              value={stats.visitCount}
              label="访问次数"
              icon={<RemoveRedEye sx={{ fontSize: 20 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              value={stats.visitUserCount}
              label="访问用户数"
              icon={<People sx={{ fontSize: 20 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              value={stats.searchCount}
              label="搜索次数"
              icon={<Search sx={{ fontSize: 20 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              value={stats.postCount}
              label="发帖数"
              icon={<Article sx={{ fontSize: 20 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              value={stats.aiSuccessCount}
              label="AI 成功回答数"
              icon={<SmartToy sx={{ fontSize: 20 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              value={stats.aiResolutionRate}
              label="AI 解决率"
              icon={<CheckCircle sx={{ fontSize: 20 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              value={stats.totalResolutionRate}
              label="总解决率"
              icon={<TrendingUp sx={{ fontSize: 20 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              value={stats.humanRespTime}
              label="人工平均响应时长"
              icon={<AccessTime sx={{ fontSize: 20 }} />}
            />
          </Grid>
        </Grid>
      )}
    </Stack>
  );
};

export default Dashboard;
