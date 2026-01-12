import { SvcListAnydocNode } from '@/api';
import DescriptionIcon from '@mui/icons-material/Description';
import { Box, Checkbox, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import LoadingButton from '@/components/LoadingButton';
import { countDocsInTree, countSelectedDocs } from '../utils';

interface TreeNodeProps {
  node: SvcListAnydocNode;
  level: number;
  parentId?: string;
  selectedFolders: string[];
  selectedDocs: Set<string>;
  expandedDocs: Set<string>;
  loadingFolderIds: Set<string>;
  indeterminateFolders?: Set<string>;
  onFolderToggle: (folderId?: string) => void;
  onDocToggle: (docId?: string, folderId?: string) => void;
  onFolderExpand: (node: SvcListAnydocNode) => void;
}

export const TreeNode = ({
  node,
  level = 0,
  parentId,
  selectedFolders,
  selectedDocs,
  expandedDocs,
  loadingFolderIds,
  indeterminateFolders = new Set(),
  onFolderToggle,
  onDocToggle,
  onFolderExpand,
}: TreeNodeProps) => {
  // 调试：检查 indeterminateFolders 是否正确传递
  if (level === 0 && node.value?.id) {
    console.log('TreeNode 根节点接收到的 indeterminateFolders:', {
      nodeId: String(node.value.id),
      indeterminateFolders: Array.from(indeterminateFolders),
      isSet: indeterminateFolders instanceof Set,
    });
  }
  // 如果节点没有 value，但有 children，直接渲染 children
  if (!node.value && node.children && node.children.length > 0) {
    return (
      <>
        {node.children.map((child, index) => (
          <Box key={child.value?.id || `no-value-${index}`}>
            <TreeNode
              node={child}
              level={level}
              parentId={parentId}
              selectedFolders={selectedFolders}
              selectedDocs={selectedDocs}
              expandedDocs={expandedDocs}
              loadingFolderIds={loadingFolderIds}
              indeterminateFolders={indeterminateFolders}
              onFolderToggle={onFolderToggle}
              onDocToggle={onDocToggle}
              onFolderExpand={onFolderExpand}
            />
          </Box>
        ))}
      </>
    );
  }

  // 如果既没有 value 也没有 children，返回 null
  if (!node.value) {
    return null;
  }

  const docId = node.value.id;
  const isFile = node.value.file;
  const title = node.value.title || '';
  const hasChildren = node.children && node.children.length > 0;

  // 如果 id 是空字符串但有 children，说明是虚拟根节点，直接渲染 children
  if (!docId && hasChildren && node.children) {
    return (
      <>
        {node.children.map((child, index) => (
          <Box key={child.value?.id || `no-id-${index}`}>
            <TreeNode
              node={child}
              level={level}
              parentId={parentId}
              selectedFolders={selectedFolders}
              selectedDocs={selectedDocs}
              expandedDocs={expandedDocs}
              loadingFolderIds={loadingFolderIds}
              indeterminateFolders={indeterminateFolders}
              onFolderToggle={onFolderToggle}
              onDocToggle={onDocToggle}
              onFolderExpand={onFolderExpand}
            />
          </Box>
        ))}
      </>
    );
  }

  // 如果是文件，直接渲染为文档项
  if (isFile && docId) {
    return (
      <Box
        key={docId}
        sx={{
          ml: level * 2,
          py: 0.75,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Checkbox
            checked={selectedDocs.has(docId)}
            onChange={() => onDocToggle(docId, parentId)}
            size="small"
          />
          <DescriptionIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Stack sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {title}
            </Typography>
            {node.value?.summary && (
              <Typography variant="caption" color="text.secondary">
                {node.value.summary}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Box>
    );
  }

  // 如果是文件夹，渲染文件夹项
  if (!isFile && docId) {
    // 确保 docId 是字符串类型，与 indeterminateFolders 中的 key 类型一致
    const docIdStr = String(docId);
    const isExpanded = expandedDocs.has(docIdStr);
    const allChildDocs = node.children
      ? node.children.reduce((sum, child) => sum + countDocsInTree(child), 0)
      : 0;

    const folderSelectedDocsCount = node.children
      ? node.children.reduce((sum, child) => sum + countSelectedDocs(child, selectedDocs), 0)
      : 0;

    const isLoading = loadingFolderIds.has(docIdStr);
    const actionLabel = !hasChildren ? '获取文档' : isExpanded ? '收起' : '展开';
    
    // 判断是否为半选状态：
    // 1. 如果文件夹在 indeterminateFolders 中（doc_ids 不为 null），则为半选
    // 2. 或者文件夹下有部分文档被选中（但不是全部）
    // 注意：即使文件夹未展开（allChildDocs === 0），只要在 indeterminateFolders 中，也应该显示半选状态
    // 这适用于知识库根节点，即使其子节点还未加载，只要接口返回有选中的项，就应该显示半选
    const isInIndeterminateFolders = indeterminateFolders.has(docIdStr);
    const hasPartialSelection = allChildDocs > 0 && folderSelectedDocsCount > 0 && folderSelectedDocsCount < allChildDocs;
    const isIndeterminate = isInIndeterminateFolders || hasPartialSelection;
    
    // 特殊调试：对于目标文件夹，输出详细信息
    if (docIdStr === 'QOG9lyrgJP3gRn7RSBkZLdkrVzN67Mw4') {
      console.log('目标文件夹半选状态检查:', {
        docIdStr,
        docIdStrType: typeof docIdStr,
        docIdStrLength: docIdStr.length,
        title,
        isInIndeterminateFolders,
        hasPartialSelection,
        isIndeterminate,
        indeterminateFoldersSize: indeterminateFolders.size,
        indeterminateFoldersArray: Array.from(indeterminateFolders),
        hasResult: indeterminateFolders.has(docIdStr),
        checked: selectedFolders.includes(docIdStr),
        // 检查每个 key 的类型和值
        keysInSet: Array.from(indeterminateFolders).map(k => ({
          key: k,
          type: typeof k,
          length: k.length,
          equals: k === docIdStr,
          strictEquals: k === docIdStr,
        })),
      });
    }
    
    // 调试信息 - 检查所有文件夹节点
    if (!isFile && docId) {
      console.log('TreeNode 文件夹节点:', {
        docIdStr,
        title,
        isInIndeterminateFolders,
        hasPartialSelection,
        isIndeterminate,
        indeterminateFolders: Array.from(indeterminateFolders),
        allChildDocs,
        folderSelectedDocsCount,
        checked: selectedFolders.includes(docIdStr),
      });
    }

    return (
      <Box key={docIdStr} sx={{ mb: 1 }}>
        <ListItem
          sx={{
            px: 0,
            ml: level * 2,
            width: 'auto',
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          <ListItemIcon>
            <Checkbox
              checked={selectedFolders.includes(docIdStr)}
              indeterminate={isIndeterminate}
              onChange={() => onFolderToggle(docIdStr)}
            />
            {/* 调试信息 */}
            {docIdStr === 'QOG9lyrgJP3gRn7RSBkZLdkrVzN67Mw4' && (
              <span style={{ fontSize: '10px', color: 'red' }}>
                {isIndeterminate ? '半选' : '未半选'} | 
                {isInIndeterminateFolders ? '在Set中' : '不在Set中'} | 
                {indeterminateFolders.has(docIdStr) ? 'has=true' : 'has=false'}
              </span>
            )}
          </ListItemIcon>
          <ListItemText
            primary={title}
            secondary={
              isExpanded && allChildDocs > 0
                ? `${allChildDocs} 个文档${
                    folderSelectedDocsCount > 0 ? ` (已选择 ${folderSelectedDocsCount} 个)` : ''
                  }`
                : hasChildren
                  ? `${allChildDocs} 个文档（点击展开查看）`
                  : ''
            }
          />
          <LoadingButton
            size="small"
            variant="outlined"
            loading={isLoading}
            onClick={() => onFolderExpand(node)}
          >
            {actionLabel}
          </LoadingButton>
        </ListItem>

        {/* 展开的子节点 */}
        {isExpanded && hasChildren && node.children && (
          <Box sx={{ ml: 4, mb: 2 }}>
            {node.children.length === 0 ? (
              <Box
                sx={{
                  p: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'grey.50',
                  textAlign: 'center',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                  <DescriptionIcon
                    fontSize="small"
                    sx={{ color: 'text.disabled', fontSize: 18 }}
                  />
                  <Typography variant="body2" color="text.disabled" sx={{ fontSize: '13px' }}>
                    暂无文档
                  </Typography>
                </Stack>
              </Box>
            ) : (
              node.children.map((child, index) => (
                <Box key={child.value?.id || index}>
                  <TreeNode
                    node={child}
                    level={level + 1}
                    parentId={docIdStr}
                    selectedFolders={selectedFolders}
                    selectedDocs={selectedDocs}
                    expandedDocs={expandedDocs}
                    loadingFolderIds={loadingFolderIds}
                    indeterminateFolders={indeterminateFolders}
                    onFolderToggle={onFolderToggle}
                    onDocToggle={onDocToggle}
                    onFolderExpand={onFolderExpand}
                  />
                </Box>
              ))
            )}
          </Box>
        )}
      </Box>
    );
  }

  return null;
};

