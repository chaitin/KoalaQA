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
import { collectTreeIds, collectSelectedRoots, getFolderDocIds, getSubFolderIds, getParentFolderIds, countDocsInTree, countSelectedDocs } from '../utils';
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
    // 确保 nodeId 是字符串类型，与 syncedData 的 key 保持一致
    const nodeIdStr = nodeId ? String(nodeId) : undefined;
    
    // 如果当前节点是文件夹，检查是否在 syncedData 中
    if (nodeIdStr && !isFile) {
      const syncedInfo = syncedData[nodeIdStr];
      if (syncedInfo === null) {
        // doc_ids 为 null，表示整个文件夹被选中
        folders.push(nodeIdStr);
        // 递归收集所有子文件夹和子文档（全选状态，不需要再检查 syncedData）
        const collectAllChildren = (childNode: SvcListAnydocNode) => {
          const childId = childNode.value?.id;
          const childIsFile = childNode.value?.file;
          if (childId) {
            const childIdStr = String(childId);
            if (childIsFile) {
              docs.push(childIdStr);
            } else {
              folders.push(childIdStr);
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
          docs.push(String(docId));
        });
      }
    }
    
    // 如果当前节点是文件，检查它是否在任何文件夹的 doc_ids 中
    if (nodeIdStr && isFile) {
      for (const docIds of Object.values(syncedData)) {
        if (Array.isArray(docIds) && docIds.includes(nodeIdStr)) {
          docs.push(nodeIdStr);
          break;
        }
      }
    }
    
    // 递归处理子节点（只有在不是全选文件夹的情况下才递归）
    if (node.children) {
      const currentNodeSyncedInfo = nodeIdStr && !isFile ? syncedData[nodeIdStr] : undefined;
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
      // 1. 凡是在 items 数组里的，一定是选中的（即不是全选就是半选）
      // 2. 判断是否全选：
      //    - 如果 export_opt 为 null，或者 export_opt.folders 为 null 或长度为 0，则表示全选
      //    - 否则，需要看 export_opt.folders 中的每个 folder：
      //      * doc_ids === null：表示整个文件夹全选
      //      * doc_ids 是数组且长度 > 0：表示半选（只选中了部分文档）
      const syncedData: Record<string, string[] | null> = {};
      const indeterminateFolderIds = new Set<string>();
      
      response?.items?.forEach((item: any) => {
        const exportOpt = item.export_opt;
        const kbRootId = item.doc_id ? String(item.doc_id) : null;
        
        // 如果 export_opt 为 null，或者 export_opt.folders 为 null 或长度为 0，则表示全选
        if (
          !exportOpt || 
          exportOpt === null ||
          !exportOpt.folders || 
          exportOpt.folders === null || 
          (Array.isArray(exportOpt.folders) && exportOpt.folders.length === 0)
        ) {
          // 如果知识库根节点 ID 存在，标记为全选
          if (kbRootId) {
            syncedData[kbRootId] = null;
          }
          return;
        }
        
        // 如果 export_opt.folders 存在且有内容，遍历每个 folder
        if (exportOpt.folders && Array.isArray(exportOpt.folders) && exportOpt.folders.length > 0) {
          exportOpt.folders.forEach((folder: any) => {
            if (folder.folder_id) {
              const folderId = String(folder.folder_id);
              // 如果 doc_ids === null，表示整个文件夹全选
              if (folder.doc_ids === null) {
                syncedData[folderId] = null;
              } else if (Array.isArray(folder.doc_ids) && folder.doc_ids.length > 0) {
                // 如果 doc_ids 是数组且长度不为0，表示半选（只选中了部分文档）
                // 确保 doc_ids 中的每个 id 都是字符串类型
                const docIds = folder.doc_ids.map((id: any) => String(id));
                syncedData[folderId] = docIds;
                indeterminateFolderIds.add(folderId);
              }
              // 如果 doc_ids 是空数组，不进行任何标记（表示没有选中任何文档）
            }
          });
        }
      });
      
      console.log('loadSyncedFolders 结果:', {
        syncedData,
        indeterminateFolderIds: Array.from(indeterminateFolderIds),
        rawResponse: response?.items,
      });
      console.log('loadSyncedFolders 详细数据:', {
        syncedDataKeys: Object.keys(syncedData),
        syncedDataValues: Object.entries(syncedData).map(([k, v]) => ({ key: k, value: v })),
        indeterminateFolderIdsArray: Array.from(indeterminateFolderIds),
      });
      
      setInitialSyncedData(syncedData);
      // 立即设置 indeterminateFolders，确保半选状态能正确显示
      setIndeterminateFolders(new Set(indeterminateFolderIds));
      setIsFullSelected(false); // 不再使用全局 fullSelected，每个知识库独立处理
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

  // 当 initialSyncedData 加载完成后，立即设置 indeterminateFolders
  // 这确保即使 treeData 还没有加载，半选状态也能正确显示
  useEffect(() => {
    // 设置所有在 initialSyncedData 中且 doc_ids 是数组的文件夹为半选状态
    const newIndeterminateFolders = new Set<string>();
    
    // 添加所有在 initialSyncedData 中且是半选状态的文件夹
    Object.entries(initialSyncedData).forEach(([folderId, docIds]) => {
      if (Array.isArray(docIds) && docIds.length > 0) {
        newIndeterminateFolders.add(folderId);
      }
    });
    
    console.log('设置 indeterminateFolders (useEffect initialSyncedData):', {
      initialSyncedData,
      newIndeterminateFolders: Array.from(newIndeterminateFolders),
      initialSyncedDataKeys: Object.keys(initialSyncedData),
    });
    
    // 只有在有数据时才更新，避免清空已有的半选状态
    if (newIndeterminateFolders.size > 0 || Object.keys(initialSyncedData).length === 0) {
      setIndeterminateFolders(newIndeterminateFolders);
    }
  }, [initialSyncedData]);

  // 当树形数据和已同步的数据都加载完成后，标记已同步的节点
  useEffect(() => {
    console.log('useEffect 开始:', {
      hasTeeData: !!treeData,
      initialSyncedDataKeys: Object.keys(initialSyncedData),
    });
    
    if (!treeData) {
      // treeData 未加载时，indeterminateFolders 已经在 loadSyncedFolders 中设置了
      // 这里不需要再次设置，避免覆盖已设置的值
      return;
    }
    
    // 如果没有已同步的数据，不进行标记
    if (Object.keys(initialSyncedData).length === 0) return;
    
    // 收集需要标记的节点ID（从已加载的树中）
    const { folders, docs } = collectSyncedNodeIds(treeData, initialSyncedData);
    
    // 同时，即使文档还没有加载到树中，也要将 initialSyncedData 中标记的文档ID添加到 selectedDocs
    // 这样当文档加载后，它们就能正确显示为选中状态
    const allSyncedDocIds = new Set<string>(docs);
    
    Object.entries(initialSyncedData).forEach(([folderId, docIds]) => {
      if (Array.isArray(docIds) && docIds.length > 0) {
        // 半选状态：将文档ID添加到 selectedDocs
        docIds.forEach(docId => {
          allSyncedDocIds.add(String(docId));
        });
      }
    });
    
    // 更新 indeterminateFolders：确保所有在 initialSyncedData 中且 doc_ids 是数组的文件夹都显示半选状态
    // 注意：即使文件夹未展开（findNodeInTree 找不到），只要在 initialSyncedData 中且 doc_ids 是数组，就应该显示半选状态
    // 因为 export_opt.folders 中的 folder_id 对应 remote 树中的节点，只是可能还没有展开
    setIndeterminateFolders(prev => {
      const newSet = new Set<string>();
      
      // 先添加所有在 initialSyncedData 中且是半选状态的文件夹（这是初始化时的半选状态）
      Object.entries(initialSyncedData).forEach(([folderId, docIds]) => {
        if (Array.isArray(docIds) && docIds.length > 0) {
          // 直接添加，不需要检查文件夹是否在树中存在
          // 因为 export_opt.folders 中的 folder_id 一定对应 remote 树中的节点
          newSet.add(folderId);
        }
      });
      
      // 保留之前设置的其他半选状态（这些可能是用户操作导致的半选状态，不在 initialSyncedData 中）
      prev.forEach(folderId => {
        // 如果不在 initialSyncedData 中，则保留（可能是用户操作导致的半选状态）
        if (!(folderId in initialSyncedData)) {
          newSet.add(folderId);
        }
      });
      
      // 检查所有父文件夹：如果子文件夹中有半选状态的，父文件夹也应该显示半选
      // 递归检查树结构，找到所有包含半选子文件夹的父文件夹
      const findParentFoldersWithIndeterminateChildren = (
        node: SvcListAnydocNode,
        indeterminateSet: Set<string>
      ): string[] => {
        const parentFolders: string[] = [];
        const nodeId = node.value?.id;
        const isFile = node.value?.file;
        const nodeIdStr = nodeId ? String(nodeId) : undefined;
        
        if (nodeIdStr && !isFile) {
          // 检查当前文件夹的子节点中是否有半选状态的
          let hasIndeterminateChild = false;
          
          // 如果子节点已加载，检查子节点
          if (node.children && node.children.length > 0) {
            hasIndeterminateChild = node.children.some(child => {
              const childId = child.value?.id;
              const childIdStr = childId ? String(childId) : undefined;
              if (childIdStr && !child.value?.file) {
                // 如果子文件夹在 indeterminateSet 中，或者递归检查子文件夹的子节点
                if (indeterminateSet.has(childIdStr)) {
                  return true;
                }
                // 递归检查子文件夹的子节点
                const childParentFolders = findParentFoldersWithIndeterminateChildren(child, indeterminateSet);
                return childParentFolders.length > 0 || childParentFolders.includes(childIdStr);
              }
              return false;
            });
          } else {
            // 如果子节点未加载，检查 initialSyncedData 中是否有子文件夹是半选状态
            // 这里我们无法直接知道父子关系，所以暂时跳过
            // 当用户展开文件夹后，会通过 toggleFolderExpand 来处理
          }
          
          // 如果当前文件夹的子节点中有半选状态的，将当前文件夹也标记为半选
          if (hasIndeterminateChild && !indeterminateSet.has(nodeIdStr)) {
            parentFolders.push(nodeIdStr);
          }
        }
        
        // 递归处理子节点
        if (node.children) {
          node.children.forEach(child => {
            const childParents = findParentFoldersWithIndeterminateChildren(child, indeterminateSet);
            parentFolders.push(...childParents);
          });
        }
        
        return parentFolders;
      };
      
      // 找到所有包含半选子文件夹的父文件夹（通过遍历树）
      const parentFoldersWithIndeterminateChildren = findParentFoldersWithIndeterminateChildren(treeData, newSet);
      parentFoldersWithIndeterminateChildren.forEach(folderId => {
        newSet.add(folderId);
      });
      
      // 对于 initialSyncedData 中的半选文件夹，如果它们在树中找不到，说明它们可能是子文件夹
      // 我们需要找到它们的父文件夹并标记为半选
      // 通过遍历树，找到所有可能包含这些子文件夹的父文件夹
      Object.keys(initialSyncedData).forEach(folderId => {
        const syncedInfo = initialSyncedData[folderId];
        if (Array.isArray(syncedInfo) && syncedInfo.length > 0) {
          // 这个文件夹是半选状态，尝试在树中找到它的父文件夹
          const findParentInTree = (node: SvcListAnydocNode, targetId: string, parentId?: string): string | null => {
            const nodeId = node.value?.id;
            const nodeIdStr = nodeId ? String(nodeId) : undefined;
            
            if (nodeIdStr === targetId) {
              return parentId || null;
            }
            
            if (node.children) {
              for (const child of node.children) {
                const found = findParentInTree(child, targetId, nodeIdStr || parentId);
                if (found !== null) {
                  return found;
                }
              }
            }
            
            return null;
          };
          
          const parentId = findParentInTree(treeData, folderId);
          if (parentId && !newSet.has(parentId)) {
            // 如果找到了父文件夹，且父文件夹不在 newSet 中，将其标记为半选
            newSet.add(parentId);
          } else if (!parentId) {
            // 如果在树中找不到父文件夹，说明这个文件夹可能是根节点的直接子文件夹
            // 检查根节点ID，如果这个文件夹在 initialSyncedData 中，根节点应该显示半选
            const rootNodeId = treeData?.value?.id;
            if (rootNodeId && String(rootNodeId)) {
              const rootIdStr = String(rootNodeId);
              // 如果根节点不是文件，且有半选状态的子文件夹，则标记为半选
              if (!treeData.value?.file && !newSet.has(rootIdStr)) {
                newSet.add(rootIdStr);
              }
            }
          }
        }
      });
      
      // 如果有选中的文档或文件夹，将知识库根节点标记为半选状态
      // 检查根节点是否有有效的 id
      const rootNodeId = treeData?.value?.id;
      if (rootNodeId && String(rootNodeId) && treeData.value) {
        const rootIdStr = String(rootNodeId);
        // 如果根节点不是文件，且有选中的子节点（文件夹或文档），则标记为半选
        // 这里检查 initialSyncedData 是否有数据，或者 collectSyncedNodeIds 收集到了选中的节点
        // 或者有半选状态的子文件夹（即使子文件夹还没有加载）
        const hasSelectedItems = 
          folders.length > 0 || 
          allSyncedDocIds.size > 0 || 
          Object.keys(initialSyncedData).length > 0 ||
          newSet.size > 0; // 如果有半选状态的文件夹，根节点也应该显示半选
        if (!treeData.value.file && hasSelectedItems) {
          newSet.add(rootIdStr);
        }
      }
      
      console.log('useEffect treeData 更新 indeterminateFolders:', {
        prev: Array.from(prev),
        newSet: Array.from(newSet),
        initialSyncedData,
      });
      
      return newSet;
    });
    
    // 一次性更新选中状态
    if (folders.length > 0) {
      setSelectedFolders(prev => {
        const newSet = new Set([...prev, ...folders]);
        return Array.from(newSet);
      });
    }
    
    if (allSyncedDocIds.size > 0) {
      setSelectedDocs(prev => {
        const newSet = new Set([...prev, ...Array.from(allSyncedDocIds)]);
        return newSet;
      });
    }
  }, [treeData, initialSyncedData, collectSyncedNodeIds]);

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
      // 从半选状态中移除该文件夹及其所有子文件夹
      setIndeterminateFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        subFolderIds.forEach(id => {
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
      // 从半选状态中移除该文件夹及其所有子文件夹（因为现在是全选状态）
      setIndeterminateFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        subFolderIds.forEach(id => {
          newSet.delete(id);
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
      
      // 更新所有父文件夹的半选状态
      const parentFolderIds = getParentFolderIds(treeData, docId);
      setIndeterminateFolders(prev => {
        const newIndeterminateSet = new Set(prev);
        // 遍历所有父文件夹，重新计算它们的半选状态
        parentFolderIds.forEach(parentId => {
          const parentNode = findNodeInTree(treeData, parentId);
          if (parentNode) {
            const allChildDocs = countDocsInTree(parentNode);
            const folderSelectedDocsCount = countSelectedDocs(parentNode, newSet);
            const isParentSelected = selectedFolders.includes(parentId);
            
            // 如果父文件夹全选或未选，则移除半选状态
            // 如果父文件夹部分选中，则添加半选状态
            if (isParentSelected || folderSelectedDocsCount === 0) {
              newIndeterminateSet.delete(parentId);
            } else if (folderSelectedDocsCount > 0 && folderSelectedDocsCount < allChildDocs) {
              newIndeterminateSet.add(parentId);
            } else if (folderSelectedDocsCount === allChildDocs && allChildDocs > 0) {
              // 如果所有文档都被选中，应该全选文件夹，移除半选状态
              newIndeterminateSet.delete(parentId);
            }
          }
        });
        return newIndeterminateSet;
      });
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
          // 全选文件夹时，移除半选状态
          setIndeterminateFolders(prev => {
            const newSet = new Set(prev);
            newSet.delete(folderId);
            return newSet;
          });
        } else {
          // 部分选中时，添加半选状态
          setIndeterminateFolders(prev => {
            const newSet = new Set(prev);
            newSet.add(folderId);
            return newSet;
          });
        }
      }
      
      // 更新所有父文件夹的半选状态
      const parentFolderIds = getParentFolderIds(treeData, docId);
      setIndeterminateFolders(prev => {
        const newIndeterminateSet = new Set(prev);
        // 遍历所有父文件夹，重新计算它们的半选状态
        parentFolderIds.forEach(parentId => {
          const parentNode = findNodeInTree(treeData, parentId);
          if (parentNode) {
            const allChildDocs = countDocsInTree(parentNode);
            const folderSelectedDocsCount = countSelectedDocs(parentNode, newSet);
            const isParentSelected = selectedFolders.includes(parentId);
            
            // 如果父文件夹全选，则移除半选状态
            if (isParentSelected) {
              newIndeterminateSet.delete(parentId);
            } else if (folderSelectedDocsCount > 0 && folderSelectedDocsCount < allChildDocs) {
              // 部分选中，添加半选状态
              newIndeterminateSet.add(parentId);
            } else if (folderSelectedDocsCount === allChildDocs && allChildDocs > 0) {
              // 如果所有文档都被选中，应该全选文件夹，移除半选状态
              newIndeterminateSet.delete(parentId);
            }
          }
        });
        return newIndeterminateSet;
      });
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
          // 检查当前展开的文件夹是否在 initialSyncedData 中且为全选状态（null）
          const expandedFolderIdStr = String(docId);
          const expandedFolderSyncedInfo = initialSyncedData[expandedFolderIdStr];
          
          // 如果当前文件夹在 initialSyncedData 中且为全选状态（null），全选所有子节点
          if (expandedFolderSyncedInfo === null) {
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
            
            // 更新选中状态
            let updatedSelectedFolders = selectedFolders;
            let updatedSelectedDocs = selectedDocs;
            
            if (allFolders.length > 0) {
              updatedSelectedFolders = Array.from(new Set([...selectedFolders, ...allFolders]));
              setSelectedFolders(updatedSelectedFolders);
            }
            
            if (allDocs.length > 0) {
              updatedSelectedDocs = new Set([...Array.from(selectedDocs), ...allDocs]);
              setSelectedDocs(updatedSelectedDocs);
            }
            
            // 更新半选状态：基于 initialSyncedData 和实际选择状态
            // 遍历新获取的子节点，计算半选状态
            setIndeterminateFolders(prev => {
              const newIndeterminateSet = new Set(prev);
              
              response.children?.forEach(child => {
                if (!child.value?.file && child.value?.id) {
                  const childIdStr = String(child.value.id);
                  const syncedInfo = initialSyncedData[childIdStr];
                  
                  // 如果子文件夹在 initialSyncedData 中且是半选状态（doc_ids 是数组）
                  if (Array.isArray(syncedInfo) && syncedInfo.length > 0) {
                    // 检查实际选择状态
                    const isFolderSelected = updatedSelectedFolders.includes(childIdStr);
                    const allChildDocs = countDocsInTree(child);
                    const folderSelectedDocsCount = countSelectedDocs(child, updatedSelectedDocs);
                    
                    // 如果文件夹全选，移除半选状态
                    if (isFolderSelected) {
                      newIndeterminateSet.delete(childIdStr);
                    } else if (folderSelectedDocsCount > 0 && folderSelectedDocsCount < allChildDocs) {
                      // 部分选中，添加半选状态
                      newIndeterminateSet.add(childIdStr);
                    } else if (folderSelectedDocsCount === allChildDocs && allChildDocs > 0) {
                      // 所有文档都被选中，应该全选文件夹，移除半选状态
                      newIndeterminateSet.delete(childIdStr);
                    } else {
                      // 根据 initialSyncedData 设置半选状态（初始状态）
                      newIndeterminateSet.add(childIdStr);
                    }
                  } else if (syncedInfo === null) {
                    // 全选状态，移除半选
                    newIndeterminateSet.delete(childIdStr);
                  }
                }
              });
              
              return newIndeterminateSet;
            });
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

  // 在树中查找节点
  const findNodeInTree = useCallback((root: SvcListAnydocNode, nodeId: string): SvcListAnydocNode | null => {
    if (!root) return null;
    
    const rootId = root.value?.id;
    if (rootId && String(rootId) === nodeId) {
      return root;
    }
    
    if (root.children) {
      for (const child of root.children) {
        const found = findNodeInTree(child, nodeId);
        if (found) return found;
      }
    }
    
    return null;
  }, []);

  // 导入文件夹
  const handleImport = async () => {
    if (!selectedSpaceId) return;

    if (!treeData) {
      message.warning('未获取到远程数据');
      return;
    }

    const selectedTrees = collectSelectedRoots(treeData, selectedFolders, selectedDocs);
    
    // 处理半选状态的文件夹
    indeterminateFolders.forEach((folderId) => {
      // 检查是否已经在 selectedTrees 中
      const alreadyIncluded = selectedTrees.some(tree => tree.doc_id === folderId);
      if (alreadyIncluded) return;
      
      // 在树中查找该文件夹节点
      const folderNode = findNodeInTree(treeData, folderId);
      if (!folderNode || !folderNode.value) return;
      
      // 获取该文件夹的选中文档ID列表
      const syncedDocIds = initialSyncedData[folderId];
      if (!Array.isArray(syncedDocIds) || syncedDocIds.length === 0) return;
      
      // 构建文件夹的树形结构，只包含选中的文档
      // 即使文档还没有加载到树中，我们也使用文档ID（title 是可选的）
      const children = syncedDocIds.map(docId => {
        // 尝试在文件夹节点中查找文档（如果已加载）
        if (folderNode.children) {
          const docNode = folderNode.children.find(
            child => child.value?.id && String(child.value.id) === docId
          );
          if (docNode && docNode.value) {
            return {
              doc_id: docNode.value.id,
              title: docNode.value.title,
              file: true,
            };
          }
        }
        // 如果文档还没有加载，只使用文档ID（title 留空）
        return {
          doc_id: docId,
          file: true,
        };
      });
      
      // 如果有选中的文档，添加到 selectedTrees
      if (children.length > 0) {
        selectedTrees.push({
          doc_id: folderNode.value.id,
          title: folderNode.value.title,
          file: false,
          children,
        });
      }
    });
    
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

