# 知识库管理页面 (Knowledge Base Management)

这个目录包含了知识库管理功能的所有代码，已经从一个2695行的大文件重构为模块化的结构。

## 📁 文件结构

```
kb/
├── index.tsx                 # 主组件（从2695行减少到约700行）
├── types.ts                  # TypeScript类型定义
├── utils.ts                  # 工具函数
├── README.md                # 本文档
├── hooks/                   # 自定义Hooks
│   ├── useKBSpaces.ts       # 知识库空间数据管理
│   ├── useKBFolders.ts      # 文件夹数据管理
│   ├── useRemoteSpaces.ts   # 远程知识库数据管理
│   ├── useFolderDocs.ts     # 文档数据管理和轮询
│   └── useFeishuAuth.ts     # 飞书账号授权管理
└── components/              # UI组件
    ├── SpaceList.tsx        # 左侧知识库列表
    ├── FolderList.tsx       # 右侧文件夹列表
    ├── TreeNode.tsx         # 树形节点渲染
    ├── ImportModal.tsx      # 导入知识库弹窗
    ├── DocStatusModal.tsx   # 文档同步状态弹窗
    └── CreateSpaceModal/    # 创建/编辑知识库弹窗
        ├── index.tsx        # 主弹窗组件
        ├── PandaWikiForm.tsx   # PandaWiki表单
        ├── DingtalkForm.tsx    # 钉钉表单
        └── FeishuForm.tsx      # 飞书表单
```

## 🎯 重构目标

1. **可维护性**: 将2695行的单一文件拆分为多个小模块，每个模块职责单一
2. **可复用性**: 提取通用逻辑到hooks和工具函数中
3. **可测试性**: 独立的函数和组件更容易测试
4. **可读性**: 清晰的文件结构和命名使代码更易理解

## 📦 模块说明

### 核心组件

**`index.tsx`** - 主组件
- 协调所有子组件和hooks
- 处理业务逻辑和状态管理
- 从2695行减少到约700行

### 类型和工具

**`types.ts`** - TypeScript类型定义
- `KBPageState`: 页面状态接口
- `TreeNodeValue`: 树节点值类型
- 其他共享类型定义

**`utils.ts`** - 工具函数
- `formatDate`: 时间格式化
- `getPlatformLabel`: 获取平台标签
- `flattenTree`: 树形结构扁平化
- `collectTreeIds`: 收集树中的ID
- `getFolderDocIds`: 获取文件夹下的文档ID
- `buildSelectedTree`: 构建选中的树结构
- `countDocsInTree`: 统计文档数量

### 自定义Hooks

**`useKBSpaces`** - 知识库空间管理
- 获取和刷新知识库列表
- 处理URL参数中的spaceId
- 自动选择默认空间

**`useKBFolders`** - 文件夹管理
- 获取选中空间的文件夹列表
- 响应式更新（依赖selectedSpaceId）

**`useRemoteSpaces`** - 远程知识库管理
- 获取远程知识库数据
- 处理飞书云盘等特殊情况
- 维护树形结构状态

**`useFolderDocs`** - 文档管理
- 获取文件夹中的文档列表
- 轮询机制实现实时更新
- 自动清理轮询定时器

**`useFeishuAuth`** - 飞书授权
- 飞书账号绑定/解绑
- 检查重新绑定状态
- 管理授权相关状态

### UI组件

**`SpaceList`** - 知识库列表
- 显示所有知识库
- 支持选择和操作菜单
- Props: spaces, selectedSpaceId, onSpaceClick, onMenuClick, onCreateClick

**`FolderList`** - 文件夹列表
- 显示选中空间的文件夹
- 显示同步状态和统计信息
- Props: folders, selectedSpaceId, foldersLoading, onFolderClick, onFolderMenuClick

**`TreeNode`** - 树形节点
- 递归渲染树形结构
- 支持文件夹展开/收起
- 支持选择和加载子节点
- Props: node, level, selectedFolders, selectedDocs, expandedDocs, etc.

**`ImportModal`** - 导入弹窗
- 展示可导入的知识库
- 树形结构选择
- 异步加载子文档
- Props: open, onClose, kbId, selectedSpaceId, treeData, onSuccess

**`DocStatusModal`** - 文档状态弹窗
- 显示文档同步状态
- 支持按状态筛选
- 失败文档重试功能
- Props: open, onClose, folder, folderDocs, kbId, onRetryFailedDocs, onEditCategory

**`CreateSpaceModal`** - 创建/编辑弹窗
- 分平台表单（PandaWiki、钉钉、飞书）
- 支持创建和编辑模式
- 钉钉多步骤流程
- 飞书账号绑定
- Props: open, onClose, onOk, form, editSpace, selectedPlatform, etc.

## 🔧 使用方式

主组件已经集成了所有子模块，使用方式保持不变：

```tsx
import KnowledgeBasePage from '@/pages/ai/kb';

// 在路由中使用
<Route path="/admin/ai/kb" element={<KnowledgeBasePage />} />
```

## 🚀 未来优化建议

1. **进一步组件化**: 可以考虑将菜单操作提取为独立组件
2. **状态管理优化**: 考虑使用Context或状态管理库减少props传递
3. **类型完善**: 补充更详细的TypeScript类型定义
4. **单元测试**: 为hooks和工具函数添加单元测试
5. **性能优化**: 使用React.memo优化组件渲染性能

## 📝 注意事项

- 所有hooks都包含了适当的依赖项和清理逻辑
- 组件prop类型都有明确定义
- 保持了原有的业务逻辑和用户体验
- Linter警告已降至最低，主要是代码风格建议

## 🔍 依赖关系

```
index.tsx (主组件)
├── hooks/
│   ├── useKBSpaces
│   ├── useKBFolders
│   ├── useRemoteSpaces
│   ├── useFolderDocs
│   └── useFeishuAuth
├── components/
│   ├── SpaceList
│   ├── FolderList
│   ├── ImportModal → TreeNode
│   ├── DocStatusModal
│   └── CreateSpaceModal → {PandaWikiForm, DingtalkForm, FeishuForm}
├── utils.ts
└── types.ts
```

