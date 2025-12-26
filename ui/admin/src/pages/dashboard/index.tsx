import {
  AccessTime,
  Bolt,
  CheckCircle,
  Comment,
  Dashboard as DashboardIcon,
  Description,
  Notifications,
  People,
  Search,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CircularProgress,
  Dialog,
  DialogContent,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import dayjs from 'dayjs';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import {
  getAdminRankAiInsight,
  getAdminStatDiscussion,
  getAdminStatSearch,
  getAdminStatTrend,
  getAdminStatVisit,
} from '../../api';
import {
  ModelRankTimeGroup,
  ModelRankTimeGroupItem,
  ModelStatTrend,
  ModelStatTrendItem,
  ModelStatType,
  SvcStatDiscussionItem,
  SvcStatDiscussionRes,
  SvcStatVisitRes,
} from '../../api/types';
import AIInsightDetailModal from '../../components/AIInsightDetailModal';
import CusTabs from '../../components/CusTabs';

// --- 类型定义 ---

interface ChartDataPoint {
  name: string;
  visits: number;
  posts: number;
  qa: number;
  blog: number;
  issue: number;
  aiResponse: number;
  aiResolve: number;
}

interface DashboardData {
  visitStats: SvcStatVisitRes | null;
  discussionStats: SvcStatDiscussionRes | null;
  discussions: SvcStatDiscussionItem[] | null;
  searchCount: number | null;
  aiInsights: ModelRankTimeGroup[] | null;
  // 独立的趋势数据
  visitTrendData: ModelStatTrend[] | null; // 访问用户情况趋势
  postTrendData: ModelStatTrend[] | null; // 发帖情况趋势
  aiResponseRateData: ModelStatTrend[] | null; // AI 应答率趋势原始数据
  aiResolveRateData: ModelStatTrend[] | null; // AI 解决率趋势原始数据
}

type TimeRange = 'today' | 'week' | 'month';

// 洞察数据接口
interface InsightData {
  title: string;
  time: string;
  questions: ModelRankTimeGroupItem[];
}

// 扩展的问题处理项接口
interface ExtendedQuestionItem extends ModelRankTimeGroupItem {
  insightData?: InsightData;
}

interface MetricItem {
  value: string;
  unit?: string;
  label: string;
  icon: ReactNode;
}

interface StatCardProps {
  type: 'blue' | 'purple';
  metrics: MetricItem[];
}

interface ChartSectionProps {
  title: string;
  children: ReactNode;
  showTime?: boolean;
}

interface InsightItemProps {
  type: 'critical' | 'normal';
  time: string;
  title: string;
  scoreIds: ModelRankTimeGroupItem[];
  isExpanded?: boolean;
  onQuestionClick?: (item: ExtendedQuestionItem) => void;
}

// --- 时间范围转换工具 ---
const getTimeRangeBegin = (timeRange: TimeRange): number => {
  const now = new Date();
  const begin = new Date();

  switch (timeRange) {
    case 'today':
      begin.setHours(0, 0, 0, 0);
      break;
    case 'week': {
      // 当前周：从本周一0点开始
      const dayOfWeek = now.getDay(); // 0是周日，1是周一，...，6是周六
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 如果是周日，需要回退6天到周一
      begin.setDate(now.getDate() - daysSinceMonday);
      begin.setHours(0, 0, 0, 0);
      break;
    }
    case 'month': {
      // 当前月：从本月1号0点开始
      begin.setDate(1);
      begin.setHours(0, 0, 0, 0);
      break;
    }
  }

  return Math.floor(begin.getTime() / 1000);
};

// --- 获取统计分组方式 ---
const getStatGroup = (timeRange: TimeRange): number => {
  switch (timeRange) {
    case 'today':
    case 'week':
      return 1; // StateTrendGroupHour - 按小时分组（后端始终按小时返回）
    case 'month':
      return 2; // StateTrendGroupDay - 按天分组
    default:
      return 2;
  }
};

// --- 数据格式化工具 ---
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
};

const formatPercentage = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  return num.toFixed(1);
};

