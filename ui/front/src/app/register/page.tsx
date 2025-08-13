import { Card } from '@/components';
import type { Metadata } from 'next';
import Register from './ui';

export const metadata: Metadata = {
  title: '注册',
};

const page = () => {
  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        top: 'calc(50% - 260px)',
        left: '50%',
        transform: 'translateX(-50%)',
        position: 'absolute',
        width: 400,
      }}
    >
      <Register />
    </Card>
  );
};

export default page;
