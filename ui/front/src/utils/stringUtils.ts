// 创建一个工具文件用于处理字符串操作
/**
 * 从HTML字符串中提取纯文本内容
 */
export const extractTextFromHTML = (html: string): string => {
  if (!html) return '';
  
  // 统一使用正则表达式移除HTML标签的方式，确保服务端和客户端结果一致
  // 先移除注释
  let text = html.replace(/<!--[\s\S]*?-->/g, '');
  // 移除HTML标签
  text = text.replace(/<[^>]*>/g, '');
  // 移除多余的空白字符
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

/**
 * 截断文本并添加省略号
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};