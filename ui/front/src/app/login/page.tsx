import React from 'react';

import LoginType from './ui/loginType';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '登录',
};

const page = () => {
  return <LoginType />;
};

export default page;