const formatTime = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return '0';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes}m`;
};

// --- AI 比率趋势数据转换 ---
interface AIRateTrendDataPoint {
  name: string;
  value: number; // AI 应答率或解决率
  areaValue: number; // 用于Area组件显示，避免tooltip重复
}

// AI 应答率趋势计算：(StatTypeDiscussionQA - StatTypeBotUnknown) / StatTypeDiscussionQA
const transformAIResponseRateTrendData = (trendData: ModelStatTrend[]): AIRateTrendDataPoint[] => {
  const groupedData: { [key: string]: { qaCount: number; botUnknownCount: number } } = {};

  // 处理所有趋势数据，根据类型分别统计
  trendData.forEach(trend => {
    if (!trend.items || trend.ts === undefined || trend.ts === null) return;

    const dateKey = getDayKey(trend.ts);
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = { qaCount: 0, botUnknownCount: 0 };
    }

    trend.items.forEach((item: ModelStatTrendItem) => {
      if (item.type === ModelStatType.StatTypeDiscussionQA) {
        groupedData[dateKey].qaCount += item.count || 0;
      } else if (item.type === ModelStatType.StatTypeBotUnknown) {
        groupedData[dateKey].botUnknownCount += item.count || 0;
      }
    });
  });

  // 补充缺失的天数（确保连续30天的数据）
  const today = new Date();
  const result: AIRateTrendDataPoint[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = `${date.getMonth() + 1}-${date.getDate()}`;

    const stats = groupedData[dateKey] || { qaCount: 0, botUnknownCount: 0 };
    const responseRate =
      stats.qaCount > 0 ? ((stats.qaCount - stats.botUnknownCount) / stats.qaCount) * 100 : 0;

    result.push({
      name: dateKey,
      value: responseRate,
      areaValue: responseRate,
    });
  }

  return result;
};

// AI 解决率趋势计算：StatTypeBotAccept / StatTypeDiscussionQA
const transformAIResolveRateTrendData = (trendData: ModelStatTrend[]): AIRateTrendDataPoint[] => {
  const groupedData: { [key: string]: { qaCount: number; botAcceptCount: number } } = {};

  // 处理所有趋势数据，根据类型分别统计
  trendData.forEach(trend => {
    if (!trend.items || trend.ts === undefined || trend.ts === null) return;

    const dateKey = getDayKey(trend.ts);
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = { qaCount: 0, botAcceptCount: 0 };
    }

    trend.items.forEach((item: ModelStatTrendItem) => {
      if (item.type === ModelStatType.StatTypeDiscussionQA) {
        groupedData[dateKey].qaCount += item.count || 0;
      } else if (item.type === ModelStatType.StatTypeBotAccept) {
        groupedData[dateKey].botAcceptCount += item.count || 0;
      }
    });
  });

  // 补充缺失的天数（确保连续30天的数据）
  const today = new Date();
  const result: AIRateTrendDataPoint[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = `${date.getMonth() + 1}-${date.getDate()}`;

    const stats = groupedData[dateKey] || { qaCount: 0, botAcceptCount: 0 };
    const resolveRate = stats.qaCount > 0 ? (stats.botAcceptCount / stats.qaCount) * 100 : 0;

    result.push({
      name: dateKey,
      value: resolveRate,
      areaValue: resolveRate,
    });
  }

  return result;
};

// 辅助函数：获取日期键
const getDayKey = (timestamp: number | undefined): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return `${date.getMonth() + 1}-${date.getDate()}`;
};

// X轴label格式化：周视图默认是 "M/D HH:mm"，这里仅展示 "M/D"
const formatXAxisLabel = (label: unknown): string => {
  if (label == null) return '';
  const str = String(label);
  const match = str.match(/^(\d{1,2}[/-]\d{1,2})\s+\d{1,2}:\d{2}$/);
  return match ? match[1] : str;
};

// --- 生成完整的时间序列数据 ---
const generateTimeSeries = (timeRange: TimeRange): { name: string; timestamp: number }[] => {
  const now = new Date();
  const timeSeries: { name: string; timestamp: number }[] = [];

  if (timeRange === 'today') {
    // 今天：从0点开始，每小时一个数据点
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const currentHour = now.getHours();
    for (let hour = 0; hour <= currentHour; hour++) {
      const time = new Date(startOfDay);
      time.setHours(hour);
      timeSeries.push({
        name: `${hour.toString().padStart(2, '0')}:00`,
        timestamp: Math.floor(time.getTime() / 1000),
      });
    }
  } else if (timeRange === 'week') {
    // 当前周：从本周一0点开始，到当前时间结束，每6小时一个数据点
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1; // 周日是0，转换为6天前的周一
    startOfWeek.setDate(now.getDate() - daysSinceMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const currentEnd = new Date(now);

    for (let time = new Date(startOfWeek); time <= currentEnd; time.setHours(time.getHours() + 6)) {
      const month = time.getMonth() + 1;
      const day = time.getDate();
      const hour = time.getHours();
      timeSeries.push({
        name: `${month}/${day} ${hour.toString().padStart(2, '0')}:00`,
        timestamp: Math.floor(time.getTime() / 1000),
      });
    }
  } else if (timeRange === 'month') {
    // 当前月：从本月1号0点开始，到当前时间结束，每天一个数据点
    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset <= now.getDate() - 1; dayOffset++) {
      const time = new Date(startOfMonth);
      time.setDate(startOfMonth.getDate() + dayOffset);
      const month = time.getMonth() + 1;
      const date = time.getDate();
      timeSeries.push({
        name: `${month}-${date}`,
        timestamp: Math.floor(time.getTime() / 1000),
      });
    }
  }

  return timeSeries;
};

// --- 将小时数据聚合为6小时间隔的数据 ---
const aggregateTo6HourIntervals = (
  trendItems: ModelStatTrend[],
  timeSeries: { name: string; timestamp: number }[]
): ChartDataPoint[] => {
  const result: ChartDataPoint[] = [];

  timeSeries.forEach(({ name, timestamp }) => {
    const periodEnd = timestamp + 6 * 3600; // 6小时后
    const aggregated: ChartDataPoint = {
      name,
      visits: 0,
      posts: 0,
      qa: 0,
      blog: 0,
      issue: 0,
      aiResponse: 0,
      aiResolve: 0,
    };

    // 聚合这个6小时窗口内的所有原始数据
    trendItems.forEach(trend => {
      if (!trend.items || !trend.ts) return;

      // 如果这个趋势数据点在当前6小时窗口内
      if (trend.ts >= timestamp && trend.ts < periodEnd) {
        // 处理每个趋势项目中的具体统计数据
        trend.items.forEach((item: any) => {
          switch (item.type) {
            case ModelStatType.StatTypeVisit:
              aggregated.visits += item.count || 0;
              break;
            case ModelStatType.StatTypeDiscussionQA:
              aggregated.qa += item.count || 0;
              aggregated.posts += item.count || 0;
              break;
            case ModelStatType.StatTypeDiscussionBlog:
              aggregated.blog += item.count || 0;
              aggregated.posts += item.count || 0;
              break;
            case ModelStatType.StatTypeDiscussionIssue:
              aggregated.issue += item.count || 0;
              aggregated.posts += item.count || 0;
              break;
            case ModelStatType.StatTypeBotAccept:
              aggregated.aiResponse += item.count || 0;
              break;
            case ModelStatType.StatTypeBotUnknown:
              aggregated.aiResolve += item.count || 0;
              break;
          }
        });
      }
    });

    result.push(aggregated);
  });

  return result;
};

const transformTrendData = (
  trendItems: ModelStatTrend[],
  timeRange: TimeRange
): ChartDataPoint[] => {
  const hourlyData: { [key: string]: ChartDataPoint } = {};

  // 首先处理原始数据，按小时分组（因为后端始终返回小时数据）
  trendItems.forEach(trend => {
    if (!trend.items || !trend.ts) return;

    const date = new Date(trend.ts * 1000);
    const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;

    if (!hourlyData[hourKey]) {
      hourlyData[hourKey] = {
        name: hourKey,
        visits: 0,
        posts: 0,
        qa: 0,
        blog: 0,
        issue: 0,
        aiResponse: 0,
        aiResolve: 0,
      };
    }

    // 处理每个趋势项目中的具体统计数据
    trend.items.forEach((item: any) => {
      switch (item.type) {
        case ModelStatType.StatTypeVisit:
          hourlyData[hourKey].visits += item.count || 0;
          break;
        case ModelStatType.StatTypeDiscussionQA:
          hourlyData[hourKey].qa += item.count || 0;
          hourlyData[hourKey].posts += item.count || 0;
          break;
        case ModelStatType.StatTypeDiscussionBlog:
          hourlyData[hourKey].blog += item.count || 0;
          hourlyData[hourKey].posts += item.count || 0;
          break;
        case ModelStatType.StatTypeDiscussionIssue:
          hourlyData[hourKey].issue += item.count || 0;
          hourlyData[hourKey].posts += item.count || 0;
          break;
        case ModelStatType.StatTypeBotAccept:
          hourlyData[hourKey].aiResponse += item.count || 0;
          break;
        case ModelStatType.StatTypeBotUnknown:
          hourlyData[hourKey].aiResolve += item.count || 0;
          break;
      }
    });
  });

  // 根据时间范围生成完整的时间序列
  const timeSeries = generateTimeSeries(timeRange);

  if (timeRange === 'today') {
    // 今天：直接按小时处理，但补充缺失的小时
    return timeSeries.map(({ name }) => {
      return (
        hourlyData[name] || {
          name,
          visits: 0,
          posts: 0,
          qa: 0,
          blog: 0,
          issue: 0,
          aiResponse: 0,
          aiResolve: 0,
        }
      );
    });
  } else if (timeRange === 'week') {
    // 本周：聚合为6小时间隔
    return aggregateTo6HourIntervals(trendItems, timeSeries);
  } else {
    // 本月：按天处理
    const dailyData: { [key: string]: ChartDataPoint } = {};

    // 将小时数据聚合为天数据
    trendItems.forEach(trend => {
      if (!trend.items || !trend.ts) return;

      const date = new Date(trend.ts * 1000);
      const dayKey = `${date.getMonth() + 1}-${date.getDate()}`;

      if (!dailyData[dayKey]) {
        dailyData[dayKey] = {
          name: dayKey,
          visits: 0,
          posts: 0,
          qa: 0,
          blog: 0,
          issue: 0,
          aiResponse: 0,
          aiResolve: 0,
        };
      }

      // 处理每个趋势项目中的具体统计数据
      trend.items.forEach((item: any) => {
        switch (item.type) {
          case ModelStatType.StatTypeVisit:
            dailyData[dayKey].visits += item.count || 0;
            break;
          case ModelStatType.StatTypeDiscussionQA:
            dailyData[dayKey].qa += item.count || 0;
            dailyData[dayKey].posts += item.count || 0;
            break;
          case ModelStatType.StatTypeDiscussionBlog:
            dailyData[dayKey].blog += item.count || 0;
            dailyData[dayKey].posts += item.count || 0;
            break;
          case ModelStatType.StatTypeDiscussionIssue:
            dailyData[dayKey].issue += item.count || 0;
            dailyData[dayKey].posts += item.count || 0;
            break;
          case ModelStatType.StatTypeBotAccept:
            dailyData[dayKey].aiResponse += item.count || 0;
            break;
          case ModelStatType.StatTypeBotUnknown:
            dailyData[dayKey].aiResolve += item.count || 0;
            break;
        }
      });
    });

    // 补充缺失的天
    return timeSeries.map(({ name }) => {
      return (
        dailyData[name] || {
          name,
          visits: 0,
          posts: 0,
          qa: 0,
          blog: 0,
          issue: 0,
          aiResponse: 0,
          aiResolve: 0,
        }
      );
    });
  }
};

// --- 子组件 ---

const TopFilter: React.FC<{
  value: TimeRange;
  onChange: (event: React.MouseEvent<HTMLElement>, timeRange: TimeRange | null) => void;
}> = ({ value, onChange }) => {
  const handleChange = (newValue: string | number) => {
    // CusTabs 的 onChange 只接收 value，需要适配原来的 onChange 签名
    onChange({} as React.MouseEvent<HTMLElement>, newValue as TimeRange);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <CusTabs
        list={[
          { label: '今日', value: 'today' },
          { label: '本周', value: 'week' },
          { label: '本月', value: 'month' },
        ]}
        value={value}
        onChange={handleChange}
        size="small"
      />
    </Box>
  );
};

const StatCard: React.FC<StatCardProps> = ({ type, metrics }) => {
  const isBlue = type === 'blue';

  // 定义样式变量
  const bgGradient = isBlue
    ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' // Blue 50 -> Blue 100
    : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)'; // Purple 50 -> Purple 100

  const textColor = isBlue ? '#1e3a8a' : '#581c87'; // Blue 900 / Purple 900
  const subColor = isBlue ? '#2563eb' : '#9333ea'; // Blue 600 / Purple 600

  return (
    <Card
      elevation={0}
      sx={{
        background: bgGradient,
        borderRadius: 3,
        p: 2,
        height: '100%',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        {metrics.map((m, idx) => (
          <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ color: textColor, display: 'flex', alignItems: 'flex-end', lineHeight: 1 }}
            >
              {m.value}
              {m.unit && (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ ml: 0.5, mb: 0.5, fontWeight: 600 }}
                >
                  {m.unit}
                </Typography>
              )}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ color: subColor, display: 'flex' }}>{m.icon}</Box>
              <Typography variant="caption" fontWeight={500} sx={{ color: subColor }}>
                {m.label}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Card>
  );
};

const ChartSection: React.FC<ChartSectionProps> = ({ title, children, showTime = true }) => {
  return (
    <Card
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        height: 'calc(35vh - 21px)',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle1" fontWeight={700} color="text.primary">
          {title}
        </Typography>
        {showTime && (
          <Typography variant="caption" color="text.secondary">
            近 30 天
          </Typography>
        )}
      </Stack>
      <Box sx={{ flexGrow: 1, minHeight: 0, width: '100%' }}>{children}</Box>
    </Card>
  );
};

interface MainDashboardCardProps {
  children: ReactNode;
  sx?: object;
}

const MainDashboardCard: React.FC<MainDashboardCardProps> = ({ children, sx = {} }) => {
  return (
    <Card
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        height: 'fit-content',
        ...sx,
      }}
    >
      {children}
    </Card>
  );
};

const InsightItem: React.FC<InsightItemProps> = ({ time, title, scoreIds, onQuestionClick }) => {
  const iconBg = 'rgba(76, 165, 167, 0.10)'; // Red 100 / Cyan 100
  const iconColor = 'rgba(76, 165, 167, 1)';

  const handleInsightClick = () => {
    if (onQuestionClick && scoreIds.length > 0) {
      // 传递整个洞察数据，包含标题、时间和所有相关问题
      onQuestionClick({
        score_id: title,
        insightData: {
          title,
          time,
          questions: scoreIds,
        },
      });
    }
  };

  return (
    <Box
      sx={{
        bgcolor: 'rgba(76, 165, 167, 0.08)',
        borderRadius: 1,
        p: 1.5,
        transition: 'all 0.3s',
        cursor: onQuestionClick ? 'pointer' : 'default',
        '&:hover': {
          bgcolor: 'rgba(76, 165, 167, 0.12)',
          '& .check_detail': {
            visibility: 'visible',
          },
        },
      }}
      onClick={handleInsightClick}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Avatar
          sx={{
            bgcolor: iconBg,
            color: iconColor,
            width: 32,
            height: 32,
          }}
        >
          <Notifications sx={{ fontSize: 16 }} />
        </Avatar>

        <Box sx={{ flexGrow: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ color: 'rgba(76, 165, 167, 1)' }}
          >
            <Typography variant="body2" fontWeight={600}>
              {title}
            </Typography>
            <Typography variant="caption" className="check_detail" sx={{ visibility: 'hidden' }}>
              查看详情
            </Typography>
          </Stack>
          <Typography variant="caption" color="rgba(76, 165, 167, 0.50)" display="block" mt={0.5}>
            {time}
          </Typography>
        </Box>
      </Stack>
      <Paper
        elevation={0}
        sx={{
          mt: 2,
          p: 2,
          bgcolor: 'rgba(255,255,255,0.8)',
          borderRadius: 1,
          boxShadow: '0px 0px 1px 1px rgba(54,59,76,0.03)',
        }}
      >
        <Stack spacing={1}>
          {scoreIds.map((item, index) => (
            <Typography key={index} variant="caption" color="text.secondary">
              · {item?.score_id || '未知问题'}
            </Typography>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
};

// --- 主页面 ---

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');

  // AI洞察弹窗状态
  const [insightModalOpen, setInsightModalOpen] = useState(false);
  const [currentInsightData, setCurrentInsightData] = useState<InsightData | undefined>();

  // 数据状态
  const [data, setData] = useState<DashboardData>({
    visitStats: null,
    discussionStats: null,
    discussions: null,
    searchCount: null,
    aiInsights: null,
    // 独立的趋势数据
    visitTrendData: null,
    postTrendData: null,
    aiResponseRateData: null,
    aiResolveRateData: null,
  });

  // 错误状态
  const [error, setError] = useState<string | null>(null);

  // 处理AI洞察问题点击
  const handleQuestionClick = (item: ExtendedQuestionItem) => {
    setCurrentInsightData(item.insightData);
    setInsightModalOpen(true);
  };

  // 关闭AI洞察弹窗
  const handleCloseInsightModal = () => {
    setInsightModalOpen(false);
    setCurrentInsightData(undefined);
  };

  // 更新AI洞察数据中的 associate_id
  const handleUpdateAssociateId = (questionId: number, associateId: number) => {
    // 更新当前弹窗中的 insightData
    setCurrentInsightData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map(q =>
          q.id === questionId ? { ...q, associate_id: associateId } : q
        ),
      };
    });

    // 同时更新 data.aiInsights 中的对应数据
    setData(prev => {
      if (!prev.aiInsights) return prev;
      return {
        ...prev,
        aiInsights: prev.aiInsights.map(group => ({
          ...group,
          items:
            group.items?.map((item: ModelRankTimeGroupItem) =>
              item.id === questionId ? { ...item, associate_id: associateId } : item
            ) || [],
        })),
      };
    });
  };

  // 获取时间相关的统计数据
  const fetchTimeRelatedData = async (selectedTimeRange: TimeRange) => {
    const begin = getTimeRangeBegin(selectedTimeRange);
    const statGroup = getStatGroup(selectedTimeRange);
    // 并行获取时间相关的数据
    const [
      visitResponse,
      discussionResponse,
      searchResponse,
      visitTrendResponse, // 访问用户情况趋势（受时间范围控制）
      postTrendResponse, // 发帖情况趋势（受时间范围控制）
    ] = await Promise.all([
      getAdminStatVisit({ begin }),
      getAdminStatDiscussion({ begin }),
      getAdminStatSearch({ begin }),

      // 访问用户情况趋势 - 受时间范围控制
      getAdminStatTrend({
        begin,
        stat_group: statGroup,
        stat_types: [ModelStatType.StatTypeVisit], // [1]
      }),

      // 发帖情况趋势 - 受时间范围控制
      getAdminStatTrend({
        begin,
        stat_group: statGroup,
        stat_types: [
          ModelStatType.StatTypeDiscussionQA,
          ModelStatType.StatTypeDiscussionBlog,
          ModelStatType.StatTypeDiscussionIssue,
        ], // [5, 6, 7]
      }),
    ]);

    // 只返回时间相关的数据（不要在这里 setState，避免 effect 调用链触发规则）
    return {
      visitStats: visitResponse || null,
      discussionStats: discussionResponse || null,
      discussions: discussionResponse?.discussions || null,
      searchCount: searchResponse || 0,
      // 独立的趋势数据 - 新API结构：response.data.items
      visitTrendData: visitTrendResponse?.items || [],
      postTrendData: postTrendResponse?.items || [],
    } satisfies Partial<DashboardData>;
  };

  // 获取AI相关数据（不受时间影响）
  const fetchAIData = async () => {
    const thirtyDaysBegin = Math.floor((new Date().getTime() - 30 * 24 * 60 * 60 * 1000) / 1000);

    // 并行获取AI相关数据
    const [
      aiResponseRateResponse, // AI 应答率趋势原始数据（固定30天）
      aiResolveRateResponse, // AI 解决率趋势原始数据（固定30天）
      aiInsightResponse,
    ] = await Promise.all([
      // AI 应答率趋势原始数据 - 固定30天
      getAdminStatTrend({
        begin: thirtyDaysBegin,
        stat_group: 2, // 按天分组，30天趋势
        stat_types: [ModelStatType.StatTypeDiscussionQA, ModelStatType.StatTypeBotUnknown], // [5, 3]
      }),

      // AI 解决率趋势原始数据 - 固定30天
      getAdminStatTrend({
        begin: thirtyDaysBegin,
        stat_group: 2, // 按天分组，30天趋势
        stat_types: [ModelStatType.StatTypeBotAccept, ModelStatType.StatTypeDiscussionQA], // [4, 5]
      }),

      getAdminRankAiInsight(),
    ]);

    // 只返回AI相关的数据（不要在这里 setState，避免 effect 调用链触发规则）
    return {
      aiInsights: aiInsightResponse || [],
      aiResponseRateData: aiResponseRateResponse?.items || [],
      aiResolveRateData: aiResolveRateResponse?.items || [],
    } satisfies Partial<DashboardData>;
  };

  // 格式化 AI 洞察数据
  const aiInsightData = useMemo(() => {
    const insightData = data.aiInsights;
    if (!insightData || insightData.length === 0) {
      return [];
    }

    const now = dayjs();
    const currentWeekStart = now.startOf('week');

    return insightData.map((item: ModelRankTimeGroup) => {
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
      // 确保 items 是一个数组
      const items = Array.isArray(item.items) ? item.items : [];

      return {
        title: '发现新的知识缺口',
        subtitle,
        items: items,
      };
    });
  }, [data.aiInsights]);
  // 初始化数据获取 - 只在组件挂载时获取一次AI数据和时间相关数据
  useEffect(() => {
    let cancelled = false;
    void fetchAIData()
      .then(partial => {
        if (cancelled) return;
        setError(null);
        setData(prev => ({ ...prev, ...partial }));
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to fetch AI data:', err);
        setError('AI数据加载失败，请稍后重试');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 时间相关数据获取 - 只在时间范围改变时获取
  useEffect(() => {
    let cancelled = false;
    void fetchTimeRelatedData(timeRange)
      .then(partial => {
        if (cancelled) return;
        setError(null);
        setData(prev => ({ ...prev, ...partial }));
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to fetch time related data:', err);
        setError('数据加载失败，请稍后重试');
      });

    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  // 处理时间范围变更
  const handleTimeRangeChange = (
    _: React.MouseEvent<HTMLElement>,
    newAlignment: TimeRange | null
  ) => {
    if (newAlignment !== null) {
      setTimeRange(newAlignment);
    }
  };

  // 计算访问用户情况图表数据
  const visitChartData = useMemo(() => {
    if (!data.visitTrendData || data.visitTrendData.length === 0) {
      return [];
    }
    return transformTrendData(data.visitTrendData, timeRange);
  }, [data.visitTrendData, timeRange]);

  // 计算发帖情况图表数据
  const postChartData = useMemo(() => {
    if (!data.postTrendData || data.postTrendData.length === 0) {
      return [];
    }
    return transformTrendData(data.postTrendData, timeRange);
  }, [data.postTrendData, timeRange]);

  // 计算 AI 应答率趋势数据
  const aiResponseRateData = useMemo(() => {
    if (!data.aiResponseRateData || data.aiResponseRateData.length === 0) {
      return [];
    }

    // API返回的数据已包含QA和BotUnknown类型，直接传递给转换函数
    // 转换函数内部会根据不同的type进行分组处理
    return transformAIResponseRateTrendData(data.aiResponseRateData);
  }, [data.aiResponseRateData]);

  // 计算 AI 解决率趋势数据
  const aiResolveRateData = useMemo(() => {
    if (!data.aiResolveRateData || data.aiResolveRateData.length === 0) {
      return [];
    }

    // API返回的数据已包含QA和BotAccept类型，直接传递给转换函数
    // 转换函数内部会根据不同的type进行分组处理
    return transformAIResolveRateTrendData(data.aiResolveRateData);
  }, [data.aiResolveRateData]);

  // 计算统计数据
  const metrics = useMemo(() => {
    const visitStats = data.visitStats;
    const discussionStats = data.discussionStats;
    const searchCount = data.searchCount;
    const qaCount =
      (data.discussions && data.discussions?.find(item => item.key === 'qa')?.count) || 0;
    const posts = data.discussions?.reduce((sum, item) => sum + (item.count || 0), 0) || 0;
    return {
      // 访问相关指标
      visits: formatNumber(visitStats?.pv || 0),
      uniqueVisitors: formatNumber(visitStats?.uv || 0),
      searches: formatNumber(searchCount || 0),
      posts: formatNumber(posts),

      // AI相关指标
      aiResponseRate: formatPercentage(
        qaCount > 0 ? ((qaCount - (discussionStats?.bot_unknown || 0)) / qaCount) * 100 : 0
      ),
      aiResolveRate: formatPercentage(
        qaCount > 0 ? ((discussionStats?.bot_accept || 0) / qaCount) * 100 : 0
      ),
      totalResolveRate: formatPercentage(
        qaCount > 0 ? ((discussionStats?.accept || 0) / qaCount) * 100 : 0
      ),
      humanResponseTime: formatTime((discussionStats?.human_resp_time || 0) / (posts || 1)),
    };
  }, [data]);

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  // 显示加载状态
  const isLoading =
    !data.visitStats &&
    !data.discussionStats &&
    !data.searchCount &&
    !data.visitTrendData &&
    !data.postTrendData &&
    !data.aiResponseRateData &&
    !data.aiResolveRateData;

  return (
    <>
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && (
        <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
          <Grid
            container
            spacing={2}
            sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
          >
            {/* 第一行：主内容区域 */}
            <Grid size={12} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Grid container spacing={2} sx={{ flex: 1 }}>
                {/* 主仪表板卡片 */}
                <Grid size={{ xs: 12, lg: 9 }} sx={{ display: 'flex' }}>
                  <MainDashboardCard sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* 时间选择器 */}
                    <TopFilter value={timeRange} onChange={handleTimeRangeChange} />

                    {/* 顶部统计卡片区域 */}
                    <Grid container spacing={2} sx={{ mb: 2, flexShrink: 0 }}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <StatCard
                          type="blue"
                          metrics={[
                            {
                              value: metrics.visits,
                              label: '访问次数',
                              icon: <DashboardIcon sx={{ fontSize: 14 }} />,
                            },
                            {
                              value: metrics.uniqueVisitors,
                              label: '独立访客',
                              icon: <People sx={{ fontSize: 14 }} />,
                            },
                            {
                              value: metrics.searches,
                              label: '搜索次数',
                              icon: <Search sx={{ fontSize: 14 }} />,
                            },
                            {
                              value: metrics.posts,
                              label: '发帖数',
                              icon: <Description sx={{ fontSize: 14 }} />,
                            },
                          ]}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <StatCard
                          type="purple"
                          metrics={[
                            {
                              value: metrics.aiResponseRate,
                              unit: '%',
                              label: 'AI 应答率',
                              icon: <Comment sx={{ fontSize: 14 }} />,
                            },
                            {
                              value: metrics.aiResolveRate,
                              unit: '%',
                              label: 'AI 解决率',
                              icon: <Bolt sx={{ fontSize: 14 }} />,
                            },
                            {
                              value: metrics.totalResolveRate,
                              unit: '%',
                              label: '总解决率',
                              icon: <CheckCircle sx={{ fontSize: 14 }} />,
                            },
                            {
                              value: metrics.humanResponseTime,
                              label: '人工响应',
                              icon: <AccessTime sx={{ fontSize: 14 }} />,
                            },
                          ]}
                        />
                      </Grid>
                    </Grid>

                    {/* 柱状图区域 */}
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <ChartSection title="访问用户情况" showTime={false}>
                          <ResponsiveContainer width="100%" height="100%">
                            <div style={{ outline: 'none' }} onMouseDown={e => e.preventDefault()}>
                              <BarChart
                                data={visitChartData}
                                barSize={8}
                                margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                              >
                                <CartesianGrid
                                  vertical={false}
                                  strokeDasharray="3 3"
                                  stroke="#f0f0f0"
                                />
                                <XAxis
                                  dataKey="name"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                                  tickFormatter={formatXAxisLabel}
                                  interval={6}
                                />
                                <Tooltip
                                  cursor={{ fill: '#f9fafb' }}
                                  contentStyle={{
                                    borderRadius: 8,
                                    border: 'none',
                                    boxShadow: theme.shadows[3],
                                  }}
                                  formatter={(value: any) => {
                                    return [
                                      <span
                                        style={{ color: '#2E6AFE' }}
                                      >{`访问量: ${value}`}</span>,
                                    ];
                                  }}
                                  labelFormatter={label => {
                                    return `${label}`;
                                  }}
                                />
                                <Bar
                                  dataKey="visits"
                                  fill="url(#visitGradient)"
                                  radius={[4, 4, 0, 0]}
                                />
                                <defs>
                                  <linearGradient id="visitGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2E6AFE" />
                                    <stop offset="100%" stopColor="#6894FD" />
                                  </linearGradient>
                                </defs>
                              </BarChart>
                            </div>
                          </ResponsiveContainer>
                        </ChartSection>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <ChartSection title="发帖情况" showTime={false}>
                          <ResponsiveContainer width="100%" height="100%">
                            <div style={{ outline: 'none' }} onMouseDown={e => e.preventDefault()}>
                              <BarChart
                                data={postChartData}
                                barSize={8}
                                margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                              >
                                <CartesianGrid
                                  vertical={false}
                                  strokeDasharray="3 3"
                                  stroke="#f0f0f0"
                                />
                                <XAxis
                                  dataKey="name"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                                  tickFormatter={formatXAxisLabel}
                                  interval={6}
                                />
                                <Tooltip
                                  cursor={{ fill: '#f9fafb' }}
                                  contentStyle={{
                                    borderRadius: 8,
                                    border: 'none',
                                    boxShadow: theme.shadows[3],
                                  }}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length > 0) {
                                      const data = payload[0].payload as ChartDataPoint;
                                      return (
                                        <Box
                                          sx={{
                                            backgroundColor: 'white',
                                            padding: 1.5,
                                            borderRadius: 1,
                                            boxShadow: theme.shadows[3],
                                          }}
                                        >
                                          <Typography
                                            variant="body2"
                                            sx={{ mb: 1, fontWeight: 400 }}
                                          >
                                            {payload[0].payload.name}
                                          </Typography>
                                          <Stack spacing={0.5}>
                                            <Typography
                                              variant="body2"
                                              sx={{ color: 'rgba(99, 103, 233, 1)' }}
                                            >
                                              问题：{data.qa || 0}
                                            </Typography>
                                            <Typography
                                              variant="body2"
                                              sx={{ color: 'rgba(99, 103, 233, 1)' }}
                                            >
                                              issue：{data.issue || 0}
                                            </Typography>
                                            <Typography
                                              variant="body2"
                                              sx={{ color: 'rgba(99, 103, 233, 1)' }}
                                            >
                                              文章：{data.blog || 0}
                                            </Typography>
                                          </Stack>
                                        </Box>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar
                                  dataKey="posts"
                                  fill="url(#postGradient)"
                                  radius={[4, 4, 0, 0]}
                                />
                                <defs>
                                  <linearGradient id="postGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6367E9" />
                                    <stop offset="100%" stopColor="#9CA0F6" />
                                  </linearGradient>
                                </defs>
                              </BarChart>
                            </div>
                          </ResponsiveContainer>
                        </ChartSection>
                      </Grid>
                    </Grid>
                  </MainDashboardCard>
                </Grid>

                {/* 右侧 AI 洞察卡片 */}
                <Grid
                  size={{ xs: 12, lg: 3 }}
                  sx={{
                    overflow: 'auto',
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
                    '&::-webkit-scrollbar-thumb': { background: '#c1c1c1', borderRadius: '3px' },
                    '&::-webkit-scrollbar-thumb:hover': { background: '#a8a8a8' },
                  }}
                >
                  <Card
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color="text.primary"
                      sx={{ mb: 1 }}
                    >
                      AI 洞察
                    </Typography>
                    <Stack
                      sx={{
                        flexGrow: 1,
                        overflowY: 'auto',
                        maxHeight: 'calc(35vh + 110px)', // 减去标题高度
                        '&::-webkit-scrollbar': {
                          width: '4px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: '#f1f1f1',
                          borderRadius: '2px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: '#c1c1c1',
                          borderRadius: '2px',
                          '&:hover': {
                            background: '#a8a8a8',
                          },
                        },
                      }}
                      spacing={1}
                    >
                      {aiInsightData && aiInsightData.length > 0 ? (
                        aiInsightData.map((insight, index) => {
                          return (
                            <InsightItem
                              key={index}
                              type={'normal'}
                              time={insight.subtitle}
                              title={insight.title}
                              scoreIds={insight.items}
                              isExpanded={true}
                              onQuestionClick={handleQuestionClick}
                            />
                          );
                        })
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textAlign: 'center', py: 4 }}
                        >
                          暂无AI洞察数据
                        </Typography>
                      )}
                    </Stack>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            {/* 第二行：AI 趋势图表 - 全宽底部区域 */}
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ChartSection title="AI 应答率趋势">
                    <ResponsiveContainer width="100%" height="100%">
                      <div style={{ outline: 'none' }} onMouseDown={e => e.preventDefault()}>
                        <LineChart
                          data={aiResponseRateData}
                          margin={{ left: 20, right: 10, top: 10, bottom: 10 }}
                        >
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                            interval={6}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 8,
                              border: 'none',
                              boxShadow: theme.shadows[3],
                            }}
                            formatter={(value: number) => [`${value.toFixed(1)}%`, 'AI 应答率']}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#2dd4bf"
                            strokeWidth={3}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </div>
                    </ResponsiveContainer>
                  </ChartSection>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ChartSection title="AI 解决率趋势">
                    <ResponsiveContainer width="100%" height="100%">
                      <div style={{ outline: 'none' }} onMouseDown={e => e.preventDefault()}>
                        <LineChart
                          data={aiResolveRateData}
                          margin={{ left: 20, right: 10, top: 10, bottom: 10 }}
                        >
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                            interval={6}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 8,
                              border: 'none',
                              boxShadow: theme.shadows[3],
                            }}
                            formatter={(value: number) => [`${value.toFixed(1)}%`, 'AI 解决率']}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#f97316"
                            strokeWidth={3}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </div>
                    </ResponsiveContainer>
                  </ChartSection>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* AI洞察详情弹窗 */}
      <Dialog
        open={insightModalOpen}
        onClose={handleCloseInsightModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <AIInsightDetailModal
            open={insightModalOpen}
            onClose={handleCloseInsightModal}
            insightData={currentInsightData}
            onUpdateAssociateId={handleUpdateAssociateId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Dashboard;
