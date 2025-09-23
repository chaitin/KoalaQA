import LinearProgress from '@mui/material/LinearProgress';
import { styled } from '@mui/material/styles';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/mainLayout/admin';
import { type LazyExoticComponent, Suspense, forwardRef, lazy } from 'react';
import { type JSX } from 'react/jsx-runtime';

const LoaderWrapper = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: 1301,
  width: '100%',
});

const Loader = () => (
  <LoaderWrapper>
    <LinearProgress color="primary" />
  </LoaderWrapper>
);

const LazyLoadable = (
  Component: LazyExoticComponent<(props: any) => JSX.Element>
): React.ForwardRefExoticComponent<any> =>
  forwardRef((props: any, ref: React.Ref<any>) => (
    <Suspense fallback={<Loader />}>
      <Component {...props} ref={ref} />
    </Suspense>
  ));

const GeneralSetting = LazyLoadable(lazy(() => import('@/pages/settings')));
const AdminKnowledge = LazyLoadable(lazy(() => import('@/pages/ai')));
const AdminKnowledgeDetail = LazyLoadable(lazy(() => import('@/pages/ai/detail')));
const AdminKnowledgeBasePage = LazyLoadable(lazy(() => import('@/pages/ai/kb')));
const User = LazyLoadable(lazy(() => import('@/pages/user')));

const routerConfig = [
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/admin/ai" replace />,
      },
      {
        path: 'ai',
        element: <AdminKnowledge />,
      },
      {
        path: 'ai/:id?/qa',
        element: <AdminKnowledgeDetail tab='qa' />,
      },
      {
        path: 'ai/:id?/doc',
        element: <AdminKnowledgeDetail tab='doc' />,
      },
      {
        path: 'ai/:id?/web',
        element: <AdminKnowledgeDetail tab='web' />,
      },
      {
        path: 'ai/kb',
        element: <AdminKnowledgeBasePage />,
      },
      {
        path: 'users',
        element: <User />,
      },
      {
        path: 'settings',
        element: <GeneralSetting />,
      },
    ],
  },
];

const router = createBrowserRouter(routerConfig, {});

export default router;
