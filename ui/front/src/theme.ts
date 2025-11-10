'use client'
import { createTheme } from '@mui/material/styles'
import { zhCN } from '@mui/material/locale'
import { zhCN as CuiZhCN } from '@ctzhian/ui/dist/local'

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
        main: '#006397',
      },
      error: {
        main: '#F64E54',
      },
      common: {
        white: '#fff',
        black: '#000',
      },
      neutral: {
        main: '#fff',
        contrastText: 'rgba(0, 0, 0, 0.50)',
      },
      info: {
        main: '#006397',
      },
      background: {
        default: '#f1f2f8',
        paper: '#FFFFFF',
        paper2: '#F1F2F8',
        paper3: '#F8F9FA',
        footer: '#14141B',
      },
      divider: 'rgba(217, 222, 226, 1)',
      action: {
        active: 'rgba(33, 34, 45, 0.54)',
        hover: 'rgba(33, 34, 45, 0.04)',
        selected: 'rgba(33, 34, 45, 0.08)',
        disabled: 'rgba(33, 34, 45, 0.26)',
        disabledBackground: 'rgba(33, 34, 45, 0.12)',
      },
      text: {
        primary: '#21222D',
        secondary: 'rgba(33,34,45, 0.7)',
        // @ts-ignore
        auxiliary: 'rgba(33,34,45, 0.5)',
        disabled: 'rgba(33,34,45, 0.2)',
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
      MuiAlert: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            ...(ownerState.severity === 'info' && {
              backgroundColor: '#60a5fa',
            }),
          }),
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            '&.MuiInput-root::before': {
              borderColor: 'rgba(0, 0, 0, 0.13) ',
            },
            '&.MuiInput-root:hover::before': {
              borderColor: '#21222D !important',
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#21222D',
            },
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 0, 0, 0.13)',
            },
            // 移除 webkit autofill 的 box-shadow 和 text-fill-color
            '& .MuiOutlinedInput-input:-webkit-autofill': {
              WebkitBoxShadow: 'none',
              WebkitTextFillColor: 'unset',
              boxShadow: 'none',
            },
          },
        },
      },
      MuiFormControl: {
        styleOverrides: {
          root: {
            '.MuiFormLabel-asterisk': {
              color: '#F64E54',
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
    },
  },
  zhCN,
  CuiZhCN,
)

export default theme
