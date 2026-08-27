import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface UseIdleTimeoutOptions {
  timeoutMs: number;
  onIdle: () => void;
}

export function useIdleTimeout({ timeoutMs, onIdle }: UseIdleTimeoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleActivity = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onIdle();
      }, timeoutMs);
    };

    // Set initial timeout
    handleActivity();

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMs, onIdle]);
}
