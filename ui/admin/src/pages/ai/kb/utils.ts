import dayjs from 'dayjs';
import { PlatformPlatformType, SvcListAnydocNode, ModelCreateSpaceFolderInfo } from '@/api';

// 格式化时间戳
export const formatDate = (timestamp?: number) => {
  if (!timestamp) return '';
  return dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm:ss');
};

// 获取平台标签
export const getPlatformLabel = (platform?: number) => {
  switch (platform) {
    case PlatformPlatformType.PlatformPandawiki:
      return 'PandaWiki';
    case PlatformPlatformType.PlatformFeishu:
      return '飞书';
    case PlatformPlatformType.PlatformDingtalk:
      return '钉钉';
    case 4:
      return 'Notion';
    default:
      return '未知';
  }
};

// 将树形结构转换为平铺数组
export const flattenTree = (
  node: SvcListAnydocNode | null | undefined
): Array<{
  doc_id?: string;
  title?: string;
  desc?: string;
  file?: boolean;
}> => {
  if (!node) return [];
  const result: Array<{
    doc_id?: string;
    title?: string;
    desc?: string;
    file?: boolean;
  }> = [];

  if (node.value) {
    result.push({
      doc_id: node.value.id,
      title: node.value.title,
      desc: node.value.summary,
      file: node.value.file,
    });
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      result.push(...flattenTree(child));
    });
  }

  return result;
};

// 收集树形结构中的所有文件夹和文档ID
export const collectTreeIds = (
  node: SvcListAnydocNode | null | undefined
): {
  folderIds: string[];
  docIds: string[];
} => {
  const folderIds: string[] = [];
  const docIds: string[] = [];

  if (!node) return { folderIds, docIds };

  if (node.value) {
    if (node.value.file && node.value.id) {
      docIds.push(node.value.id);
    } else if (!node.value.file && node.value.id) {
      folderIds.push(node.value.id);
    }
  }

  if (node.children) {
    node.children.forEach(child => {
      const childIds = collectTreeIds(child);
      folderIds.push(...childIds.folderIds);
      docIds.push(...childIds.docIds);
    });
  }

  return { folderIds, docIds };
};

// 获取某个文件夹（及其子文件夹）下的所有文档 ID
export const getFolderDocIds = (root: SvcListAnydocNode | null, folderId: string): string[] => {
  if (!root) return [];
  const result: string[] = [];

  const dfs = (node: SvcListAnydocNode, inTarget: boolean) => {
    const id = node.value?.id;
    const isFile = node.value?.file;
    const isTargetFolder = id === folderId && !isFile;
    const nextInTarget = inTarget || isTargetFolder;

    if (nextInTarget && isFile && id) {
      result.push(id);
    }

    node.children?.forEach(child => dfs(child, nextInTarget));
  };

  dfs(root, false);
  return result;
};

// 获取某个文件夹（及其子文件夹）下的所有子文件夹 ID
export const getSubFolderIds = (root: SvcListAnydocNode | null, folderId: string): string[] => {
  if (!root) return [];
  const result: string[] = [];

  const dfs = (node: SvcListAnydocNode, inTarget: boolean) => {
    const id = node.value?.id;
    const isFile = node.value?.file;
    const isTargetFolder = id === folderId && !isFile;
    const nextInTarget = inTarget || isTargetFolder;

    // 如果已经在目标文件夹内，且当前节点是文件夹（不是目标文件夹本身），则收集
    if (nextInTarget && !isFile && id && id !== folderId) {
      result.push(id);
    }

    node.children?.forEach(child => dfs(child, nextInTarget));
  };

  dfs(root, false);
  return result;
};

// 构建符合后端要求的树形 payload，只包含选中的节点
// parentSelected 参数表示父节点是否已被选中，如果是则不再包含子节点
export const buildSelectedTree = (
  node: SvcListAnydocNode | null | undefined,
  selectedFolders: string[],
  selectedDocs: Set<string>,
  parentSelected: boolean = false
): ModelCreateSpaceFolderInfo | null => {
  if (!node) return null;

  const docId = node.value?.id;
  const isFile = node.value?.file;
  const title = node.value?.title;

  // 如果父节点已被选中，则不包含任何子节点
  if (parentSelected) {
    return null;
  }

  // 判断当前节点是否被选中
  const isCurrentSelected = docId ? selectedFolders.includes(docId) : false;

  // 如果当前节点被选中，则不再递归处理子节点（只传父节点）
  const childTrees = isCurrentSelected
    ? []
    : (node.children
        ?.map(child => buildSelectedTree(child, selectedFolders, selectedDocs, false))
        .filter((c): c is ModelCreateSpaceFolderInfo => !!c) || []);

  if (isFile) {
    // 如果父节点已选中，或者当前文档被选中，则包含该文档
    if (parentSelected || (docId && selectedDocs.has(docId))) {
      return { doc_id: docId, title, file: true };
    }
    return null;
  }

  // 对于文件夹，如果当前节点被选中或有选中的子节点，则包含
  if (!isCurrentSelected && childTrees.length === 0) {
    return null;
  }

  const folderNode: ModelCreateSpaceFolderInfo = {
    doc_id: docId,
    title,
    file: false,
  };
  // 只有在当前文件夹未被选中时，才添加子节点
  if (!isCurrentSelected && childTrees.length > 0) {
    folderNode.children = childTrees;
  }
  return folderNode;
};

// 收集选中的根节点
export const collectSelectedRoots = (
  root: SvcListAnydocNode | null | undefined,
  selectedFolders: string[],
  selectedDocs: Set<string>
) => {
  const result: ModelCreateSpaceFolderInfo[] = [];
  if (!root) return result;
  const seeds = root.children && root.children.length > 0 ? root.children : [root];
  seeds.forEach(child => {
    const tree = buildSelectedTree(child, selectedFolders, selectedDocs);
    if (tree && tree.doc_id) {
      result.push(tree);
    }
  });
  return result;
};

// 统计树中的文档数量
export const countDocsInTree = (node: SvcListAnydocNode): number => {
  let count = 0;
  if (node.value?.file && node.value?.id) {
    count = 1;
  }
  if (node.children) {
    node.children.forEach(child => {
      count += countDocsInTree(child);
    });
  }
  return count;
};

// 统计选中的文档数量
export const countSelectedDocs = (node: SvcListAnydocNode, selectedDocs: Set<string>): number => {
  let count = 0;
  if (node.value?.file && node.value?.id && selectedDocs.has(node.value.id)) {
    count = 1;
  }
  if (node.children) {
    node.children.forEach(child => {
      count += countSelectedDocs(child, selectedDocs);
    });
  }
  return count;
};

