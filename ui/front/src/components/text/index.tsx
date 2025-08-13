import { styled } from '@mui/material/styles';
import { defaultText } from '@/asset/styles/colors';

type sizeType = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
type weightType = 'bold' | 'thin' | 'regular';
type langType = 'zh' | 'en' | 'num';
export interface TitleTextProps {
  size?: sizeType;
  weight?: weightType;
  lang?: langType;
  hover?: 'true' | 'false';
}

const sizeChart = {
  xs: { fontSize: '14px', lineHeight: '22px' },
  sm: { fontSize: '16px', lineHeight: '24px' },
  md: { fontSize: '24px', lineHeight: '32px' },
  lg: { fontSize: '32px', lineHeight: '40px' },
  xl: { fontSize: '44px', lineHeight: '48px' },
  xxl: { fontSize: '60px', lineHeight: '68px' },
};
const weightChart = {
  bold: 'AlibabaPuHuiTiBold',
  thin: 'AlibabaPuHuiTiThin',
  regular: 'AlibabaPuHuiTiRegular',
};

const langFont = (weight: weightType) => ({
  zh: `${weightChart[weight]}, "PingFang SC"`,
  en: `"Helvetica Neue", Gilroy`,
  num: `DIN`,
});

const Text = styled('div', {
  shouldForwardProp: (prop) =>
    prop !== 'size' && prop !== 'weight' && prop !== 'lang',
})<TitleTextProps>(
  ({ size = 'sm', weight = 'regular', lang = 'zh', theme }) => ({
    fontFamily: langFont(weight)[lang],
    ...sizeChart[size],
    color: defaultText,
    '& > a': {
      textDecoration: 'none',
      color: 'inherit',
      fontFamily: langFont(weight)[lang],
    },
    [theme.breakpoints.down('sm')]: {
      fontFamily: `"PingFang SC"`,
      fontWeight: weight,
    },
  })
);

export const TextH1 = styled('h1', {
  shouldForwardProp: (prop) =>
    prop !== 'size' && prop !== 'weight' && prop !== 'lang',
})<TitleTextProps>(
  ({ size = 'sm', weight = 'regular', lang = 'zh', theme }) => ({
    fontFamily: langFont(weight)[lang],
    ...sizeChart[size],
    color: defaultText,
    '& > a': {
      textDecoration: 'none',
      color: 'inherit',
      fontFamily: langFont(weight)[lang],
    },
    [theme.breakpoints.down('sm')]: {
      fontFamily: `"PingFang SC"`,
      fontWeight: weight,
    },
  })
);

export default Text;
