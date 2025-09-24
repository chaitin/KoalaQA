import { alpha, Box, Stack, useTheme, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { NodeDetail, KnowledgeBase } from '../index';
import KBSwitch from './KBSwitch';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuIcon from '@mui/icons-material/Menu';

// 定义树形结构的节点类型
export interface TreeItem {
  id: string;
  name: string;
  type: number; // 1: 文件夹, 2: 文档
  emoji?: string;
  order?: number;
  parentId?: string;
  children?: TreeItem[];
}

interface CatalogProps {
  curNode: NodeDetail;
  setCatalogOpen: (open: boolean) => void;
  kbId: string;
  kbList: KnowledgeBase[];
  onNodeSelect?: (node: TreeItem) => void;
  nodeList?: TreeItem[];
}

// 将扁平数组转换为树形结构
const convertToTree = (items: TreeItem[]): TreeItem[] => {
  const map = new Map<string, TreeItem>();
  const roots: TreeItem[] = [];

  // 创建映射
  items.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  // 构建树形结构
  items.forEach(item => {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      const parent = map.get(item.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const Catalog = ({
  curNode,
  setCatalogOpen,
  kbId,
  kbList,
  onNodeSelect,
  nodeList = [],
}: CatalogProps) => {
  const theme = useTheme();
  const [data, setData] = useState<TreeItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  // 获取当前知识库信息
  const currentKb = kbList.find(kb => kb.id === kbId);

  const getCatalogData = useCallback(() => {
    // 这里应该调用API获取节点列表，现在使用传入的nodeList
    if (nodeList.length > 0) {
      const treeData = convertToTree(nodeList);
      setData(treeData);

      // 默认展开所有文件夹
      const getAllFolderIds = (items: TreeItem[]): string[] => {
        return items.reduce((acc: string[], item) => {
          if (item.type === 1) {
            acc.push(item.id);
            if (item.children && item.children.length > 0) {
              acc.push(...getAllFolderIds(item.children));
            }
          }
          return acc;
        }, []);
      };
      setExpandedFolders(new Set(getAllFolderIds(treeData)));
    }
  }, [nodeList]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleNodeClick = (item: TreeItem) => {
    if (item.type === 1) {
      // 文件夹，切换展开状态
      toggleFolder(item.id);
    } else {
      // 文档，选中并触发回调
      setSelectedNodeId(item.id);
      onNodeSelect?.(item);
    }
  };

  const renderTree = (items: TreeItem[], depth = 0) => {
    const sortedItems = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return sortedItems.map(item => (
      <Box key={item.id}>
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{
            pl: 2 + depth * 2,
            py: 0.75,
            borderRadius: 1,
            cursor: 'pointer',
            fontWeight: item.type === 1 ? 'bold' : 'normal',
            color: selectedNodeId === item.id ? 'primary.main' : 'text.primary',
            bgcolor:
              selectedNodeId === item.id ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
            '&:hover': {
              bgcolor:
                selectedNodeId === item.id
                  ? alpha(theme.palette.primary.main, 0.1)
                  : 'action.hover',
            },
          }}
          onClick={() => handleNodeClick(item)}
        >
          {item.type === 1 &&
            (expandedFolders.has(item.id) ? (
              <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            ) : (
              <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            ))}

          {item.emoji ? (
            <Box sx={{ fontSize: 13, flexShrink: 0 }}>{item.emoji}</Box>
          ) : item.type === 1 ? (
            <FolderIcon sx={{ fontSize: 16, color: '#2f80f7', flexShrink: 0 }} />
          ) : (
            <DescriptionIcon sx={{ fontSize: 16, color: '#2f80f7', flexShrink: 0 }} />
          )}

          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.name}
          </Typography>
        </Stack>

        {item.children && item.children.length > 0 && expandedFolders.has(item.id) && (
          <Box>{renderTree(item.children, depth + 1)}</Box>
        )}
      </Box>
    ));
  };

  useEffect(() => {
    getCatalogData();
  }, [getCatalogData]);

  useEffect(() => {
    if (curNode.id) {
      setSelectedNodeId(curNode.id);
    }
  }, [curNode.id]);

  return (
    <Stack
      sx={{
        bgcolor: 'background.paper',
        height: '100%',
        color: 'text.primary',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      {/* 头部 */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction="row" alignItems="center" gap={1} sx={{ flex: 1 }}>
          <KBSwitch kbList={kbList} currentKbId={kbId} />
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 'bold',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {currentKb?.name || '知识库'}
          </Typography>
        </Stack>

        <Box
          onClick={() => setCatalogOpen(false)}
          sx={{
            cursor: 'pointer',
            color: 'text.secondary',
            p: 0.5,
            borderRadius: 1,
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.hover',
            },
          }}
        >
          <MenuIcon sx={{ fontSize: 20 }} />
        </Box>
      </Stack>

      {/* 目录标题 */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight="bold">
          目录
        </Typography>
      </Box>

      {/* 目录树 */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 1,
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'action.disabled',
            borderRadius: 3,
          },
        }}
      >
        {data.length > 0 ? (
          renderTree(data)
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              暂无文档
            </Typography>
          </Box>
        )}
      </Box>
    </Stack>
  );
};

export default Catalog;
