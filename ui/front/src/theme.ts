'use client'
import { createTheme, alpha, Theme } from '@mui/material/styles'
import { zhCN } from '@mui/material/locale'
import { zhCN as CuiZhCN } from '@ctzhian/ui/dist/local'

/**
 * 颜色配置 - 遵循 MUI 颜色规范
 * 品牌主色: #006397 (深蓝色)
 */

// 工具函数：RGB 字符串转十六进制
function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) {
    return rgb // 如果不是 RGB 格式，直接返回
  }
  const r = parseInt(match[1], 10)
  const g = parseInt(match[2], 10)
  const b = parseInt(match[3], 10)
  return `#${[r, g, b]
    .map((x) => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    })
    .join('')}`
}

// 工具函数：计算更浅的颜色（增加亮度）
function lightenColor(color: string, amount: number = 0.2): string {
  const hex = color.startsWith('#') ? color : rgbToHex(color)
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * amount))
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(255 * amount))
  const b = Math.min(255, (num & 0x0000ff) + Math.round(255 * amount))
  return `#${[r, g, b]
    .map((x) => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    })
    .join('')}`
}

// 工具函数：计算更深的颜色（减少亮度）
function darkenColor(color: string, amount: number = 0.2): string {
  const hex = color.startsWith('#') ? color : rgbToHex(color)
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount))
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * amount))
  const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * amount))
  return `#${[r, g, b]
    .map((x) => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    })
    .join('')}`
}

// 工具函数：判断颜色是深色还是浅色，返回合适的对比色
// 使用更保守的策略：只有非常浅的颜色（亮度 > 200）才使用黑色文字，其他都使用白色文字
// 这样可以确保按钮、Chip 等组件在大多数主题色下都有良好的可读性
function getContrastText(color: string): string {
  const hex = color.startsWith('#') ? color : rgbToHex(color)
  const num = parseInt(hex.replace('#', ''), 16)
  const r = num >> 16
  const g = (num >> 8) & 0x00ff
  const b = num & 0x0000ff
  // 计算相对亮度（使用标准公式）
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  // 提高阈值到 200，只有非常浅的颜色才使用黑色文字
  // 这样可以确保大多数主题色（包括中等亮度的颜色）都使用白色文字
  return brightness > 200 ? '#000000' : '#FFFFFF'
}

// 默认主色系 - Primary (#006397)
const DEFAULT_PRIMARY_MAIN = '#006397'
const DEFAULT_PRIMARY_LIGHT = '#1A7FAE'
const DEFAULT_PRIMARY_DARK = '#004A73'
const DEFAULT_PRIMARY_CONTRAST = '#FFFFFF'

// 次色系 - Secondary (#E6F1F8)
const SECONDARY_MAIN = '#E6F1F8'
const SECONDARY_LIGHT = '#EDF5FA' // 更浅的浅蓝色
const SECONDARY_DARK = '#D7E9F4' // 更深的浅蓝色
const SECONDARY_CONTRAST = DEFAULT_PRIMARY_MAIN // 深蓝色文字，与浅色背景形成对比

// 成功色 - Success (#27AE60)
const SUCCESS_MAIN = '#1AA086'
const SUCCESS_LIGHT = '#50B89C' // 更浅的绿色
const SUCCESS_DARK = '#359B7C' // 更深的绿色
const SUCCESS_CONTRAST = '#FFFFFF'

// 警告色 - Warning (#FFBF00)
const WARNING_MAIN = '#FFBF00'
const WARNING_LIGHT = '#FFD633' // 更浅的黄色
const WARNING_DARK = '#CC9900' // 更深的黄色
const WARNING_CONTRAST = '#21222D' // 深色文字，与浅色背景形成对比

// 错误色 - Error (#F64E54)
const ERROR_MAIN = '#F64E54'
const ERROR_LIGHT = '#F87A7F' // 更浅的红色
const ERROR_DARK = '#C43E43' // 更深的红色
const ERROR_CONTRAST = '#FFFFFF'

// 边框颜色 - Border (#EAECF0)
const BORDER_COLOR = '#EAECF0'

