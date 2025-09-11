import { ResolvingMetadata } from 'next';

export function formatNumber(num: number) {
  if (num >= 1000) {
    return +(num / 1000).toFixed(1) + 'k';
  } else {
    return num.toString();
  }
}

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    'Bytes',
    'KiB',
    'MiB',
    'GiB',
    'TiB',
    'PiB',
    'EiB',
    'ZiB',
    'YiB',
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(dm)} ${sizes[i]}`;
};

export const formatMeta = async (
  {
    title,
    description,
    keywords,
  }: { title?: string; description?: string; keywords?: string | string[] },
  parent: ResolvingMetadata
) => {
  const keywordsIsEmpty = !keywords || (Array.isArray(keywords) && !keywords.length);
  const { description: parentDescription, keywords: parentKeywords } = await parent;
  return {
    title: title + ' | Koala QA',
    description: description || parentDescription,
    keywords: keywordsIsEmpty ? parentKeywords : keywords,
  };
};

// 修改颜色透明度
export function addOpacityToColor(color: string, opacity: number) {
  let red, green, blue;

  if (color.startsWith("#")) {
    // 如果颜色以 "#" 开头，则为 16 进制格式，需要转换为 RGB 格式
    red = parseInt(color.slice(1, 3), 16);
    green = parseInt(color.slice(3, 5), 16);
    blue = parseInt(color.slice(5, 7), 16);
  } else if (color.startsWith("rgb")) {
    // 如果颜色以 "rgb" 开头，则为 RGB 格式，直接解析即可
    const matches = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/) as RegExpMatchArray;
    red = parseInt(matches[1], 10);
    green = parseInt(matches[2], 10);
    blue = parseInt(matches[3], 10);
  } else {
    // 其他情况下无法识别颜色格式，返回空字符串
    return "";
  }

  // 将透明度转换为小数
  const alpha = opacity;

  // 返回带透明度的 RGBA 颜色值
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function validateEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}
