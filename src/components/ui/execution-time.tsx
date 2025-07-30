import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutionTimeProps {
  startTime: number | null;
  endTime: number | null;
  isRunning: boolean;
  className?: string;
}

export function ExecutionTime({
  startTime,
  endTime,
  isRunning,
  className
}: ExecutionTimeProps) {
  const [currentTime, setCurrentTime] = React.useState(Date.now());

  React.useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const getDuration = () => {
    if (!startTime) return 0;
    if (isRunning) {
      return currentTime - startTime;
    } else if (endTime) {
      return endTime - startTime;
    }
    return 0;
  };

  const duration = getDuration();

  if (!startTime || duration === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs font-mono text-muted-foreground",
      isRunning && "text-blue-600",
      className
    )}>
      <Clock className="w-3 h-3" />
      <span>{formatDuration(duration)}</span>
      {isRunning && (
        <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
      )}
    </div>
  );
}
