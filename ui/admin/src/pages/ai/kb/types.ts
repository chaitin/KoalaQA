import { SvcDocListItem, SvcListAnydocNode, SvcListSpaceFolderItem, SvcListSpaceItem } from '@/api';

export interface KBPageState {
  selectedSpaceId: number | null;
  currentSpace: SvcListSpaceItem | null;
  currentFolder: SvcListSpaceFolderItem | null;
  showCreateModal: boolean;
  showImportModal: boolean;
  showDocStatusModal: boolean;
  docStatusFolder: SvcListSpaceFolderItem | null;
  docStatusSearch: string;
  docStatusTab: 'all' | 'success' | 'failed';
  editSpace: SvcListSpaceItem | null;
  selectedFolders: string[];
  selectedDocs: Set<string>;
  expandedDocs: Set<string>;
  selectedPlatform: number;
  dingtalkStep: number;
  imagePreviewOpen: boolean;
  previewImageSrc: string;
  previewImageAlt: string;
  needsRebind: boolean;
}

export interface TreeNodeValue {
  id?: string;
  title?: string;
  summary?: string;
  file?: boolean;
  file_type?: string;
  updated_at?: number;
  error?: string;
}

