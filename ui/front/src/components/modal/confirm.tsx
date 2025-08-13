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
import ConfirmDialog, { type ConfirmDialogProps } from './ConfirmDialog';

type ConfigUpdate =
  | ConfirmDialogProps
  | ((prevConfig: ConfirmDialogProps) => ConfirmDialogProps);
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

  function render(props: ConfirmDialogProps) {
    setTimeout(() => {
      reactRender(<ConfirmDialog {...props} />, container);
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
