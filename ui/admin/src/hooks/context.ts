import { use } from 'react';
import { AuthContext, CommonContext } from '@/context';

export const useAuthContext = () => {
  return use(AuthContext);
};

export const useCommonContext = () => {
  return use(CommonContext);
};
