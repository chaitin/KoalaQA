import { message, Modal } from '@ctzhian/ui';
import { Box, Checkbox, FormControlLabel, List, Typography } from '@mui/material';
import { useState, useEffect } from 'react';
import {
  SvcListAnydocNode,
  postAdminKbKbIdSpaceSpaceIdFolder,
  SvcCreateSpaceForlderItem,
  getAdminKbKbIdSpaceSpaceIdRemote,
} from '@/api';
import { collectTreeIds, collectSelectedRoots, getFolderDocIds, getSubFolderIds } from '../utils';
import { TreeNode } from './TreeNode';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  kbId: number;
  selectedSpaceId: number | null;
  treeData: SvcListAnydocNode | null;
  setTreeData: (data: SvcListAnydocNode | null) => void;
  onSuccess: () => void;
}

export const ImportModal = ({
  open,
  onClose,
  kbId,
  selectedSpaceId,
  treeData,
  setTreeData,
  onSuccess,
}: ImportModalProps) => {
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [loadingFolderIds, setLoadingFolderIds] = useState<Set<string>>(new Set());

  // 当弹窗打开/关闭时，初始化或清空状态
  useEffect(() => {
    if (!open) {
      // 弹窗关闭时，清空所有状态
      setSelectedFolders([]);
      setSelectedDocs(new Set());
      setExpandedDocs(new Set());
      setLoadingFolderIds(new Set());
      return;
    }

    // 弹窗打开时，不自动展开顶层文件夹
    // 用户需要手动点击来触发数据加载
  }, [open, treeData]);

  // 切换文件夹选择状态
  const handleFolderToggle = (folderId?: string) => {
    if (!folderId) return;
    if (!treeData) return;
    const isSelected = selectedFolders.includes(folderId);
    const folderDocIds = getFolderDocIds(treeData, folderId);
    const subFolderIds = getSubFolderIds(treeData, folderId);

    if (isSelected) {
      // 取消选择文件夹时，同时取消选择该文件夹下的所有子文件夹和子文档
      setSelectedFolders(prev => prev.filter(id => id !== folderId && !subFolderIds.includes(id)));
      setSelectedDocs(prev => {
        const newSet = new Set(prev);
        folderDocIds.forEach(id => {
          newSet.delete(id);
        });
        return newSet;
      });
    } else {
      // 选择文件夹时，同时选择该文件夹下的所有子文件夹和子文档
      setSelectedFolders(prev => {
        const newSet = new Set(prev);
        newSet.add(folderId);
        subFolderIds.forEach(id => {
          newSet.add(id);
        });
        return Array.from(newSet);
      });
      setSelectedDocs(prev => {
        const newSet = new Set(prev);
        folderDocIds.forEach(id => {
          newSet.add(id);
        });
        return newSet;
      });
    }
  };

  // 切换文档选择状态
  const handleDocToggle = (docId?: string, folderId?: string) => {
    if (!docId) return;
    if (!treeData) return;

    const isSelected = selectedDocs.has(docId);

    if (isSelected) {
      // 取消选择文档
      const newSet = new Set(selectedDocs);
      newSet.delete(docId);
      setSelectedDocs(newSet);

      // 如果该文件夹下的所有文档都被取消选择，则取消选择文件夹
      if (folderId) {
        const folderDocIds = getFolderDocIds(treeData, folderId);
        const remainingSelected = folderDocIds.filter(id => id !== docId && newSet.has(id));
        if (remainingSelected.length === 0 && selectedFolders.includes(folderId)) {
          setSelectedFolders(prev => prev.filter(id => id !== folderId));
        }
      }
    } else {
      // 选择文档
      const newSet = new Set(selectedDocs);
      newSet.add(docId);
      setSelectedDocs(newSet);

      // 如果该文件夹下的所有文档都被选择，则自动选择文件夹
      if (folderId) {
        const folderDocIds = getFolderDocIds(treeData, folderId);
        const allDocsSelected =
          folderDocIds.length > 0 && folderDocIds.every(id => id === docId || newSet.has(id));
        if (allDocsSelected && !selectedFolders.includes(folderId)) {
          setSelectedFolders(prev => [...prev, folderId]);
        }
      }
    }
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (!treeData) return;

    const { folderIds, docIds } = collectTreeIds(treeData);
    const allSelected =
      selectedFolders.length === folderIds.length &&
      selectedDocs.size === docIds.length &&
      (folderIds.length > 0 || docIds.length > 0);

    if (allSelected) {
      // 取消全选
      setSelectedFolders([]);
      setSelectedDocs(new Set());
    } else {
      // 全选
      setSelectedFolders(folderIds);
      setSelectedDocs(new Set(docIds));
    }
  };

  // 切换文件夹展开状态
  const toggleFolderExpand = async (node: SvcListAnydocNode) => {
    const docId = node.value?.id;
    if (!docId) return;

    const isExpanded = expandedDocs.has(docId);

    // 已展开则直接收起
    if (isExpanded) {
      setExpandedDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(docId);
        return newSet;
      });
      return;
    }

    // 如果已经有 children，直接展开
    if (node.children && node.children.length > 0) {
      setExpandedDocs(prev => {
        const newSet = new Set(prev);
        newSet.add(docId);
        return newSet;
      });
      return;
    }

    // 首次展开且无 children，需要异步获取文档
    if (!selectedSpaceId) return;

    setLoadingFolderIds(prev => {
      const next = new Set(prev);
      next.add(docId);
      return next;
    });

    try {
      const response = await getAdminKbKbIdSpaceSpaceIdRemote({
        spaceId: selectedSpaceId,
        kbId,
        remote_folder_id: docId,
      });

      // 只有在成功获取到数据时才更新和展开
      if (!response) {
        console.warn('获取文档失败：返回数据为空');
        return;
      }

      let updateSuccess = false;

      setTreeData(prevTree => {
        const root = prevTree || null;
        if (!root) return root;

        const attachChildren = (current: SvcListAnydocNode): SvcListAnydocNode => {
          if (current.value?.id === docId) {
            updateSuccess = true;
            return {
              ...current,
              children: response.children || [],
            };
          }
          if (current.children && current.children.length > 0) {
            return {
              ...current,
              children: current.children.map(child => attachChildren(child)),
            };
          }
          return current;
        };

        return attachChildren(root);
      });

      // 只有在成功更新数据后才展开该文件夹
      if (updateSuccess) {
        setExpandedDocs(prev => {
          const newSet = new Set(prev);
          newSet.add(docId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('获取文档失败:', error);
      message.error('获取文档失败，请重试');
    } finally {
      setLoadingFolderIds(prev => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  };

  // 导入文件夹
  const handleImport = async () => {
    if (!selectedSpaceId) return;

    if (!treeData) {
      message.warning('未获取到远程数据');
      return;
    }

    const selectedTrees = collectSelectedRoots(treeData, selectedFolders, selectedDocs);
    const docsToImport: SvcCreateSpaceForlderItem[] = selectedTrees
      .filter(tree => !!tree.doc_id)
      .map(tree => ({
        doc_id: tree.doc_id!,
        title: tree.title,
        folders: tree,
      }));

    if (docsToImport.length === 0) {
      message.warning('请选择要导入的文档');
      return;
    }

    try {
      await postAdminKbKbIdSpaceSpaceIdFolder(
        { kbId, spaceId: selectedSpaceId },
        {
          docs: docsToImport,
        }
      );
      message.success('导入学习已开始');
      setSelectedFolders([]);
      setSelectedDocs(new Set());
      onSuccess();
      onClose();
    } catch {
      message.error('导入失败');
    }
  };

  // 关闭时重置状态（状态清理由 useEffect 处理）
  const handleClose = () => {
    setTreeData(null); // 清空 treeData，确保下次打开时重新加载
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title="获取知识库"
      onOk={handleImport}
      width={800}
    >
      <Box sx={{ maxHeight: '80vh', overflow: 'auto', pr: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={(() => {
                if (!treeData) return false;
                const { folderIds, docIds } = collectTreeIds(treeData);
                return (
                  selectedFolders.length === folderIds.length &&
                  selectedDocs.size === docIds.length &&
                  (folderIds.length > 0 || docIds.length > 0)
                );
              })()}
              indeterminate={(() => {
                if (!treeData) return false;
                const { folderIds, docIds } = collectTreeIds(treeData);
                const hasSelectedFolders = selectedFolders.length > 0;
                const hasSelectedDocs = selectedDocs.size > 0;
                const allFoldersSelected =
                  selectedFolders.length === folderIds.length && folderIds.length > 0;
                const allDocsSelected =
                  docIds.length === 0 || docIds.every(id => selectedDocs.has(id));
                return (
                  (hasSelectedFolders || hasSelectedDocs) &&
                  !(allFoldersSelected && allDocsSelected)
                );
              })()}
              onChange={handleSelectAll}
            />
          }
          label="全选"
        />
        <List>
          {(() => {
            if (!treeData) {
              return (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    暂无数据
                  </Typography>
                </Box>
              );
            }

            // 如果根节点有 value 且有有效的 id，直接渲染根节点
            if (treeData.value && treeData.value.id) {
              return (
                <Box>
                  <TreeNode
                    node={treeData}
                    level={0}
                    selectedFolders={selectedFolders}
                    selectedDocs={selectedDocs}
                    expandedDocs={expandedDocs}
                    loadingFolderIds={loadingFolderIds}
                    onFolderToggle={handleFolderToggle}
                    onDocToggle={handleDocToggle}
                    onFolderExpand={toggleFolderExpand}
                  />
                </Box>
              );
            }

            // 如果根节点有 value 但 id 是空字符串，且有 children，直接渲染 children
            if (
              treeData.value &&
              !treeData.value.id &&
              treeData.children &&
              treeData.children.length > 0
            ) {
              return (
                <>
                  {treeData.children.map((child, index) => {
                    const childId = child.value?.id || `child-${index}`;
                    return (
                      <Box key={childId}>
                        <TreeNode
                          node={child}
                          level={0}
                          selectedFolders={selectedFolders}
                          selectedDocs={selectedDocs}
                          expandedDocs={expandedDocs}
                          loadingFolderIds={loadingFolderIds}
                          onFolderToggle={handleFolderToggle}
                          onDocToggle={handleDocToggle}
                          onFolderExpand={toggleFolderExpand}
                        />
                      </Box>
                    );
                  })}
                </>
              );
            }

            // 如果根节点没有 value 但有 children，渲染 children
            if (treeData.children && treeData.children.length > 0) {
              return (
                <>
                  {treeData.children.map((child, index) => {
                    const childId = child.value?.id || `child-${index}`;
                    return (
                      <Box key={childId}>
                        <TreeNode
                          node={child}
                          level={0}
                          selectedFolders={selectedFolders}
                          selectedDocs={selectedDocs}
                          expandedDocs={expandedDocs}
                          loadingFolderIds={loadingFolderIds}
                          onFolderToggle={handleFolderToggle}
                          onDocToggle={handleDocToggle}
                          onFolderExpand={toggleFolderExpand}
                        />
                      </Box>
                    );
                  })}
                </>
              );
            }

            return (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  暂无数据
                </Typography>
              </Box>
            );
          })()}
        </List>
      </Box>
    </Modal>
  );
};

