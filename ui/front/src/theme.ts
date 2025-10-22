'use client'
// import { Roboto } from 'next/font/google';
import { createTheme } from '@mui/material/styles'
import { zhCN } from '@mui/material/locale'
// const roboto = Roboto({
//   weight: ['300', '400', '500', '700'],
//   subsets: ['latin'],
//   display: 'swap',
// });

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
        main: '#21222D',
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
        main: '#206CFF',
      },
      background: {
        default: '#F1F2F8',
        paper: '#FFFFFF',
        paper2: '#F1F2F8',
        paper3: '#F8F9FA',
        footer: '#14141B',
      },
      divider: '#ECEEF1',
      action: {
        active: 'rgba(33, 34, 45, 0.54)',
        hover: 'rgba(33, 34, 45, 0.04)',
        selected: 'rgba(33, 34, 45, 0.08)',
        disabled: 'rgba(33, 34, 45, 0.26)',
        disabledBackground: 'rgba(33, 34, 45, 0.12)',
      },
    },
    // typography: {
    //   fontFamily: roboto.style.fontFamily,
    // },

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
)

export default theme