// 信息色 - Info (默认使用 Primary)
const getInfoColors = (primaryMain: string) => ({
  main: primaryMain,
  light: lightenColor(primaryMain, 0.15),
  dark: darkenColor(primaryMain, 0.2),
  contrast: getContrastText(primaryMain),
})

// 创建颜色配置对象
const createColors = (
  primaryMain: string = DEFAULT_PRIMARY_MAIN,
  backgroundColor?: string,
  isDarkTheme: boolean = false,
) => {
  const primaryLight = lightenColor(primaryMain, 0.15)
  const primaryDark = darkenColor(primaryMain, 0.2)

  // 根据主题模式调整颜色
  const textPrimary = isDarkTheme ? '#FFFFFF' : '#21222D'
  const textSecondary = isDarkTheme ? 'rgba(255,255,255, 0.7)' : 'rgba(33,34,45, 0.7)'
  const textAuxiliary = isDarkTheme ? 'rgba(255,255,255, 0.5)' : 'rgba(33,34,45, 0.5)'
  const textDisabled = isDarkTheme ? 'rgba(255,255,255, 0.2)' : 'rgba(33,34,45, 0.2)'

  const backgroundDefault = backgroundColor || (isDarkTheme ? 'rgb(10,10,10)' : '#f1f5f9')
  const backgroundPaper = isDarkTheme ? '#1a1a1a' : '#FFFFFF'
  const backgroundPaper2 = isDarkTheme ? '#2a2a2a' : '#F1F2F8'
  const backgroundPaper3 = isDarkTheme ? '#333333' : '#F8F9FA'

  const divider = isDarkTheme ? '#404040' : '#D9DEE2'
  const border = isDarkTheme ? '#404040' : BORDER_COLOR
  const tableCellBorder = isDarkTheme ? '#404040' : '#E0E0E0' // 表格单元格边框
  const actionActive = isDarkTheme ? 'rgba(255, 255, 255, 0.54)' : 'rgba(33, 34, 45, 0.54)'
  const actionHover = isDarkTheme ? 'rgba(255, 255, 255, 0.04)' : 'rgba(33, 34, 45, 0.04)'
  const actionSelected = isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(33, 34, 45, 0.08)'
  const actionDisabled = isDarkTheme ? 'rgba(255, 255, 255, 0.26)' : 'rgba(33, 34, 45, 0.26)'
  const actionDisabledBg = isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : 'rgba(33, 34, 45, 0.12)'

  return {
    // Primary 色系
    primary: primaryMain,
    primaryHover: primaryLight,
    primaryActive: primaryDark,
    primaryLight: SECONDARY_MAIN, // 浅色背景
    primaryGradient: `linear-gradient(270deg, ${primaryLight} 0%, ${primaryMain} 100%)`,

    // Secondary 色系
    secondary: SECONDARY_MAIN,
    secondaryHover: SECONDARY_LIGHT,
    secondaryActive: SECONDARY_DARK,

    // 语义色
    success: SUCCESS_MAIN,
    warning: WARNING_MAIN,
    danger: ERROR_MAIN,
    dangerGradient: 'linear-gradient(225deg, #FF1F1F 0%, #F78900 100%)',
    info: primaryMain, // Info 使用主色

    // 基础色
    white: '#FFFFFF',
    black: '#000000',

    // 文本色
    textPrimary,
    textSecondary,
    textAuxiliary,
    textDisabled,
    disabledText: '#BFBFBF',

    // 背景色
    backgroundDefault,
    backgroundPaper,
    backgroundPaper2,
    backgroundPaper3,
    footer: isDarkTheme ? '#000000' : '#14141B',

    // 分割线和操作状态
    divider,
    border, // 边框颜色
    tableCellBorder, // 表格单元格边框颜色
    actionActive,
    actionHover,
    actionSelected,
    actionDisabled,
    actionDisabledBg,

    // 其他
    shadow: '0 4px 14px 0 #1A041B0F',
    disabledBg: '#F7F7F7',
  }
}

// 统一色板（保持向后兼容）- 使用默认主题色
export const colors = createColors()

