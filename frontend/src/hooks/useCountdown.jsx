import { useState, useEffect, useRef } from 'react';

export function useCountdown(totalSeconds, onExpire) {
  const [secs, setSecs] = useState(totalSeconds);
  const ref = useRef(null);

  useEffect(() => {
    if (secs <= 0) {
      onExpire?.();
      return;
    }
    ref.current = setInterval(() => setSecs(s => s - 1), 1000);
    return () => clearInterval(ref.current);
  }, []);

  useEffect(() => {
    if (secs <= 0) {
      clearInterval(ref.current);
      onExpire?.();
    }
  }, [secs, onExpire]);

  const pct = (secs / totalSeconds) * 100;
  const urgency = pct > 50 ? 'safe' : pct > 25 ? 'warning' : 'critical';

  return { secs, pct, urgency };
}

export default useCountdown;
