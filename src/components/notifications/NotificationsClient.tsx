"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: "listing" | "message" | "reservation" | "pickup";
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const icon: Record<NotificationItem["type"], string> = {
  listing: "◎",
  message: "✉",
  reservation: "✦",
  pickup: "⏱",
};

export function NotificationsClient({ initialItems }: { initialItems: NotificationItem[] }) {
  const [items, setItems] = useState<NotificationItem[]>(initialItems);

  async function markRead(id: string) {
    // Optimistic update
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read: true } : x)));

    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  async function markAll() {
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setItems((xs) => xs.map((n) => ({ ...n, read: true })));

    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Alerts</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Neighborly notifications</h1>
          <p className="mt-2 text-sm text-ink-muted">New listings, messages, reservations, and gentle pickup reminders.</p>
        </div>
        <button
          type="button"
          onClick={markAll}
          className="shrink-0 rounded-full border border-black/[0.08] px-4 py-2 text-xs font-semibold text-ink-muted transition hover:border-brand/30 hover:text-brand dark:border-white/10"
        >
          Mark all read
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-12 text-center text-sm text-ink-muted">No notifications yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((n, i) => (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                type="button"
                onClick={() => markRead(n.id)}
                className={cn(
                  "flex w-full gap-4 rounded-2xl border px-4 py-4 text-left transition",
                  n.read
                    ? "border-black/[0.05] bg-white/50 dark:border-white/10 dark:bg-slate-900/40"
                    : "border-brand/25 bg-brand/5 shadow-sm dark:bg-brand/10",
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm dark:bg-slate-800">
                  {icon[n.type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-brand" />}
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted">{n.body}</span>
                  <span className="mt-2 block text-[11px] text-ink-muted/80">{n.time}</span>
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