declare module '@mui/material/styles' {
  interface Palette {
    neutral?: Palette['primary']
    primaryAlpha?: {
      3: string // primary.main 的 3% 透明度 - 非常浅的背景
      6: string // primary.main 的 6% 透明度 - 浅背景
      10: string // primary.main 的 10% 透明度 - 边框和 hover
      12: string // primary.main 的 12% 透明度 - 更深的 hover
      30: string // primary.main 的 30% 透明度 - 图标颜色
      50: string // primary.main 的 50% 透明度 - 聚焦边框
    }
    border?: string // 边框颜色
    tableCellBorder?: string // 表格单元格边框颜色
  }

  // allow configuration using `createTheme`
  interface PaletteOptions {
    neutral?: PaletteOptions['primary']
    primaryAlpha?: {
      3?: string
      6?: string
      10?: string
      12?: string
      30?: string
      50?: string
    }
    border?: string // 边框颜色
    tableCellBorder?: string // 表格单元格边框颜色
  }

  interface TypeBackground {
    paper2?: string
    paper3?: string
    footer?: string
  }
}
declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    neutral?: true
  }
}

/**
 * 根据主题色和背景色创建主题
 * @param primaryColor - 主题色，支持 RGB 格式（如 "rgb(254, 102, 42)"）或十六进制格式（如 "#FE662A"）
 * @param backgroundColor - 背景色，支持 RGB 格式或十六进制格式，默认为 #F1F5F9
 */
