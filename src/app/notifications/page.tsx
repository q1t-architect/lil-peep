import { createClient } from "@/lib/supabase/server";
import { NotificationsClient } from "@/components/notifications/NotificationsClient";

export const dynamic = "force-dynamic";

export type NotificationRow = {
  id: string;
  type: "listing" | "message" | "reservation" | "pickup";
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let notifications: NotificationRow[] = [];

  if (user) {
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      notifications = data;
    }
  }

  const mapped = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? "",
    time: timeAgo(n.created_at),
    read: n.read,
  }));

  return <NotificationsClient initialItems={mapped} />;
}
