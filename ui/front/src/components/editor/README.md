# Editor 组件

这是一个适用于 Next.js SSR 项目的文档编辑器组件。

## 特性

- ✅ 支持 SSR (服务端渲染)
- ✅ 响应式设计
- ✅ 文档目录树
- ✅ 知识库切换
- ✅ 实时保存
- ✅ 编辑/预览模式切换
- ✅ Material-UI 设计

## 使用方法

### 基础使用

```tsx
import DocEditor, { NodeDetail, KnowledgeBase } from '@/components/editor';
import Edit from '@/components/editor/edit';

const MyEditorPage = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [currentKbId, setCurrentKbId] = useState<string>('1');

  const kbList: KnowledgeBase[] = [
    { id: '1', name: '技术文档', description: '技术相关的文档' },
    { id: '2', name: '产品文档', description: '产品相关的文档' },
  ];

  const handleGetNodeDetail = async (nodeId: string, kbId: string): Promise<NodeDetail> => {
    // 调用你的API获取文档详情
    const response = await fetch(`/api/nodes/${nodeId}?kbId=${kbId}`);
    return response.json();
  };

  const handleSave = async (content: string, nodeId: string, kbId: string) => {
    // 调用你的API保存文档
    await fetch(`/api/nodes/${nodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, kbId }),
    });
  };

  return (
    <DocEditor
      initialKbId={currentKbId}
      initialKbList={kbList}
      onSave={handleSave}
    >
      <Edit
        nodeId={selectedNodeId}
        kbId={currentKbId}
        onGetNodeDetail={handleGetNodeDetail}
      />
    </DocEditor>
  );
};
```

### 完整示例

查看 `EditorExample.tsx` 文件获取完整的使用示例。

## API

### DocEditor Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| children | ReactNode | - | 编辑器内容区域 |
| initialKbId | string | '' | 初始知识库ID |
| initialKbList | KnowledgeBase[] | [] | 知识库列表 |
| onSave | (content: string, nodeId: string, kbId: string) => Promise<void> | - | 保存回调 |

### Edit Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| nodeId | string | - | 当前编辑的节点ID |
| kbId | string | - | 当前知识库ID |
| onNodeDetailChange | (detail: NodeDetail) => void | - | 节点详情变化回调 |
| onGetNodeDetail | (nodeId: string, kbId: string) => Promise<NodeDetail> | - | 获取节点详情的API调用 |

### 类型定义

```tsx
interface NodeDetail {
  id?: string;
  name?: string;
  content?: string;
  type?: number;
  emoji?: string;
  meta?: {
    emoji?: string;
  };
}

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
}

interface TreeItem {
  id: string;
  name: string;
  type: number; // 1: 文件夹, 2: 文档
  emoji?: string;
  order?: number;
  parentId?: string;
  children?: TreeItem[];
}
```

## 注意事项

1. 所有组件都标记为 `'use client'`，确保在客户端渲染
2. 使用 Material-UI 作为 UI 框架
3. 需要自行实现 API 调用逻辑
4. 支持响应式设计，在小屏幕上目录会自动收起

## 自定义

你可以根据需要自定义以下组件：

- `Catalog/index.tsx` - 目录树组件
- `edit/Wrap.tsx` - 编辑器包装组件
- `edit/Loading.tsx` - 加载状态组件

## 依赖

- @mui/material
- @mui/icons-material
- React 18+
- Next.js 13+ (App Router)