/**
 * 通用工具函数库
 * 整合和增强现有的工具函数
 */

/**
 * 条件类名合并工具
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 格式化数字 - 大数字显示为 K/M
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any;
  }

  if (obj instanceof Object) {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 检查是否为移动设备
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * 获取查询参数
 */
export function getQueryParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

/**
 * 设置查询参数
 */
export function setQueryParam(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.pushState({}, '', url.toString());
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 移除 HTML 标签
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * 检查是否为有效的 URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 随机数生成
 */
export function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 数组去重
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * 数组分组
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * 对象选取指定键
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * 对象排除指定键
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

/**
 * 等待条件满足
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return true;
    }
    await delay(interval);
  }

  return false;
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        return true;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch {
    return false;
  }
}

/**
 * 滚动到顶部
 */
export function scrollToTop(smooth = true): void {
  if (typeof window === 'undefined') return;
  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto',
  });
}

/**
 * 滚动到元素
 */
export function scrollToElement(
  element: HTMLElement | string,
  options?: ScrollIntoViewOptions
): void {
  const el = typeof element === 'string' 
    ? document.querySelector(element) 
    : element;
    
  if (el) {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      ...options,
    });
  }
}

/**
 * 格式化页面元数据
 */
export async function formatMeta(
  {
    title,
    description,
    keywords,
  }: { title?: string; description?: string; keywords?: string | string[] },
  parent: any
) {
  const keywordsIsEmpty = !keywords || (Array.isArray(keywords) && !keywords.length);
  const { description: parentDescription, keywords: parentKeywords } = await parent;
  return {
    title: title ,
    description: description || parentDescription,
    keywords: keywordsIsEmpty ? parentKeywords : keywords,
  };
}


/**
 * 根据 forum 信息构建路由 - 使用 route_name (无 /forum 层级)
 */
export function buildRouteWithRouteName(path: string, forum?: { id: number; route_name?: string } | null): string {
  // 如果路径已经包含 route_name，直接返回
  if (path.match(/^\/[^\/]+\//) || path.match(/^\/[^\/]+$/)) {
    return path;
  }
  
  // 如果提供了 forum 且有 route_name，则使用 route_name
  if (forum?.route_name) {
    // 处理以 / 开头的路径
    if (path.startsWith('/')) {
      return `/${forum.route_name}${path}`;
    } else {
      return `/${forum.route_name}/${path}`;
    }
  }
  
  // 如果无法获取 forum 信息，返回原路径
  return path;
}

/**
 * 根据 route_name 查找 forum 信息
 */
export function findForumByRouteName(forums: Array<{ id: number; route_name?: string }>, routeName: string) {
  return forums.find(forum => forum.route_name === routeName);
}

/**
 * 根据 forum_id 查找 forum 信息
 */
export function findForumById(forums: Array<{ id: number; route_name?: string }>, forumId: number) {
  return forums.find(forum => forum.id === forumId);
}

/**
 * 清理 HTML 内容，防止 XSS 攻击
 * 使用 rehype-sanitize 来清理用户生成的 HTML 内容
 */
export async function sanitizeHTML(html: string): Promise<string> {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // 在服务端环境中，我们需要使用 Node.js 的 rehype-sanitize
  if (typeof window === 'undefined') {
    // 服务端环境：使用 rehype-sanitize
    try {
      const { rehype } = await import('rehype');
      const rehypeSanitize = await import('rehype-sanitize');
      
      const result = rehype()
        .data('settings', { fragment: true })
        .use(rehypeSanitize.default, {
          tagNames: ['p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'center'],
          attributes: {
            'a': ['href', 'title', 'target', 'rel'],
            'img': ['src', 'alt', 'title', 'width', 'height'],
            'table': ['border', 'cellpadding', 'cellspacing'],
            'th': ['colspan', 'rowspan'],
            'td': ['colspan', 'rowspan'],
            '*': ['class', 'id', 'style']
          }
        })
        .processSync(html);
      
      return String(result);
    } catch (error) {
      console.warn('HTML sanitization failed:', error);
      // 如果清理失败，返回转义的纯文本
      if (typeof html === 'string') {
        return html.replace(/[<>&"']/g, (match) => {
          const escapeMap: { [key: string]: string } = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#x27;'
          };
          return escapeMap[match];
        });
      }
      return '';
    }
  } else {
    // 客户端环境：使用 DOMPurify 或简单的清理
    try {
      // 创建一个临时的 DOM 元素来清理 HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // 移除所有 script 标签和事件处理器
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach(script => script.remove());
      
      // 移除所有事件处理器属性
      const allElements = tempDiv.querySelectorAll('*');
      allElements.forEach(element => {
        const attributes = Array.from(element.attributes);
        attributes.forEach(attr => {
          if (attr.name.startsWith('on')) {
            element.removeAttribute(attr.name);
          }
        });
      });
      
      return tempDiv.innerHTML;
    } catch (error) {
      console.warn('Client-side HTML sanitization failed:', error);
      // 如果清理失败，返回转义的纯文本
      if (typeof html === 'string') {
        return html.replace(/[<>&"']/g, (match) => {
          const escapeMap: { [key: string]: string } = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#x27;'
          };
          return escapeMap[match];
        });
      }
      return '';
    }
  }
}

