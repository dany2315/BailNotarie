"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface DemandesTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    count?: number;
    icon?: React.ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function DemandesTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: DemandesTabsProps) {
  return (
    <div className={cn("border-b", className)}>
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative px-4 py-3 text-sm font-medium transition-all",
                "hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "border-b-2 border-transparent -mb-[1px]",
                "flex items-center gap-2 whitespace-nowrap",
                isActive
                  ? "text-primary border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-selected={isActive}
              role="tab"
            >
              {tab.icon && <span className="h-4 w-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={cn(
                    "ml-1 text-xs",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  {tab.count}
                </Badge>
              )}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in fade-in"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


