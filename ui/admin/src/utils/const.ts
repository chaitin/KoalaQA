import { ModelFileType, ModelUserRole } from '@/api/types';

/**
 * 文件类型映射对象
 * 根据 ModelFileType 枚举值返回对应的文件类型名称
 */
export const FILE_TYPE_MAP: Record<ModelFileType, string> = {
  [ModelFileType.FileTypeUnknown]: '未知',
  [ModelFileType.FileTypeMarkdown]: 'Markdown',
  [ModelFileType.FileTypeHTML]: 'HTML',
  [ModelFileType.FileTypeJSON]: 'JSON',
  [ModelFileType.FileTypeURL]: 'URL',
  [ModelFileType.FileTypeDOCX]: 'Word文档 (DOCX)',
  [ModelFileType.FileTypeDOC]: 'Word文档 (DOC)',
  [ModelFileType.FileTypePPTX]: 'PowerPoint (PPTX)',
  [ModelFileType.FileTypeXLSX]: 'Excel (XLSX)',
  [ModelFileType.FileTypeXLS]: 'Excel (XLS)',
  [ModelFileType.FileTypePDF]: 'PDF',
  [ModelFileType.FileTypeImage]: '图片',
  [ModelFileType.FileTypeCSV]: 'CSV',
  [ModelFileType.FileTypeXML]: 'XML',
  [ModelFileType.FileTypeZIP]: 'ZIP压缩包',
  [ModelFileType.FileTypeEPub]: 'EPub电子书',
  [ModelFileType.FileTypeFolder]: '文件夹',
  [ModelFileType.FileTypeFile]: '文件',
  [ModelFileType.FileTypeMax]: '最大值',
};

/**
 * 获取文件类型名称
 * @param fileType ModelFileType 枚举值
 * @returns 文件类型的中文名称
 */
export const getFileTypeName = (fileType?: ModelFileType): string => {
  if (fileType === undefined || fileType === null) {
    return '未知';
  }
  return FILE_TYPE_MAP[fileType] || '未知';
};

/**
 * 获取文件类型图标（可选，用于UI显示）
 * @param fileType ModelFileType 枚举值
 * @returns 文件类型对应的图标名称或emoji
 */
export const getFileTypeIcon = (fileType?: ModelFileType): string => {
  if (fileType === undefined || fileType === null) {
    return '📄';
  }

  const iconMap: Record<ModelFileType, string> = {
    [ModelFileType.FileTypeUnknown]: '❓',
    [ModelFileType.FileTypeMarkdown]: '📝',
    [ModelFileType.FileTypeHTML]: '🌐',
    [ModelFileType.FileTypeJSON]: '📋',
    [ModelFileType.FileTypeURL]: '🔗',
    [ModelFileType.FileTypeDOCX]: '📄',
    [ModelFileType.FileTypeDOC]: '📄',
    [ModelFileType.FileTypePPTX]: '📊',
    [ModelFileType.FileTypeXLSX]: '📈',
    [ModelFileType.FileTypeXLS]: '📈',
    [ModelFileType.FileTypePDF]: '📕',
    [ModelFileType.FileTypeImage]: '🖼️',
    [ModelFileType.FileTypeCSV]: '📊',
    [ModelFileType.FileTypeXML]: '📋',
    [ModelFileType.FileTypeZIP]: '🗜️',
    [ModelFileType.FileTypeEPub]: '📚',
    [ModelFileType.FileTypeFolder]: '📁',
    [ModelFileType.FileTypeFile]: '📄',
    [ModelFileType.FileTypeMax]: '📄',
  };

  return iconMap[fileType] || '📄';
};
