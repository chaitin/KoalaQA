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
 * 从Markdown或HTML字符串中提取纯文本内容
 * 支持同时处理HTML和Markdown格式
 */
export const extractTextFromMarkdown = (content: string): string => {
  if (!content) return '';
  
  let text = content;
  
  // 先处理HTML格式：移除HTML标签和注释
  // 移除注释
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  // 移除script和style标签及其内容
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // 移除HTML标签
  text = text.replace(/<[^>]*>/g, '');
  
  // 解码HTML实体（使用DOM API如果可用，否则使用正则表达式）
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // 浏览器环境：使用DOM API解码HTML实体
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      text = tempDiv.textContent || tempDiv.innerText || text;
    } catch (e) {
      // 如果DOM解码失败，使用正则表达式
      text = decodeHTMLEntities(text);
    }
  } else {
    // 服务端环境：使用正则表达式解码
    text = decodeHTMLEntities(text);
  }
  
  // 再处理Markdown格式
  // 移除代码块（```code```）
  text = text.replace(/```[\s\S]*?```/g, '');
  
  // 移除行内代码（`code`）
  text = text.replace(/`[^`]*`/g, '');
  
  // 移除图片标记（![alt](url)）
  text = text.replace(/!\[([^\]]*)\]\([^\)]*\)/g, '');
  
  // 移除链接标记（[text](url)），保留文本部分
  text = text.replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1');
  
  // 移除标题标记（#, ##, ### 等）
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // 移除粗体/斜体标记（**, *, __, _）
  text = text.replace(/\*\*([^\*]*)\*\*/g, '$1');
  text = text.replace(/\*([^\*]*)\*/g, '$1');
  text = text.replace(/__([^_]*)__/g, '$1');
  text = text.replace(/_([^_]*)_/g, '$1');
  
  // 移除删除线标记（~~text~~）
  text = text.replace(/~~([^~]*)~~/g, '$1');
  
  // 移除列表标记（-, *, +, 1.）
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');
  
  // 移除引用标记（>）
  text = text.replace(/^>\s+/gm, '');
  
  // 移除水平线（---, ***）
  text = text.replace(/^[-*]{3,}$/gm, '');
  
  // 移除表格标记（|）
  text = text.replace(/\|/g, ' ');
  
  // 移除多余的空白字符
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

/**
 * 使用正则表达式解码常见的HTML实体
 */
const decodeHTMLEntities = (text: string): string => {
  const entityMap: { [key: string]: string } = {
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&cent;': '¢',
    '&pound;': '£',
    '&yen;': '¥',
    '&euro;': '€',
    '&copy;': '©',
    '&reg;': '®',
  };
  
  // 先解码命名实体
  for (const entity in entityMap) {
    text = text.replace(new RegExp(entity, 'g'), entityMap[entity]);
  }
  
  // 解码数字实体（&#123; 或 &#x1F;）
  text = text.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  text = text.replace(/&#x([a-f\d]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return text;
};

/**
 * 截断文本并添加省略号
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};