import ReactDOM, { type Root } from 'react-dom/client';

const MARK = '__ct_react_root__';

type ContainerType = (Element | DocumentFragment) & {
  [MARK]?: Root;
};

export function reactRender(
  node: React.ReactElement<any>,
  container: ContainerType
) {
  const root = container[MARK] || ReactDOM.createRoot(container);

  root.render(node);

  container[MARK] = root;
}
import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '@/theme';
import { getThemeColor } from '@/api/Theme';
import ConfirmDialog, { type ConfirmDialogProps } from './ConfirmDialog';

type ConfigUpdate =
  | ConfirmDialogProps
  | ((prevConfig: ConfirmDialogProps) => ConfirmDialogProps);

// 模块级别的主题色缓存，避免每次调用都请求接口
let cachedThemeColor: string | null = null;
let themeColorPromise: Promise<string> | null = null;

// 获取主题色（带缓存）
function getCachedThemeColor(): Promise<string> {
  // 如果已经有缓存的主题色，直接返回
  if (cachedThemeColor !== null) {
    return Promise.resolve(cachedThemeColor);
  }
  
  // 如果正在请求中，返回同一个 Promise
  if (themeColorPromise) {
    return themeColorPromise;
  }
  
  // 发起新的请求
  themeColorPromise = getThemeColor()
    .then((response) => {
      const newThemeColor = response?.primaryColor || '#EA4C89';
      cachedThemeColor = newThemeColor;
      themeColorPromise = null; // 清除 Promise，允许后续重新请求
      return newThemeColor;
    })
    .catch(() => {
      // 如果获取失败，使用回退主题色
      cachedThemeColor = '#EA4C89';
      themeColorPromise = null;
      return '#EA4C89';
    });
  
  return themeColorPromise;
}

export default function confirm(config: ConfirmDialogProps) {
  const container = document.createDocumentFragment();
  const { onCancel: propCancel, onOk: propOk } = config;

  const onCancel = async () => {
    await propCancel?.();
    close();
  };
  const onOk = async () => {
    await propOk?.();
    close();
  };
  let currentConfig = { ...config, open: true, onCancel, onOk } as any;
  
  // 使用缓存的主题色创建主题（如果还没有缓存，使用回退主题色）
  const initialThemeColor = cachedThemeColor || '#EA4C89';
  let theme = createAppTheme(initialThemeColor);
  
  // 异步获取主题色（如果还没有缓存）
  getCachedThemeColor().then((newThemeColor) => {
    // 如果获取到的主题色与初始使用的不同，更新主题并重新渲染
    if (newThemeColor !== initialThemeColor) {
      theme = createAppTheme(newThemeColor);
      // 重新渲染以应用新主题
      render(currentConfig);
    }
  });

  function render(props: ConfirmDialogProps) {
    setTimeout(() => {
      reactRender(
        <ThemeProvider theme={theme}>
          <ConfirmDialog {...props} />
        </ThemeProvider>,
        container
      );
    });
  }

  function close() {
    currentConfig = {
      ...currentConfig,
      open: false,
    };
    render(currentConfig);
  }

  function update(configUpdate: ConfigUpdate) {
    if (typeof configUpdate === 'function') {
      currentConfig = configUpdate(currentConfig);
    } else {
      currentConfig = {
        ...currentConfig,
        ...configUpdate,
      };
    }
    render(currentConfig);
  }

  render(currentConfig);

  return {
    destroy: close,
    update,
  };
}
