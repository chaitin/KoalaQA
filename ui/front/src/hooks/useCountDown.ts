'use client';
import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { useSessionStorageState } from "ahooks";

const useCountDown = (key: string) => {
  const currentTime = dayjs();
  const [beganDate, setBeganDate] = useSessionStorageState(key, {
    defaultValue: currentTime,
  });
  const [countDown, setCountDown] = useState(() => {
    const diffTime = currentTime.diff(beganDate, "second");
    return diffTime > 60 ? 0 : diffTime;
  });
  const timerRef = useRef<NodeJS.Timeout>(undefined);

  const start = () => {
    if (countDown > 0) return;
    setCountDown(60);
    setBeganDate(dayjs());
    timerRef.current = setInterval(() => {
      setCountDown((prev) => {
        if (prev === 0) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stop = () => {
    clearInterval(timerRef.current);
    setCountDown(0);
  };

  useEffect(() => {
    if (countDown > 0) {
      timerRef.current = setInterval(() => {
        setCountDown((prev) => {
          if (prev === 0) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      clearInterval(timerRef.current);
    };
  }, [countDown]);

  return [countDown, start, stop] as const;
};

export default useCountDown;
