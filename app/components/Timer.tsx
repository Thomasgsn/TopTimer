import MotionNumber from "motion-number";
import { ComponentProps, useEffect, useState } from "react";

interface Props {
  isRunning: boolean;
}

export const Timer = ({ isRunning }: Props) => {
  const format: ComponentProps<typeof MotionNumber>["format"] = {
    minimumIntegerDigits: 2,
  } as const;

  const [seconds, setSeconds] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [hours, setHours] = useState<number>(0);

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setSeconds((prev) => prev + 1);

        if (seconds === 59) {
          setSeconds(0);
          setMinutes((prev) => prev + 1);
        }

        if (seconds === 59 && minutes === 59) {
          setSeconds(0);
          setMinutes(0);
          setHours((prev) => prev + 1);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [seconds, isRunning, minutes]);

  return (
    <div className="flex items-center">
      <MotionNumber value={hours} format={format} />
      <div>:</div>
      <MotionNumber value={minutes} format={format} />
      <div>:</div>
      <MotionNumber value={seconds} format={format} />
    </div>
  );
};
