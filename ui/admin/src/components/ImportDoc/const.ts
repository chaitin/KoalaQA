import { ModelFileType } from "@/api";

export const StepText = {
  upload: {
    okText: '上传文档',
    showCancel: true,
  },
  'pull-done': {
    okText: '拉取数据',
    showCancel: true,
  },
  import: {
    okText: '导入数据',
    showCancel: true,
  },
  done: {
    okText: '完成',
    showCancel: false,
  },
};

export const fileType: Record<ModelFileType, string> = {
  [ModelFileType.FileTypeUnknown]: '未知',
  [ModelFileType.FileTypeMarkdown]: 'Markdown',
  [ModelFileType.FileTypeHTML]: 'HTML',
  [ModelFileType.FileTypeJSON]: 'JSON',
  [ModelFileType.FileTypeURL]: 'URL',
  [ModelFileType.FileTypeDOCX]: 'DOCX',
  [ModelFileType.FileTypePPTX]: 'PPTX',
  [ModelFileType.FileTypeXLSX]: 'XLSX',
  [ModelFileType.FileTypeXLS]: 'XLS',
  [ModelFileType.FileTypePDF]: "PDF",
  [ModelFileType.FileTypeImage]: 'Image',
  [ModelFileType.FileTypeCSV]: 'CSV',
  [ModelFileType.FileTypeXML]: 'XML',
  [ModelFileType.FileTypeZIP]: 'ZIP',
  [ModelFileType.FileTypeEPub]: 'EPub',
  [ModelFileType.FileTypeMax]: 'Max',
}