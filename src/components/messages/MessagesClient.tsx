"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  neighborhood: string | null;
};

type Conversation = {
  id: string;
  peer: Profile;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 48) return "Yesterday";
  return new Date(iso).toLocaleDateString();
}

/** Bubble the conversation with the given id to the top of the list */
function bubbleUp(prev: Conversation[], id: string): Conversation[] {
  const idx = prev.findIndex((c) => c.id === id);
  if (idx <= 0) return prev;
  const next = [...prev];
  const [item] = next.splice(idx, 1);
  next.unshift(item);
  return next;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessagesClient() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /**
   * Stable ref to activeId so inbox-level realtime handler can read the
   * current value without being re-registered every time activeId changes.
   */
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // -------------------------------------------------------------------------
  // Load conversations + set up inbox-level realtime
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoadingConvs(false); return; }

    let inboxChannel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      setLoadingConvs(true);

      const { data: convs } = await supabase
        .from("conversations")
        .select(`
          id, participant_1, participant_2, created_at,
          profile1:profiles!conversations_participant_1_fkey (id, name, avatar_url, neighborhood),
          profile2:profiles!conversations_participant_2_fkey (id, name, avatar_url, neighborhood)
        `)
        .or(`participant_1.eq.${user!.id},participant_2.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (!convs || convs.length === 0) {
        setLoadingConvs(false);
        return;
      }

      // Fetch latest message per conversation for sidebar preview
      const convIds = convs.map((c) => c.id);
      const { data: allMsgs } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      const lastMsgMap = new Map<string, { content: string; created_at: string }>();
      if (allMsgs) {
        for (const m of allMsgs) {
          if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m);
        }
      }

      const mapped: Conversation[] = convs.map((c) => {
        const peer =
          c.participant_1 === user!.id
            ? (c.profile2 as unknown as Profile)
            : (c.profile1 as unknown as Profile);
        const last = lastMsgMap.get(c.id);
        return {
          id: c.id,
          peer: peer ?? { id: "", name: "Unknown", avatar_url: null, neighborhood: null },
          lastMessage: last?.content ?? "No messages yet",
          lastAt: last ? timeAgo(last.created_at) : timeAgo(c.created_at),
          unread: 0,
        };
      });

      setConversations(mapped);
      setActiveId((prev) => prev || (mapped[0]?.id ?? ""));
      setLoadingConvs(false);

      // ------------------------------------------------------------------
      // Inbox-level realtime: catches messages in ALL user conversations.
      // No filter → receives everything; we filter client-side by convId.
      // This covers the case where a message arrives in a non-active chat.
      // ------------------------------------------------------------------
      const convIdSet = new Set(convIds);

      inboxChannel = supabase
        .channel("inbox-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const msg = payload.new as Message;
            if (!convIdSet.has(msg.conversation_id)) return; // not our conversation

            setConversations((prev) => {
              const isActive = msg.conversation_id === activeIdRef.current;
              const updated = prev.map((c) => {
                if (c.id !== msg.conversation_id) return c;
                return {
                  ...c,
                  lastMessage: msg.content,
                  lastAt: "just now",
                  // Increment unread only for conversations not currently open
                  unread: isActive ? c.unread : c.unread + 1,
                };
              });
              // Bubble this conversation to the top of the sidebar
              return bubbleUp(updated, msg.conversation_id);
            });
          },
        )
        .subscribe();
    }

    load();

    return () => {
      if (inboxChannel) supabase.removeChannel(inboxChannel);
    };
  }, [user, authLoading, supabase]);

  // -------------------------------------------------------------------------
  // Load messages for active conversation + per-conversation realtime
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!activeId) return;

    setLoadingMsgs(true);

    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? []);
        setLoadingMsgs(false);
      });

    /**
     * Per-conversation channel: finer-grained filter ensures we only process
     * messages for the active conversation. The inbox channel handles sidebar
     * updates; this channel handles the message list + dedup.
     */
    const channel = supabase
      .channel(`chat:${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          // Scroll after state update (the messages useEffect handles most,
          // but we fire an explicit scroll here for the realtime path)
          requestAnimationFrame(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, supabase]);

  // -------------------------------------------------------------------------
  // Auto-scroll when messages change (covers initial load + sends)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // -------------------------------------------------------------------------
  // Switch active conversation — clear unread badge
  // -------------------------------------------------------------------------
  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveId(id);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
      );
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Send message (optimistic)
  // -------------------------------------------------------------------------
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !activeId || !user || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: activeId, sender_id: user.id, content: text })
      .select()
      .single();

    if (!error && data) {
      // Optimistic: add to messages list if realtime hasn't delivered it yet
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message],
      );
      // Sidebar preview (also handled by inbox channel, this ensures immediacy)
      setConversations((prev) =>
        bubbleUp(
          prev.map((c) =>
            c.id === activeId ? { ...c, lastMessage: text, lastAt: "just now" } : c,
          ),
          activeId,
        ),
      );
    } else if (error) {
      setInput(text); // restore on failure
    }

    setSending(false);
  }, [input, activeId, user, sending, supabase]);

  const activeConv = conversations.find((c) => c.id === activeId);

  // -------------------------------------------------------------------------
  // Not authenticated
  // -------------------------------------------------------------------------
  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
            Messages
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
            Coordinate calm pickups
          </h1>
        </header>
        <p className="text-sm text-ink-muted">
          Please{" "}
          <a href="/auth/sign-in" className="text-brand underline underline-offset-2">
            sign in
          </a>{" "}
          to view your messages.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
          Messages
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          Coordinate calm pickups
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Neighborly chat stays on-platform for safety.
        </p>
      </header>

      <div className="grid min-h-[520px] overflow-hidden rounded-[1.75rem] border border-black/[0.06] bg-white/70 shadow-glass-lg dark:border-white/10 dark:bg-slate-900/50 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* ------------------------------------------------------------------ */}
        {/* Sidebar — conversation list                                         */}
        {/* ------------------------------------------------------------------ */}
        <aside className="border-b border-black/[0.06] dark:border-white/10 lg:border-b-0 lg:border-r">
          <div className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Inbox
            </p>
          </div>

          {loadingConvs ? (
            <div className="space-y-1 p-2">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
                  <div className="h-11 w-11 animate-pulse rounded-2xl bg-brand/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-brand/10" />
                    <div className="h-2 w-full animate-pulse rounded bg-brand/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-muted">No conversations yet.</p>
          ) : (
            <ul className="max-h-[40vh] overflow-y-auto lg:max-h-none">
              <AnimatePresence initial={false}>
                {conversations.map((c) => (
                  <motion.li
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(c.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                        c.id === activeId
                          ? "bg-brand/10"
                          : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
                      )}
                    >
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-brand/10">
                        {c.peer.avatar_url && (
                          <Image
                            src={c.peer.avatar_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        )}
                        {c.unread > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                            {c.unread > 9 ? "9+" : c.unread}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm font-semibold",
                            c.unread > 0 ? "text-ink" : "text-ink",
                          )}
                        >
                          {c.peer.name || "User"}
                        </span>
                        <span
                          className={cn(
                            "block truncate text-xs",
                            c.unread > 0
                              ? "font-semibold text-ink"
                              : "text-ink-muted",
                          )}
                        >
                          {c.lastMessage}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] text-ink-muted">{c.lastAt}</span>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </aside>

        {/* ------------------------------------------------------------------ */}
        {/* Chat area                                                           */}
        {/* ------------------------------------------------------------------ */}
        <section className="flex flex-col">
          {!activeConv ? (
            <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">
              {loadingConvs ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              ) : (
                "Select a conversation"
              )}
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4 dark:border-white/10">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-brand/10">
                  {activeConv.peer.avatar_url && (
                    <Image
                      src={activeConv.peer.avatar_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-ink">{activeConv.peer.name || "User"}</p>
                  {activeConv.peer.neighborhood && (
                    <p className="text-xs text-ink-muted">{activeConv.peer.neighborhood}</p>
                  )}
                </div>
                {/* Realtime indicator */}
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Live
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-transparent to-brand/[0.04] p-5 dark:to-brand/[0.08]">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-ink-muted">
                    No messages yet. Say hello!
                  </p>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((m) => {
                      const fromMe = m.sender_id === user?.id;
                      return (
                        <motion.div
                          key={m.id}
                          layout
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 420, damping: 28 }}
                          className={cn("flex", fromMe ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                              fromMe
                                ? "rounded-br-md bg-brand text-white"
                                : "rounded-bl-md bg-white text-ink dark:bg-slate-800 dark:text-slate-100",
                            )}
                          >
                            {m.content}
                            <span
                              className={cn(
                                "mt-1 block text-[10px] opacity-70",
                                fromMe ? "text-white/80" : "text-ink-muted",
                              )}
                            >
                              {timeAgo(m.created_at)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="border-t border-black/[0.06] p-4 dark:border-white/10"
              >
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message…"
                    disabled={sending}
                    autoFocus
                    className="flex-1 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || sending}
                    className="rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-brand-soft-sm transition disabled:opacity-40"
                  >
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
