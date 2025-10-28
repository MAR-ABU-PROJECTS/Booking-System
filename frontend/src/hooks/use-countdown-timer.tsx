import { useState, useEffect } from 'react';

function useCountdownTimer(initialTime = 240) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const resetTimer = () => setTimeLeft(initialTime);
  const isRunning = timeLeft > 0;

  return { timeLeft, resetTimer, isRunning };
}

export default useCountdownTimer;
