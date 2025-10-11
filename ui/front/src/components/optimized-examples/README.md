# 组件优化示例

本目录包含优化后的组件示例，展示了如何提升性能和代码质量。

## 优化技术

### 1. React.memo - 避免不必要的重渲染

```tsx
import React, { memo } from 'react';

interface CardProps {
  title: string;
  content: string;
  onClick: () => void;
}

// ❌ 未优化：每次父组件更新都会重渲染
export const Card = ({ title, content, onClick }: CardProps) => {
  return (
    <div onClick={onClick}>
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  );
};

// ✅ 优化：使用 memo，只在 props 变化时重渲染
export const OptimizedCard = memo(({ title, content, onClick }: CardProps) => {
  return (
    <div onClick={onClick}>
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数（可选）
  return prevProps.title === nextProps.title && 
         prevProps.content === nextProps.content;
});
```

### 2. useMemo - 缓存计算结果

```tsx
import { useMemo } from 'react';

// ❌ 未优化：每次渲染都重新计算
export const ListComponent = ({ items }: { items: Item[] }) => {
  const sortedItems = items.sort((a, b) => a.date - b.date);
  const filteredItems = sortedItems.filter(item => item.active);
  
  return <div>{/* 渲染 filteredItems */}</div>;
};

// ✅ 优化：使用 useMemo 缓存计算结果
export const OptimizedListComponent = ({ items }: { items: Item[] }) => {
  const processedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.date - b.date);
    return sorted.filter(item => item.active);
  }, [items]);
  
  return <div>{/* 渲染 processedItems */}</div>;
};
```

### 3. useCallback - 缓存回调函数

```tsx
import { useCallback, memo } from 'react';

// ❌ 未优化：每次渲染都创建新函数，导致子组件重渲染
export const ParentComponent = () => {
  const [count, setCount] = useState(0);
  
  const handleClick = (id: string) => {
    console.log('Clicked:', id);
  };
  
  return <ChildComponent onClick={handleClick} />;
};

// ✅ 优化：使用 useCallback 缓存函数
export const OptimizedParentComponent = () => {
  const [count, setCount] = useState(0);
  
  const handleClick = useCallback((id: string) => {
    console.log('Clicked:', id);
  }, []); // 依赖数组为空，函数永不变化
  
  return <ChildComponent onClick={handleClick} />;
};
```

### 4. 虚拟列表 - 处理大量数据

```tsx
import { Virtuoso } from 'react-virtuoso';

// ❌ 未优化：渲染所有项目
export const LongList = ({ items }: { items: Item[] }) => {
  return (
    <div>
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
};

// ✅ 优化：使用虚拟列表
export const OptimizedLongList = ({ items }: { items: Item[] }) => {
  return (
    <Virtuoso
      data={items}
      itemContent={(index, item) => (
        <ItemCard key={item.id} item={item} />
      )}
      style={{ height: '600px' }}
    />
  );
};
```

### 5. 代码分割 - 按需加载

```tsx
import dynamic from 'next/dynamic';

// ❌ 未优化：立即加载所有组件
import HeavyComponent from './HeavyComponent';

export const Page = () => {
  return <HeavyComponent />;
};

// ✅ 优化：动态导入
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>加载中...</div>,
  ssr: false, // 如果不需要 SSR
});

export const OptimizedPage = () => {
  return <HeavyComponent />;
};
```

## 性能监控

```tsx
import { useEffect } from 'react';

export const PerformanceMonitor = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`${entry.name}: ${entry.duration}ms`);
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation'] });
      
      return () => observer.disconnect();
    }
  }, []);
  
  return <>{children}</>;
};
```

## 应用这些优化到项目中

### 优先级高的组件
1. **ArticleCard** - 使用虚拟列表
2. **DiscussCard** - 添加 memo
3. **Header/LoggedInView** - 使用 useCallback
4. **Editor** - 动态导入

### 实施步骤
1. 先优化渲染次数最多的组件
2. 使用 React DevTools Profiler 测量效果
3. 逐步应用到其他组件

