import LinearProgress from '@mui/material/LinearProgress';
import { styled } from '@mui/material/styles';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './layouts/mainLayout/user';
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
    <LinearProgress color='primary' />
  </LoaderWrapper>
);

const LazyLoadable = (
  Component: LazyExoticComponent<() => JSX.Element>
): React.ForwardRefExoticComponent<any> =>
  forwardRef((props: any, ref: React.Ref<any>) => (
    <Suspense fallback={<Loader />}>
      <Component {...props} ref={ref} />
    </Suspense>
  ));

const GeneralSetting = LazyLoadable(
  lazy(() => import('@/pages/settings'))
);
const AdminKnowledge = LazyLoadable(
  lazy(() => import('@/pages/ai'))
);
const AdminKnowledgeDetail = LazyLoadable(
  lazy(() => import('@/pages/ai/detail'))
);

const routerConfig = [
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <Navigate to='/admin/ai' replace />,
      },
      {
        path: 'ai',
        element: <AdminKnowledge />,
      },
      {
        path: 'knowledge/:id?/:tab?',
        element: <AdminKnowledgeDetail />,
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
