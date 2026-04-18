import { useMemo } from "react";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  clearDashboardNotifications,
  useDashboardNotifications,
  type DashboardNotificationType,
} from "@/hooks/useDashboardNotifications";
import { useNavigate } from "react-router-dom";

const typeLabel: Record<DashboardNotificationType, string> = {
  created: "New Proker",
  edited: "Edited",
  log: "Log Session",
  zone: "Zone",
  completed: "Completed",
  feature: "Feature",
};

export function NotificationBell() {
  const notifications = useDashboardNotifications();
  const navigate = useNavigate();

  const latest = useMemo(() => notifications.slice(0, 12), [notifications]);
  const countLabel = notifications.length > 99 ? "99+" : String(notifications.length);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Open dashboard updates"
          title="Dashboard updates"
        >
          {notifications.length > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {notifications.length > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 leading-4 min-w-4 text-center">
              {countLabel}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="border-b border-border px-3 py-2.5 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Dashboard Updates</p>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => clearDashboardNotifications()}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        {latest.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">No updates yet.</p>
            <p className="text-xs text-muted-foreground mt-1">New prokers and changes will appear here.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto p-2 space-y-2">
            {latest.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/division/${item.division}`)}
                className="w-full text-left rounded-md border border-border/60 bg-background p-2.5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{item.prokerName}</p>
                  <Badge variant="outline" className="text-[10px]">{typeLabel[item.type]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
