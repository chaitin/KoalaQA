'use client';

import { useContext, useEffect } from 'react';
import { CommonContext } from '@/components/commonProvider';

const Scroll = () => {
  const { setHeaderStyle } = useContext(CommonContext);

  useEffect(() => {
    const handleScroll = () => {
      const isTop = document.documentElement.scrollTop === 0;
      setHeaderStyle({
        backgroundColor: isTop ? 'transparent' : 'rgba(255,255,255, 0.8)',
        backdropFilter: isTop ? 'none' : 'blur(10px)',
        boxShadow: isTop
          ? 'none'
          : '0px 2px 6px 0px rgba(0,0,0,0.1), 0px 2px 6px 0px rgba(218,220,224,0.5)',
      });
    };
    handleScroll();
    document.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default Scroll;
