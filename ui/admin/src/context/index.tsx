import { createContext } from 'react';
import { DomainUser, DomainAdminUser, DomainModel } from '@/api/types';

export const AuthContext = createContext<
  [
    DomainUser | DomainAdminUser | null,
    {
      loading: boolean;
      setUser: (user: DomainUser | DomainAdminUser) => void;
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
}>({
  kb_id: '',
  refreshModel: () => {},
});
