import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

type Params = Record<string, string | number | undefined | null>;

export function useListQueryParams(defaults: Params = { page: 1, size: 10 }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = useMemo(() => {
    const result: Params = {};
    for (const [key, value] of searchParams.entries()) {
      result[key] = isNaN(Number(value)) ? value : Number(value);
    }
    return { ...defaults, ...result };
  }, [searchParams]);

  const setParams = (updates: Params, options: { replace?: boolean } = {}) => {
    const newParams = new URLSearchParams(searchParams);
    for (const key in updates) {
      const val = updates[key];
      if (val === undefined || val === null || val === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(val));
      }
    }
    navigate({ search: newParams.toString() }, { replace: options.replace ?? true });
  };

  return {
    query,
    page: Number(query.page) || 1,
    size: Number(query.size) || 10,
    setPage: (p: number) => setParams({ page: p }),
    setSize: (s: number) => setParams({ size: s }),
    setSearch: (obj: Params) => setParams({ ...obj, page: 1 }),
    setParams,
    resetSearch: () => setParams({ page: 1, size: defaults.size }),
  };
}
