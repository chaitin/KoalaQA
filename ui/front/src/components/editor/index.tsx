'use client';

import { Box, Drawer, Stack, useMediaQuery } from '@mui/material';
import { useEffect, useState, ReactNode } from 'react';
import Catalog from './Catalog';

// 定义基础的节点详情类型
export interface NodeDetail {
  id?: string;
  name?: string;
  content?: string;
  type?: number;
  emoji?: string;
  meta?: {
    emoji?: string;
  };
}

// 定义知识库类型
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
}

export interface WrapContext {
  catalogOpen: boolean;
  setCatalogOpen: (open: boolean) => void;
  nodeDetail: NodeDetail | null;
  setNodeDetail: (detail: NodeDetail) => void;
  onSave: (content: string) => void;
  docWidth: string;
  kbId: string;
  kbList: KnowledgeBase[];
}

interface DocEditorProps {
  children?: ReactNode;
  initialKbId?: string;
  initialKbList?: KnowledgeBase[];
  onSave?: (content: string, nodeId: string, kbId: string) => Promise<void>;
}

const DocEditor = ({ 
  children, 
  initialKbId = '', 
  initialKbList = [],
  onSave: onSaveProp
}: DocEditorProps) => {
  const catalogWidth = 292;
  const isWideScreen = useMediaQuery('(min-width:1400px)');
  const [nodeDetail, setNodeDetail] = useState<NodeDetail>({});
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [docWidth, _setDocWidth] = useState<string>('full');
  const [kbId, setKbId] = useState(initialKbId);
  const [kbList, setKbList] = useState<KnowledgeBase[]>(initialKbList);

  const onSave = async (content: string) => {
    if (!kbId || !nodeDetail.id) return;
    try {
      if (onSaveProp) {
        await onSaveProp(content, nodeDetail.id, kbId);
      }
      console.log('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  useEffect(() => {
    setCatalogOpen(isWideScreen);
  }, [isWideScreen]);

  useEffect(() => {
    setKbId(initialKbId);
  }, [initialKbId]);

  useEffect(() => {
    setKbList(initialKbList);
  }, [initialKbList]);

  const _contextValue: WrapContext = {
    catalogOpen,
    setCatalogOpen,
    nodeDetail,
    setNodeDetail,
    onSave,
    docWidth,
    kbId,
    kbList,
  };

  return (
    <Stack
      direction='row'
      sx={{ color: 'text.primary', bgcolor: 'background.default', height: '100vh' }}
    >
      <Drawer
        variant='persistent'
        anchor='left'
        open={catalogOpen}
        sx={{
          width: catalogOpen ? catalogWidth : 0,
          flexShrink: 0,
          transition: 'width 0.3s ease-in-out',
          '.MuiPaper-root': {
            width: catalogWidth,
            boxShadow: 'none !important',
            boxSizing: 'border-box',
          },
        }}
      >
        <Catalog 
          curNode={nodeDetail} 
          setCatalogOpen={setCatalogOpen}
          kbId={kbId}
          kbList={kbList}
          onNodeSelect={(node) => {
            // 这里可以添加节点选择的回调逻辑
            console.log('Selected node:', node);
          }}
        />
      </Drawer>
      <Box sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Stack>
  );
};

export default DocEditor;
