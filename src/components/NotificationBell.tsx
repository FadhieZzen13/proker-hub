import { useMemo } from "react";
import { Bell, BellRing, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMyNotifications, type MyNotificationKind } from "@/hooks/useMyNotifications";
import { useNavigate } from "react-router-dom";

const kindLabel: Record<MyNotificationKind, string> = {
  task: "Task",
  birthday: "Birthday",
  activity: "Update",
};

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useMyNotifications();
  const navigate = useNavigate();

  const latest = useMemo(() => notifications.slice(0, 15), [notifications]);
  const countLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  const handleClick = (n: ReturnType<typeof useMyNotifications>["notifications"][number]) => {
    markRead(n.id);
    if (n.prokerId) navigate(`/division/${n.prokerId}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Open notifications"
          title="Notifications"
        >
          {unreadCount > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 leading-4 min-w-4 text-center">
              {countLabel}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="border-b border-border px-3 py-2.5 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {latest.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Assigned tasks, birthdays and updates appear here.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto p-2 space-y-2">
            {latest.map((item) => (
              <div
                key={item.id}
                className={`group flex items-start gap-2 rounded-md border border-border/60 bg-background p-2.5 ${item.read ? "opacity-60" : "hover:border-primary/40"} transition-colors`}
              >
                <button
                  type="button"
                  onClick={() => handleClick(item)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{kindLabel[item.kind]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                </button>
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => markRead(item.id)}
                    className="opacity-0 group-hover:opacity-100 mt-0.5 p-1 text-muted-foreground hover:text-primary transition-opacity"
                    title="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
