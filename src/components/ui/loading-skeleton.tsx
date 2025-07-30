import * as React from "react";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "text" | "circle" | "rectangle";
}

export function LoadingSkeleton({
  className = "",
  variant = "rectangle"
}: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-muted";

  const variantClasses = {
    text: "h-4 rounded",
    circle: "rounded-full",
    rectangle: "rounded"
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
    />
  );
}

interface StatusIndicatorProps {
  status: "online" | "loading" | "error" | "offline";
  className?: string;
}

export function StatusIndicator({ status, className = "" }: StatusIndicatorProps) {
  const statusClasses = {
    online: "bg-green-500 animate-pulse",
    loading: "bg-blue-500 animate-spin",
    error: "bg-red-500 animate-pulse",
    offline: "bg-gray-400"
  };

  return (
    <div
      className={cn(
        "w-2 h-2 rounded-full",
        statusClasses[status],
        className
      )}
    />
  );
}
