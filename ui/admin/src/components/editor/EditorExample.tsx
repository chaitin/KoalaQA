import { useState } from 'react';
import DocEditor, { NodeDetail, KnowledgeBase } from './index';
import Edit from './edit';
import { TreeItem } from './Catalog';

// 示例数据
const mockKbList: KnowledgeBase[] = [
  { id: '1', name: '技术文档', description: '技术相关的文档' },
  { id: '2', name: '产品文档', description: '产品相关的文档' },
];

const mockNodeList: TreeItem[] = [
  {
    id: '1',
    name: '前端开发',
    type: 1, // 文件夹
    order: 1,
    children: [
      { id: '2', name: 'React 基础', type: 2, order: 1, parentId: '1' },
      { id: '3', name: 'Next.js 指南', type: 2, order: 2, parentId: '1' },
    ],
  },
  {
    id: '4',
    name: '后端开发',
    type: 1, // 文件夹
    order: 2,
    children: [
      { id: '5', name: 'Node.js 教程', type: 2, order: 1, parentId: '4' },
      { id: '6', name: 'API 设计', type: 2, order: 2, parentId: '4' },
    ],
  },
  { id: '7', name: '独立文档', type: 2, order: 3 },
];

const EditorExample = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [currentKbId, setCurrentKbId] = useState<string>('1');
  const [nodeDetail, setNodeDetail] = useState<NodeDetail>({});

  // 模拟获取节点详情的API
  const handleGetNodeDetail = async (nodeId: string, kbId: string): Promise<NodeDetail> => {
    // 这里应该调用真实的API
    await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟网络延迟

    const node =
      mockNodeList.find(n => n.id === nodeId) ||
      mockNodeList.flatMap(n => n.children || []).find(n => n.id === nodeId);

    if (!node) {
      throw new Error('文档不存在');
    }

    return {
      id: node.id,
      name: node.name,
      content: `# ${node.name}\n\n这是 ${node.name} 的内容。\n\n你可以在这里编辑文档内容。`,
      type: node.type,
      emoji: node.emoji,
    };
  };

  // 模拟保存文档的API
  const handleSave = async (content: string, nodeId: string, kbId: string) => {
    console.log('保存文档:', { content, nodeId, kbId });
    // 这里应该调用真实的保存API
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const handleNodeSelect = (node: TreeItem) => {
    setSelectedNodeId(node.id);
  };

  const handleNodeDetailChange = (detail: NodeDetail) => {
    setNodeDetail(detail);
  };

  const handleKbChange = (kbId: string) => {
    setCurrentKbId(kbId);
    setSelectedNodeId(''); // 切换知识库时清空选中的节点
  };

  return (
    <div style={{ height: '100vh' }}>
      <DocEditor initialKbId={currentKbId} initialKbList={mockKbList} onSave={handleSave}>
        {/* 传递nodeList给Catalog组件 */}
        <Edit
          nodeId={selectedNodeId}
          kbId={currentKbId}
          onNodeDetailChange={handleNodeDetailChange}
          onGetNodeDetail={handleGetNodeDetail}
        />
      </DocEditor>
    </div>
  );
};

export default EditorExample;
