import { Tags } from './tags';

export type Tool = {
  label: string;
  tags: Tags[];
  path: string;
  subTitle: string;
  key: string[];
};

export const allTools: Tool[] = [
  {
    label: '长亭 WebShell 检测',
    tags: [Tags.SAFE],
    path: '/',
    key: [],
    subTitle: '',
  },
];
