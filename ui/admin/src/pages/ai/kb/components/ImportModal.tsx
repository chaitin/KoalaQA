import { message, Modal } from '@ctzhian/ui';
import { Box, Checkbox, FormControlLabel, List, Typography } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import {
  SvcListAnydocNode,
  postAdminKbKbIdSpaceSpaceIdFolder,
  SvcCreateSpaceForlderItem,
  getAdminKbKbIdSpaceSpaceIdRemote,
  getAdminKbKbIdSpaceSpaceIdFolder,
} from '@/api';
import { collectTreeIds, collectSelectedRoots, getFolderDocIds, getSubFolderIds } from '../utils';
import { TreeNode } from './TreeNode';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  kbId: number;
  selectedSpaceId: number | null;
  treeData: SvcListAnydocNode | null;
  setTreeData: React.Dispatch<React.SetStateAction<SvcListAnydocNode | null>>;
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
  // 保存已同步的文件夹和文件映射关系：{ folder_id: [doc_ids] | null }
  // null 表示整个文件夹被选中，数组表示只选中了部分文档（半选状态）
  const [initialSyncedData, setInitialSyncedData] = useState<Record<string, string[] | null>>({});
  // 保存半选状态的文件夹ID集合（doc_ids 不为 null 的文件夹）
  const [indeterminateFolders, setIndeterminateFolders] = useState<Set<string>>(new Set());
  // 标记是否全选（当 export_opt 为空对象 {} 时，表示全选）
  const [isFullSelected, setIsFullSelected] = useState<boolean>(false);

  // 递归收集需要标记的节点ID
  // syncedData 格式：{ folder_id: [doc_ids] | null }
  // null 表示整个文件夹被选中，数组表示只选中了部分文档（半选状态）
  const collectSyncedNodeIds = useCallback((
    node: SvcListAnydocNode, 
    syncedData: Record<string, string[] | null>
  ): { folders: string[]; docs: string[] } => {
    const folders: string[] = [];
    const docs: string[] = [];
    
    if (!node) return { folders, docs };
    
    const nodeId = node.value?.id;
    const isFile = node.value?.file;
    
    // 如果当前节点是文件夹，检查是否在 syncedData 中
    if (nodeId && !isFile) {
      const syncedInfo = syncedData[nodeId];
      if (syncedInfo === null) {
        // doc_ids 为 null，表示整个文件夹被选中
        folders.push(nodeId);
        // 递归收集所有子文件夹和子文档（全选状态，不需要再检查 syncedData）
        const collectAllChildren = (childNode: SvcListAnydocNode) => {
          const childId = childNode.value?.id;
          const childIsFile = childNode.value?.file;
          if (childId) {
            if (childIsFile) {
              docs.push(childId);
            } else {
              folders.push(childId);
            }
          }
          if (childNode.children) {
            childNode.children.forEach(collectAllChildren);
          }
        };
        if (node.children) {
          node.children.forEach(collectAllChildren);
        }
        // 全选文件夹处理完毕，直接返回
        return { folders, docs };
      } else if (Array.isArray(syncedInfo) && syncedInfo.length > 0) {
        // doc_ids 有值，表示半选状态，只选中特定的文档
        // 不选中文件夹本身，只标记数组中的文档ID
        syncedInfo.forEach(docId => {
          docs.push(docId);
        });
      }
    }
    
    // 如果当前节点是文件，检查它是否在任何文件夹的 doc_ids 中
    if (nodeId && isFile) {
      for (const docIds of Object.values(syncedData)) {
        if (Array.isArray(docIds) && docIds.includes(nodeId)) {
          docs.push(nodeId);
          break;
        }
      }
    }
    
    // 递归处理子节点（只有在不是全选文件夹的情况下才递归）
    if (node.children) {
      const currentNodeSyncedInfo = nodeId && !isFile ? syncedData[nodeId] : undefined;
      // 如果当前文件夹是全选状态（null），已经在上面处理过了，不需要再递归
      if (currentNodeSyncedInfo !== null) {
        node.children.forEach(child => {
          const childIds = collectSyncedNodeIds(child, syncedData);
          folders.push(...childIds.folders);
          docs.push(...childIds.docs);
        });
      }
    }
    
    return { folders, docs };
  }, []);

  // 加载已同步的文件夹列表，并提取 export_opt 中的数据
  const loadSyncedFolders = useCallback(async () => {
    if (!kbId || !selectedSpaceId) return;
    
    try {
      const response = await getAdminKbKbIdSpaceSpaceIdFolder({
        kbId,
        spaceId: selectedSpaceId,
      });
      
      // 从 export_opt.folders 中提取文件夹和文件的映射关系
      // 处理逻辑：
      // 1. 如果 export_opt 为空对象 {}，表示全选所有
      // 2. 如果 export_opt.folders 存在且有内容：
      //    - 遍历 folders 中的每个 folder
      //    - 对比 folder.folder_id 和树形结构中的所有文件夹
      //    - 如果匹配到了：
      //      * doc_ids === null：表示整个文件夹全选
      //      * doc_ids 是数组且有值：表示半选（只选中了部分文档）
      const syncedData: Record<string, string[] | null> = {};
      const indeterminateFolderIds = new Set<string>();
      let fullSelected = false;
      
      response?.items?.forEach((item: any) => {
        const exportOpt = item.export_opt;
        // 如果 export_opt 为空对象 {}，表示全选所有
        if (exportOpt && typeof exportOpt === 'object' && Object.keys(exportOpt).length === 0) {
          fullSelected = true;
          return;
        }
        
        // 如果 export_opt.folders 存在且有内容，需要对比 folder_id 和当前所有选项
        if (exportOpt?.folders && Array.isArray(exportOpt.folders) && exportOpt.folders.length > 0) {
          exportOpt.folders.forEach((folder: any) => {
            if (folder.folder_id) {
              // 对比 folder_id 和树形结构中的文件夹（在 collectSyncedNodeIds 中会进行匹配）
              // 如果 doc_ids === null，表示整个文件夹全选
              if (folder.doc_ids === null) {
                syncedData[folder.folder_id] = null;
              } else if (Array.isArray(folder.doc_ids) && folder.doc_ids.length > 0) {
                // 如果 doc_ids 是数组且有值，表示半选（只选中了部分文档）
                syncedData[folder.folder_id] = folder.doc_ids;
                indeterminateFolderIds.add(folder.folder_id);
              }
              // 如果 doc_ids 是空数组，不进行任何标记（表示没有选中任何文档）
            }
          });
        }
      });
      
      setInitialSyncedData(syncedData);
      setIndeterminateFolders(indeterminateFolderIds);
      setIsFullSelected(fullSelected);
    } catch (error) {
      console.error('获取已同步文件夹失败:', error);
      // 失败时不阻断流程，只是没有初始选中状态
    }
  }, [kbId, selectedSpaceId]);

  // 当弹窗打开/关闭时，初始化或清空状态
  useEffect(() => {
    if (!open) {
      // 弹窗关闭时，清空所有状态
      setSelectedFolders([]);
      setSelectedDocs(new Set());
      setExpandedDocs(new Set());
      setLoadingFolderIds(new Set());
      setInitialSyncedData({});
      setIndeterminateFolders(new Set());
      setIsFullSelected(false);
      return;
    }

    // 弹窗打开时，加载已同步的文件夹
    // 只有当弹窗打开且有必要的参数时才加载，避免依赖 loadSyncedFolders 导致循环
    if (kbId && selectedSpaceId) {
      loadSyncedFolders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kbId, selectedSpaceId]);

  // 当树形数据和已同步的数据都加载完成后，标记已同步的节点
  useEffect(() => {
    if (!treeData) return;
    
    // 如果 export_opt 为空对象，表示全选
    if (isFullSelected) {
      const { folderIds, docIds } = collectTreeIds(treeData);
      setSelectedFolders(folderIds);
      setSelectedDocs(new Set(docIds));
      return;
    }
    
    // 如果没有已同步的数据，不进行标记
    if (Object.keys(initialSyncedData).length === 0) return;
    
    // 收集需要标记的节点ID
    const { folders, docs } = collectSyncedNodeIds(treeData, initialSyncedData);
    
    // 一次性更新选中状态
    if (folders.length > 0) {
      setSelectedFolders(prev => {
        const newSet = new Set([...prev, ...folders]);
        return Array.from(newSet);
      });
    }
    
    if (docs.length > 0) {
      setSelectedDocs(prev => {
        const newSet = new Set([...prev, ...docs]);
        return newSet;
      });
    }
  }, [treeData, initialSyncedData, isFullSelected, collectSyncedNodeIds]);

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
        
        // 获取到新的子节点后，检查是否有已同步的节点并标记
        if (response.children) {
          // 如果 export_opt 为空对象，表示全选，直接全选所有新获取的子节点
          if (isFullSelected) {
            const allFolders: string[] = [];
            const allDocs: string[] = [];
            
            const collectAllIds = (child: SvcListAnydocNode) => {
              const childId = child.value?.id;
              const childIsFile = child.value?.file;
              if (childId) {
                if (childIsFile) {
                  allDocs.push(childId);
                } else {
                  allFolders.push(childId);
                }
              }
              if (child.children) {
                child.children.forEach(collectAllIds);
              }
            };
            
            response.children.forEach(collectAllIds);
            
            if (allFolders.length > 0) {
              setSelectedFolders(prev => {
                const newSet = new Set([...prev, ...allFolders]);
                return Array.from(newSet);
              });
            }
            
            if (allDocs.length > 0) {
              setSelectedDocs(prev => {
                const newSet = new Set([...prev, ...allDocs]);
                return newSet;
              });
            }
          } else if (Object.keys(initialSyncedData).length > 0) {
            // 否则，根据 initialSyncedData 标记已同步的节点
            const allFolders: string[] = [];
            const allDocs: string[] = [];
            
            response.children.forEach(child => {
              const { folders, docs } = collectSyncedNodeIds(child, initialSyncedData);
              allFolders.push(...folders);
              allDocs.push(...docs);
            });
            
            if (allFolders.length > 0) {
              setSelectedFolders(prev => {
                const newSet = new Set([...prev, ...allFolders]);
                return Array.from(newSet);
              });
            }
            
            if (allDocs.length > 0) {
              setSelectedDocs(prev => {
                const newSet = new Set([...prev, ...allDocs]);
                return newSet;
              });
            }
          }
        }
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
      <Box sx={{ maxHeight: '80vh', pr: 2 }}>
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
                    indeterminateFolders={indeterminateFolders}
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
                          indeterminateFolders={indeterminateFolders}
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
                          indeterminateFolders={indeterminateFolders}
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

