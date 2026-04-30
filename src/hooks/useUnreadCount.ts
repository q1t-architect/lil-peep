"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Returns the number of unread notifications for the current user.
 * Uses realtime subscription to stay in sync.
 */
export function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial count
    async function fetchCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCount(0);
        return;
      }

      const { count: unreadCount, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (!error && unreadCount !== null) {
        setCount(unreadCount);
      }
    }

    fetchCount();

    // Subscribe to changes on notifications table
    const channel = supabase
      .channel("unread-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
