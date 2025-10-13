/**
 * 全局常量定义
 * 集中管理应用中使用的常量
 */

// API 相关常量
export const API_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 10,
  DEFAULT_PAGE: 1,
  MAX_PAGE_SIZE: 100,
  REQUEST_TIMEOUT: 30000, // 30秒
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  // 缓存配置
  CACHE: {
    SHORT: 60 * 1000, // 1分钟
    MEDIUM: 5 * 60 * 1000, // 5分钟
    LONG: 60 * 60 * 1000, // 1小时
    VERY_LONG: 24 * 60 * 60 * 1000, // 24小时
  },
} as const;

// 缓存键前缀
export const CACHE_KEYS = {
  USER: 'user',
  DISCUSSION: 'discussion',
  GROUP: 'group',
  ARTICLE: 'article',
} as const;

// 路由常量
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  DISCUSS: '/discuss',
  NOT_FOUND: '/not-found',
} as const;

// 本地存储键
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'userInfo',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

// 验证规则
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
} as const;

// 响应式断点（对应 MUI）
export const BREAKPOINTS = {
  XS: 0,
  SM: 600,
  MD: 900,
  LG: 1200,
  XL: 1536,
} as const;

// 颜色常量
export const COLORS = {
  PRIMARY: '#206CFF',
  SECONDARY: '#FFA726',
  SUCCESS: '#4CAF50',
  ERROR: '#F44336',
  WARNING: '#FF9800',
  INFO: '#2196F3',
  TEXT: {
    PRIMARY: 'rgba(0, 0, 0, 0.87)',
    SECONDARY: 'rgba(0, 0, 0, 0.6)',
    DISABLED: 'rgba(0, 0, 0, 0.38)',
  },
} as const;

// 时间格式
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  FULL: 'YYYY-MM-DD HH:mm:ss',
  SHORT: 'MM/DD',
} as const;

// HTTP 状态码
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// 功能开关（可以通过环境变量控制）
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  ENABLE_DEBUG: process.env.NODE_ENV === 'development',
  ENABLE_SERVICE_WORKER: process.env.NEXT_PUBLIC_ENABLE_SW === 'true',
} as const;

