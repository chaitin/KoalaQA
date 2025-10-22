# 事件管理器使用说明

## 概述

事件管理器 (`eventManager`) 是一个简单的全局事件系统，用于在组件之间进行通信，特别是用于同步分类信息的更新。

## 主要功能

- 注册事件监听器
- 触发事件
- 移除事件监听器
- 错误处理

## 使用方法

### 1. 导入事件管理器

```typescript
import { eventManager, EVENTS } from '@/utils/eventManager';
```

### 2. 注册事件监听器

```typescript
useEffect(() => {
  const handleCategoryUpdate = (data) => {
    console.log('分类已更新:', data);
    // 执行相应的更新逻辑
  };

  // 注册事件监听
  eventManager.on(EVENTS.CATEGORY_UPDATED, handleCategoryUpdate);

  // 清理事件监听
  return () => {
    eventManager.off(EVENTS.CATEGORY_UPDATED, handleCategoryUpdate);
  };
}, []);
```

### 3. 触发事件

```typescript
// 在分类管理组件中，保存成功后触发事件
eventManager.emit(EVENTS.CATEGORY_UPDATED, {
  timestamp: Date.now(),
  message: '分类信息已更新'
});
```

## 可用事件

- `EVENTS.CATEGORY_UPDATED`: 分类信息更新事件
- `EVENTS.FORUM_UPDATED`: 论坛信息更新事件

## 实际应用场景

### 分类管理组件 → 论坛设置组件

当用户在分类管理组件中修改分类信息并保存后，论坛设置组件中的分类选择器会自动刷新，显示最新的分类数据。

### 实现流程

1. 分类管理组件保存成功后触发 `CATEGORY_UPDATED` 事件
2. 论坛设置组件中的 `CategorySelector` 监听该事件
3. `CategorySelector` 接收到事件后重新获取分类数据
4. 分类选择器显示最新的分类信息

## 注意事项

- 记得在组件卸载时清理事件监听器，避免内存泄漏
- 事件回调函数中的错误会被自动捕获，不会影响其他监听器
- 事件数据可以是任意类型，建议使用对象格式便于扩展
