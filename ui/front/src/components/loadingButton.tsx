import LoadingButton, { LoadingButtonProps } from '@mui/lab/LoadingButton';
import { useState } from 'react';

const LoadingBtn = (params: LoadingButtonProps & { onClick: any }) => {
  const [loading, setLoading] = useState(false);
  const handleClick = (event: any) => {
    if (!params.onClick) return;
    const r = params.onClick(event);
    try {
      if (r.then) {
        setLoading(true);
        r.finally(() => {
          setLoading(false);
        });
      }
    } catch (e) {
      setLoading(false);
    }
  };
  return (
    <LoadingButton {...params} onClick={handleClick} loading={loading}>
      {params.children}
    </LoadingButton>
  );
};

export default LoadingBtn;
