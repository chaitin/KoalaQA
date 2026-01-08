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
  onFolderToggle,
  onDocToggle,
  onFolderExpand,
}: TreeNodeProps) => {
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
    const isExpanded = expandedDocs.has(docId);
    const allChildDocs = node.children
      ? node.children.reduce((sum, child) => sum + countDocsInTree(child), 0)
      : 0;

    const folderSelectedDocsCount = node.children
      ? node.children.reduce((sum, child) => sum + countSelectedDocs(child, selectedDocs), 0)
      : 0;

    const isLoading = loadingFolderIds.has(docId);
    const actionLabel = !hasChildren ? '获取文档' : isExpanded ? '收起' : '展开';

    return (
      <Box key={docId} sx={{ mb: 1 }}>
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
              checked={selectedFolders.includes(docId)}
              indeterminate={
                folderSelectedDocsCount > 0 && folderSelectedDocsCount < allChildDocs
              }
              onChange={() => onFolderToggle(docId)}
            />
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
                    parentId={docId}
                    selectedFolders={selectedFolders}
                    selectedDocs={selectedDocs}
                    expandedDocs={expandedDocs}
                    loadingFolderIds={loadingFolderIds}
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

