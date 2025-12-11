'use client'
import { createTheme } from '@mui/material/styles'
import { zhCN } from '@mui/material/locale'
import { zhCN as CuiZhCN } from '@ctzhian/ui/dist/local'

// 统一色板（品牌主色为 #006397）
export const colors = {
  primary: '#006397',
  primaryHover: '#1A7FAE',
  primaryActive: '#004F73',
  primaryLight: '#E6F1F8',
  primaryGradient: 'linear-gradient(270deg, #1A7FAE 0%, #006397 100%)',

  secondary: '#E6F1F8',
  secondaryHover: '#EDF5FA',
  secondaryActive: '#D7E9F4',

  success: '#27AE60',
  warning: '#FFBF00',
  danger: '#F64E54',
  dangerGradient: 'linear-gradient(225deg, #FF1F1F 0%, #F78900 100%)',
  info: '#006397',

  white: '#FFFFFF',
  black: '#000000',

  textPrimary: '#21222D',
  textSecondary: 'rgba(33,34,45, 0.7)',
  textAuxiliary: 'rgba(33,34,45, 0.5)',
  textDisabled: 'rgba(33,34,45, 0.2)',
  disabledText: '#BFBFBF',

  backgroundDefault: '#f1f2f8',
  backgroundPaper: '#FFFFFF',
  backgroundPaper2: '#F1F2F8',
  backgroundPaper3: '#F8F9FA',
  footer: '#14141B',
  divider: 'rgba(217, 222, 226, 1)',

  actionActive: 'rgba(33, 34, 45, 0.54)',
  actionHover: 'rgba(33, 34, 45, 0.04)',
  actionSelected: 'rgba(33, 34, 45, 0.08)',
  actionDisabled: 'rgba(33, 34, 45, 0.26)',
  actionDisabledBg: 'rgba(33, 34, 45, 0.12)',

  shadow: '0 4px 14px 0 #1A041B0F',
  disabledBg: '#F7F7F7',
}

declare module '@mui/material/styles' {
  interface Palette {
    neutral?: Palette['primary']
  }

  // allow configuration using `createTheme`
  interface PaletteOptions {
    neutral?: PaletteOptions['primary']
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

const theme = createTheme(
  {
    cssVariables: true, // 启用 CSS 变量
    palette: {
      mode: 'light',
      primary: {
        main: colors.primary,
        light: colors.primaryHover,
        dark: colors.primaryActive,
        contrastText: colors.white,
      },
      secondary: {
        main: colors.secondary,
        light: colors.secondaryHover,
        dark: colors.secondaryActive,
        contrastText: colors.primary,
      },
      success: {
        main: colors.success,
      },
      warning: {
        main: colors.warning,
      },
      error: {
        main: colors.danger,
      },
      info: {
        main: colors.info,
      },
      common: {
        white: colors.white,
        black: colors.black,
      },
      neutral: {
        main: colors.backgroundPaper,
        contrastText: colors.textSecondary,
      },
      background: {
        default: colors.backgroundDefault,
        paper: colors.backgroundPaper,
        paper2: colors.backgroundPaper2,
        paper3: colors.backgroundPaper3,
        footer: colors.footer,
      },
      divider: colors.divider,
      action: {
        active: colors.actionActive,
        hover: colors.actionHover,
        selected: colors.actionSelected,
        disabled: colors.actionDisabled,
        disabledBackground: colors.actionDisabledBg,
      },
      text: {
        primary: colors.textPrimary,
        secondary: colors.textSecondary,
        // @ts-ignore
        auxiliary: colors.textAuxiliary,
        disabled: colors.textDisabled,
      },
    },
    shape: {
      borderRadius: 8, // 添加默认的圆角配置
    },
    typography: {
      fontFamily: [
        'Glibory',
        'Gilroy',
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
            backgroundColor: colors.backgroundPaper,
            color: colors.textPrimary,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            // 移除 webkit autofill 的 box-shadow 和 text-fill-color
            '& .MuiOutlinedInput-input:-webkit-autofill': {
              WebkitBoxShadow: 'none',
              WebkitTextFillColor: 'unset',
              boxShadow: 'none',
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
          
          // notchedOutline: {
          //   borderColor: '#D9DEE2',
          // },
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
              color: colors.danger,
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
    },
  },
  zhCN,
  CuiZhCN,
)

export default theme
