import * as React from "react";
import { Check, Save, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export function AutoSaveIndicator({ status, className }: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = React.useState(false);

  React.useEffect(() => {
    if (status === "saved") {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const getStatusConfig = () => {
    switch (status) {
      case "saving":
        return {
          icon: Save,
          text: "Saving...",
          className: "text-blue-600 animate-pulse"
        };
      case "saved":
        return {
          icon: Check,
          text: "Saved",
          className: "text-green-600"
        };
      case "error":
        return {
          icon: Clock,
          text: "Save failed",
          className: "text-red-600"
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config || (status === "saved" && !showSaved)) {
    return null;
  }

  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs font-medium transition-all duration-200",
      config.className,
      className
    )}>
      <Icon className="w-3 h-3" />
      <span>{config.text}</span>
    </div>
  );
}
