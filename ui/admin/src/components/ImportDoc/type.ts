export type ImportDocType =
  | "URL"
  | "RSS"
  | "Sitemap"
  | "OfflineFile"
  | "Notion"
  | "Epub"
  | "Wiki.js"
  | "Yuque"
  | "Siyuan"
  | "MinDoc"
  | "Feishu"
  | "Confluence";

export type ImportDocProps = {
  parentId?: string | null;
  open: boolean;
  size?: number;
  refresh?: (params: any) => void;
  onCancel: () => void;
};

export type ImportDocListItem = {
  content: string;
  title: string;
  url: string;
  success: -1 | 0 | 1;
  id: string;
};