export function createAppTheme(primaryColor?: string, backgroundColor?: string): Theme {
  // 如果没有提供主题色，使用默认值
  const primaryMain = primaryColor
    ? primaryColor.startsWith('#')
      ? primaryColor
      : rgbToHex(primaryColor)
    : DEFAULT_PRIMARY_MAIN

  // 判断是否为暗黑模式主题色
  const isDarkTheme = primaryMain === '#7A3DFF'

  // 如果没有提供背景色，根据主题色设置默认背景色
  let defaultBackground = '#F1F5F9' // 默认背景色
  if (primaryColor) {
    const backgroundMap: Record<string, string> = {
      '#EA4C89': '#F3F3F6',
      '#4285F4': '#F5F7F9',
      '#50A892': '#F8F8FA',
      '#FE662A': '#F7F7F7',
      '#006397': '#f6f7f9',
      '#7A3DFF': 'rgb(10,10,10)',
    }
    defaultBackground = backgroundMap[primaryMain] || '#F1F5F9'
  }

  const finalBackgroundColor = backgroundColor
    ? backgroundColor.startsWith('#')
      ? backgroundColor
      : rgbToHex(backgroundColor)
    : defaultBackground

  const primaryLight = primaryColor ? lightenColor(primaryMain, 0.15) : DEFAULT_PRIMARY_LIGHT
  const primaryDark = primaryColor ? darkenColor(primaryMain, 0.2) : DEFAULT_PRIMARY_DARK
  const primaryContrast = getContrastText(primaryMain)

  const infoColors = getInfoColors(primaryMain)
  const themeColors = createColors(primaryMain, finalBackgroundColor, isDarkTheme)

  const baseTheme = {
    cssVariables: true, // 启用 CSS 变量
    palette: {
      mode: isDarkTheme ? ('dark' as const) : ('light' as const),
      // Primary 色系 - 品牌主色
      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
        contrastText: primaryContrast,
      },
      // Secondary 色系 - 浅蓝色背景
      secondary: {
        main: SECONDARY_MAIN,
        light: SECONDARY_LIGHT,
        dark: SECONDARY_DARK,
        contrastText: SECONDARY_CONTRAST,
      },
      // Success 色系 - 成功状态
      success: {
        main: SUCCESS_MAIN,
        light: SUCCESS_LIGHT,
        dark: SUCCESS_DARK,
        contrastText: SUCCESS_CONTRAST,
      },
      // Warning 色系 - 警告状态
      warning: {
        main: WARNING_MAIN,
        light: WARNING_LIGHT,
        dark: WARNING_DARK,
        contrastText: WARNING_CONTRAST,
      },
      // Error 色系 - 错误状态
      error: {
        main: ERROR_MAIN,
        light: ERROR_LIGHT,
        dark: ERROR_DARK,
        contrastText: ERROR_CONTRAST,
      },
      // Info 色系 - 信息提示
      info: {
        main: infoColors.main,
        light: infoColors.light,
        dark: infoColors.dark,
        contrastText: infoColors.contrast,
      },
      // 通用颜色
      common: {
        white: themeColors.white,
        black: themeColors.black,
      },
      // 中性色 - 自定义扩展
      neutral: {
        main: themeColors.backgroundPaper,
        light: themeColors.backgroundPaper2,
        dark: themeColors.backgroundPaper3,
        contrastText: themeColors.textSecondary,
      },
      // Primary 半透明色 - 项目中常用的透明度变体
      primaryAlpha: {
        3: alpha(primaryMain, 0.03), // 非常浅的背景
        6: alpha(primaryMain, 0.06), // 浅背景
        10: alpha(primaryMain, 0.1), // 边框和 hover
        12: alpha(primaryMain, 0.12), // 更深的 hover
        30: alpha(primaryMain, 0.3), // 图标颜色
        50: alpha(primaryMain, 0.5), // 聚焦边框
      },
      // 背景色
      background: {
        default: themeColors.backgroundDefault,
        paper: themeColors.backgroundPaper,
        paper2: themeColors.backgroundPaper2,
        paper3: themeColors.backgroundPaper3,
        footer: themeColors.footer,
      },
      // 分割线
      divider: themeColors.divider,
      // 边框颜色
      border: themeColors.border,
      // 表格单元格边框颜色
      table: {
        cell: {
          border: themeColors.tableCellBorder,
        }
      },
      // 操作状态颜色
      action: {
        active: themeColors.actionActive,
        hover: themeColors.actionHover,
        selected: themeColors.actionSelected,
        disabled: themeColors.actionDisabled,
        disabledBackground: themeColors.actionDisabledBg,
      },
      // 文本颜色
      text: {
        primary: themeColors.textPrimary,
        secondary: themeColors.textSecondary,
        // @ts-ignore
        auxiliary: themeColors.textAuxiliary,
        disabled: themeColors.textDisabled,
      },
    },
    shape: {
      borderRadius: 8, // 添加默认的圆角配置
    },
    typography: {
      fontFamily: [
        'PingFang SC',
        'Hiragino Sans GB',
        'STHeiti',
        'Microsoft YaHei',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: themeColors.backgroundPaper,
            color: themeColors.textPrimary,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: themeColors.white,
            color: themeColors.textSecondary,
            border: `1px solid ${themeColors.divider}`,
            fontSize: '12px',
            '& h3': {
              marginTop: '6px',
              color: themeColors.textPrimary,
              marginBottom: '-16px!important',
              fontSize: '12px',
            },
          },
          arrow: {
            color: themeColors.white,
            '&::before': {
              backgroundColor: themeColors.white,
              border: `1px solid ${themeColors.divider}`,
              boxSizing: 'border-box',
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            // 移除 webkit autofill 的 box-shadow 和 text-fill-color
            '& .MuiOutlinedInput-input:-webkit-autofill': {
              WebkitBoxShadow: 'none',
              WebkitTextFillColor: 'unset',
              boxShadow: 'none',
            },
            '&:active .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: '1px',
            },
          }),
          input: {
            fontSize: '14px',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '14px',
          },
        },
      },
      MuiFormControl: {
        styleOverrides: {
          root: {
            '.MuiFormLabel-asterisk': {
              color: themeColors.danger,
            },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '14px',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            lineHeight: 1,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
            '&:active': {
              boxShadow: 'none',
            },
            '&.Mui-focusVisible': {
              boxShadow: 'none',
            },
          },
        },
      },
    },
  }

  // 先创建基础主题
  const theme = createTheme(baseTheme, zhCN, CuiZhCN)
  
  // 确保 breakpoints 配置被正确应用（防止被 locale 配置覆盖）
  return createTheme(theme, {
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1400, // 确保 lg 断点为 1400px
        xl: 1536,
      },
    },
  })
}

// 默认主题（使用默认主题色）
const theme = createAppTheme()

export default theme
