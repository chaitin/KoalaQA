import icon_hot from '@/asset/tag/hot.svg';
import icon_hot_check from '@/asset/tag/hot_check.svg';

export enum Tags {
  ENCODE = 'encode',
  TEXT = 'text',
  DEV = 'dev',
  ENCRYPT = 'encrypt',
  JSON = 'json',
  OTHER = 'other',
  HOT = 'hot',
  LIKE = 'like',
  IMAGE = 'image',
  BINARY = 'binary',
  SECURITY = 'security',
  OFFICIAL = 'official',
  SAFE = 'safe',
}
const tagColor = [
  ['rgba(245, 117, 130, 1)', 'rgba(245, 117, 130, 0.2)'],
  ['rgba(17, 35, 90, 1)', 'rgba(17, 35, 90, 0.2)'],
  ['rgba(117, 106, 182, 1)', 'rgba(117, 106, 182, 0.2)'],
  ['rgba(123, 211, 234, 1)', 'rgba(123, 211, 234, 0.2)'],
  ['rgba(125, 10, 10, 1)', 'rgba(125, 10, 10, 0.2)'],
  ['rgba(95, 134, 112, 1)', 'rgba(95, 134, 112, 0.2)'],
  ['rgba(57, 36, 103, 1)', 'rgba(57, 36, 103, 0.2)'],
  ['rgba(89, 111, 183, 1)', 'rgba(89, 111, 183, 0.2)'],
  ['rgba(172, 135, 197, 1)', 'rgba(172, 135, 197, 0.2)'],
  ['rgba(191, 49, 49, 1)', 'rgba(191, 49, 49, 0.2)'],
  ['rgba(56, 135, 190, 1)', 'rgba(56, 135, 190, 0.2)'],
  ['rgba(255, 152, 0, 1)', 'rgba(255, 152, 0, 0.2)'],
  ['rgba(93, 53, 135, 1)', 'rgba(93, 53, 135, 0.2)'],
  ['rgba(198, 207, 155, 1)', 'rgba(198, 207, 155, 0.2)'],
  ['rgba(184, 0, 0, 1)', 'rgba(184, 0, 0, 0.2)'],
  ['rgba(56, 65, 157, 1)', 'rgba(56, 65, 157, 0.2)'],
  ['rgba(205, 141, 122, 1)', 'rgba(205, 141, 122, 0.2)'],
  ['rgba(255, 214, 102, 1)', 'rgba(255, 214, 102, 0.2)'],
  ['rgba(248, 141, 72, 1)', 'rgba(248, 141, 72, 0.2)'],
  ['rgba(184, 137, 234, 1)', 'rgba(184, 137, 234, 0.2)'],
  ['rgba(242, 115, 181, 1)', 'rgba(242, 115, 181, 0.2)'],
  ['rgba(69, 218, 209, 1)', 'rgba(69, 218, 209, 0.2)'],
  ['rgba(64, 169, 255, 1)', 'rgba(64, 169, 255, 0.2)'],
  ['rgba(200, 167, 134, 1)', 'rgba(200, 167, 134, 0.2)'],
];

export interface Tag {
  name: Tags;
  icon: string;
  icon_check: string;
  label: string;
  bg_color: string;
  avatar_color: string;
}
export const allTags: Tag[] = [
  {
    name: Tags.SAFE,
    icon: icon_hot as any,
    icon_check: icon_hot_check as any,
    label: '热门工具',
    bg_color: '',
    avatar_color: '',
  },
].map((item, index) => {
  const [avatarColor, bgColor] = tagColor[index];
  if (!item.bg_color) item.bg_color = bgColor;
  if (!item.avatar_color) item.avatar_color = avatarColor;
  return item;
});
