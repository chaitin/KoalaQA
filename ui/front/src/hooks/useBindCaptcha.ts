import React, { useEffect, useState, useRef } from 'react';
import alert from '@/components/alert';

const useBindCaptcha = (
  id: string,
  {
    init = true,
  }: {
    init?: boolean;
  } = {}
) => {
  const captcha = useRef<any>({});
  const resolveRef = useRef<(value: unknown) => void>(null);
  const rejectRef = useRef<(value: unknown) => void>(null);
  const [token, setToken] = useState<string>();
  const [loading, setLoading] = useState(false);

  const initCaptcha = () => {
    if (!(window as any).SCaptcha) {
      setTimeout(() => {
        initCaptcha();
      }, 200);
      captcha.current.start = () => {
        setLoading(true);
      };
      return;
    }
    captcha.current = new (window as any).SCaptcha({
      businessid: '0195ef4f-b1f8-749e-9ffd-6945a3b77849',
    });
    captcha.current!.bind(
      ('#' + id).replace(/:/g, '\\:'),
      (action: any, data: any) => {
        if (action === 'manualClose') {
          setLoading(false);
          rejectRef!.current!('manualClose');
        }
        if (action === 'finished') {
          setLoading(false);
          if (data) {
            setToken(data);
            initCaptcha();
            resolveRef!.current!(data);
          } else {
            alert.error('Verification failed');
          }
        }
      }
    );
    const oldStart = captcha.current.start.bind(captcha.current);
    captcha.current.start = (e: any) => {
      setLoading(true);
      oldStart(e);
      return new Promise((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;
      });
    };
  };

  useEffect(() => {
    if (init) {
      setTimeout(() => {
        initCaptcha();
      });
    }
  }, [init]);
  return [captcha, token, loading] as [any, string, boolean];
};

export default useBindCaptcha;
