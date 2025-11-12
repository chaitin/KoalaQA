import {
  getAdminStatDiscussion,
  getAdminStatSearch,
  getAdminStatVisit,
  ModelDiscussionType,
} from '@/api';
import Card from '@/components/card';
import CusTabs from '@/components/CusTabs';
import { useAppDispatch } from '@/store';
import { setPageName } from '@/store/slices/breadcrumb';
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
import { useEffect, useMemo, useState } from 'react';

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

  const loading = visitLoading || searchLoading || discussionLoading;

  const aiInsightData = [
    {
      title: '发现新的知识缺口',
      subtitle: '近 7 天',
      items: ['如何重置密码？', '账号被锁定怎么办？', '如何修改绑定手机号？'],
    },
    {
      title: '发现新的知识缺口',
      subtitle: '10月11日-10月18日',
      items: ['如何申请退款？', '退款多久到账？', '退款失败怎么办？'],
    },
    {
      title: '发现新的知识缺口',
      subtitle: '10月03日-10月10日',
      items: ['如何申请退款？', '退款多久到账？', '退款失败怎么办？'],
    },
  ];

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
      discussion.discussions?.find(item => item.key === ModelDiscussionType.DiscussionTypeQA)?.count ??
      0;
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
      {/* <Box
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 2,
          bgcolor: 'rgba(39, 125, 255, 0.04)',
          border: '1px solid',
          borderColor: 'rgba(39, 125, 255, 0.16)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <LightbulbOutlined sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AI 洞察
          </Typography>
        </Stack>
        <Grid container spacing={2}>
          {aiInsightData.map(item => (
            <Grid key={item.subtitle} size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: '#fff',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                  height: '100%',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <LightbulbOutlined sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 1.5 }}
                >
                  {item.subtitle}
                </Typography>
                <Stack component="ol" sx={{ pl: 2, m: 0 }} spacing={1}>
                  {item.items.map(text => (
                    <Typography component="li" key={text} variant="body2" color="text.secondary">
                      {text}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box> */}

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
