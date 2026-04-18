import { useEffect, useState } from "react";

export type DashboardNotificationType = "created" | "edited" | "log" | "zone" | "completed" | "feature";

export interface DashboardNotification {
  id: string;
  type: DashboardNotificationType;
  prokerId: string;
  prokerName: string;
  division: string;
  message: string;
  createdAt: string;
}

const STORAGE_KEY = "ppi_dashboard_notifications";
const MAX_ITEMS = 40;
const EVENT_NAME = "ppi-dashboard-notifications-updated";

function readNotifications(): DashboardNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DashboardNotification[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeNotifications(items: DashboardNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function pushDashboardNotification(
  type: DashboardNotificationType,
  payload: { prokerId: string; prokerName: string; division: string; message: string }
) {
  const next: DashboardNotification = {
    id: crypto.randomUUID(),
    type,
    prokerId: payload.prokerId,
    prokerName: payload.prokerName,
    division: payload.division,
    message: payload.message,
    createdAt: new Date().toISOString(),
  };
  writeNotifications([next, ...readNotifications()]);
}

export function useDashboardNotifications() {
  const [items, setItems] = useState<DashboardNotification[]>(() => readNotifications());

  useEffect(() => {
    const update = () => setItems(readNotifications());
    window.addEventListener(EVENT_NAME, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT_NAME, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return items;
}

export function clearDashboardNotifications() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT_NAME));
}
