import '@/assets/fonts/font.css';
import '@/assets/fonts/iconfont';
import '@/assets/styles/markdown.css';
import { ThemeProvider } from '@ctzhian/ui';
import '@ctzhian/tiptap/dist/index.css';
import 'dayjs/locale/zh-cn';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
// 配置 Monaco Editor 环境
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { AuthContext, CommonContext } from './context';
import router from './router';
import { lightTheme } from './theme';

window.MonacoEnvironment = {
  getWorker: function (workerId: string, label: string) {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

dayjs.locale('zh-cn');
dayjs.extend(duration);
dayjs.extend(relativeTime);

const App = () => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const getModelList = () => {};

  const getUser = () => {};

  useEffect(() => {
    getUser();
  }, []);
  return (
    <ThemeProvider theme={lightTheme}>
      <CommonContext.Provider
        value={{
          kb_id: '',
          refreshModel: getModelList,
        }}
      >
        <AuthContext.Provider
          value={[
            user,
            {
              loading,
              setUser,
              refreshUser: getUser,
            },
          ]}
        >
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </CommonContext.Provider>
    </ThemeProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
