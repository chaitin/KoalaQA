import { createContext } from 'react';
import { ModelUserInfo, ModelLLM } from '@/api/types';

export const AuthContext = createContext<
  [
    ModelUserInfo  | null,
    {
      loading: boolean;
      setUser: (user: ModelUserInfo ) => void;
      refreshUser: () => void;
    }
  ]
>([
  null,
  {
    setUser: () => {},
    loading: true,
    refreshUser: () => {},
  },
]);

export const CommonContext = createContext<{
  kb_id: string;
  refreshModel: () => void;
  modelList: ModelLLM[];
}>({
  kb_id: '',
  modelList: [],
  refreshModel: () => {},
});
