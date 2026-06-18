import { useState, useMemo, useEffect } from "react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, addMonths, subMonths,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarEvent {
  date: string;     // YYYY-MM-DD
  label: string;
  kind?: "task" | "milestone" | "proker";
  meta?: string;
  color?: string;   // override dot color (e.g. division color)
}

const KIND_COLOR: Record<string, string> = {
  task: "bg-blue-500",
  milestone: "bg-amber-500",
  proker: "bg-primary",
};

const DAY_HEADERS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Derive the best starting month: first upcoming event, else first event, else today. */
function bestDefaultMonth(events: CalendarEvent[]): Date {
  if (events.length === 0) return startOfMonth(new Date());
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const upcoming = events.find((ev) => ev.date >= todayStr);
  const pick = upcoming ?? events[0];
  return startOfMonth(new Date(pick.date + "T00:00:00"));
}

export function CalendarView({ events, instanceKey }: { events: CalendarEvent[]; instanceKey?: string }) {
  const [currentMonth, setCurrentMonth] = useState(() => bestDefaultMonth(events));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // When events change (range switched or data loaded), jump to the best month.
  useEffect(() => {
    setCurrentMonth(bestDefaultMonth(events));
    setSelectedDay(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceKey]);

  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [events]);

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const result: Date[][] = [];
    let day = gridStart;
    while (day <= gridEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      result.push(week);
    }
    return result;
  }, [currentMonth]);

  const selectedEvents = selectedDay ? (eventMap.get(selectedDay) ?? []) : [];

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDay(null); }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDay(null); }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px rounded-lg border border-border/60 overflow-hidden bg-border/60">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="bg-muted/60 text-center text-[10px] font-medium text-muted-foreground py-1.5">
            {d}
          </div>
        ))}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const dayEvents = eventMap.get(dateStr) ?? [];
            const isSelected = selectedDay === dateStr;

            return (
              <button
                key={`${wi}-${di}`}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                className={[
                  "bg-card flex flex-col items-center gap-0.5 py-1.5 px-0.5 min-h-[52px] transition-colors",
                  isCurrentMonth ? "text-foreground" : "text-muted-foreground/30",
                  isSelected ? "bg-primary/10" : "hover:bg-muted/50",
                  dayEvents.length > 0 ? "cursor-pointer" : "cursor-default",
                ].filter(Boolean).join(" ")}
              >
                <span className={[
                  "text-xs w-6 h-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-primary text-primary-foreground font-bold" : "",
                ].filter(Boolean).join(" ")}>
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap justify-center px-1">
                    {dayEvents.slice(0, 3).map((ev, i) => (
                      <div key={i}
                        className={ev.color ? undefined : `h-1.5 w-1.5 rounded-full ${KIND_COLOR[ev.kind ?? "proker"] ?? "bg-primary"}`}
                        style={ev.color ? { width: 6, height: 6, borderRadius: '50%', backgroundColor: ev.color, flexShrink: 0 } : undefined}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] leading-none text-muted-foreground">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Tugas</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Milestone</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary inline-block" /> Proker</span>
      </div>

      {/* Selected day detail */}
      {selectedDay && selectedEvents.length > 0 && (
        <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            {format(new Date(selectedDay + "T00:00:00"), "EEEE, dd MMMM yyyy")}
          </p>
          {selectedEvents.map((ev, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className={ev.color ? undefined : `h-2 w-2 rounded-full shrink-0 mt-1 ${KIND_COLOR[ev.kind ?? "proker"] ?? "bg-primary"}`}
                style={ev.color ? { width: 8, height: 8, borderRadius: '50%', backgroundColor: ev.color, flexShrink: 0, marginTop: 4 } : undefined}
              />
              <div className="min-w-0">
                <p className="text-sm text-foreground leading-snug">{ev.label}</p>
                {ev.meta && <p className="text-[11px] text-muted-foreground">{ev.meta}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDay && selectedEvents.length === 0 && (
        <p className="text-xs text-center text-muted-foreground py-2">Tidak ada event pada tanggal ini.</p>
      )}
    </div>
  );
}
