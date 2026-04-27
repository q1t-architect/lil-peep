"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_CONVERSATIONS } from "@/lib/data";
import { cn } from "@/lib/utils";

export function MessagesClient() {
  const [activeId, setActiveId] = useState(MOCK_CONVERSATIONS[0]?.id ?? "");
  const active = MOCK_CONVERSATIONS.find((c) => c.id === activeId) ?? MOCK_CONVERSATIONS[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Messages</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Coordinate calm pickups</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Neighborly chat stays on-platform for safety. This is a UI prototype — no messages leave your browser.
        </p>
      </header>

      <div className="grid min-h-[520px] overflow-hidden rounded-[1.75rem] border border-black/[0.06] bg-white/70 shadow-glass-lg dark:border-white/10 dark:bg-slate-900/50 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-black/[0.06] dark:border-white/10 lg:border-b-0 lg:border-r">
          <div className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Inbox</p>
          </div>
          <ul className="max-h-[40vh] overflow-y-auto lg:max-h-none">
            {MOCK_CONVERSATIONS.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                    c.id === activeId ? "bg-brand/10" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
                  )}
                >
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl">
                    <Image src={c.peer.avatar} alt="" fill className="object-cover" sizes="44px" />
                    {c.unread > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{c.peer.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{c.lastMessage}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-ink-muted">{c.lastAt}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex flex-col">
          {active && (
            <>
              <div className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4 dark:border-white/10">
                <div className="relative h-11 w-11 overflow-hidden rounded-2xl">
                  <Image src={active.peer.avatar} alt="" fill className="object-cover" sizes="44px" />
                </div>
                <div>
                  <p className="font-semibold text-ink">{active.peer.name}</p>
                  <p className="text-xs text-ink-muted">{active.peer.neighborhood}</p>
                </div>
                <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Pickup arranged
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-transparent to-brand/[0.04] p-5 dark:to-brand/[0.08]">
                <AnimatePresence initial={false}>
                  {active.messages.map((m) => (
                    <motion.div
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                          m.fromMe
                            ? "rounded-br-md bg-brand text-white"
                            : "rounded-bl-md bg-white text-ink dark:bg-slate-800 dark:text-slate-100",
                        )}
                      >
                        {m.text}
                        <span
                          className={cn(
                            "mt-1 block text-[10px] opacity-70",
                            m.fromMe ? "text-white/80" : "text-ink-muted",
                          )}
                        >
                          {m.at}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="border-t border-black/[0.06] p-4 dark:border-white/10">
                <div className="flex gap-2">
                  <input
                    readOnly
                    placeholder="Type a message (demo — read only)"
                    className="flex-1 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    className="rounded-2xl bg-brand px-5 text-sm font-semibold text-white opacity-60"
                    disabled
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
