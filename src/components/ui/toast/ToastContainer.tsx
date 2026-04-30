"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  const icon: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  const borderColor: Record<ToastType, string> = {
    success: "border-emerald-400/40",
    error: "border-red-400/40",
    info: "border-brand/30",
  };

  const iconColor: Record<ToastType, string> = {
    success: "text-emerald-500",
    error: "text-red-500",
    info: "text-brand",
  };

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={() => onDismiss(t.id)}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-white/90 px-4 py-3 text-left shadow-lg backdrop-blur-sm dark:bg-slate-900/90",
              borderColor[t.type],
            )}
          >
            <span className={cn("text-sm font-bold", iconColor[t.type])}>
              {icon[t.type]}
            </span>
            <span className="max-w-xs text-sm text-ink dark:text-slate-100">
              {t.message}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
