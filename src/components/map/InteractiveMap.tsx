"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Listing } from "@/lib/data";
import { cn } from "@/lib/utils";

type ClusterOrPin =
  | { kind: "pin"; listing: Listing }
  | { kind: "cluster"; listings: Listing[]; cx: number; cy: number };

function buildClusters(listings: Listing[], zoom: number, w: number, h: number): ClusterOrPin[] {
  if (w < 10 || h < 10) return listings.map((listing) => ({ kind: "pin", listing }));
  const cell = zoom < 0.78 ? 120 : zoom < 0.95 ? 90 : 0;
  if (cell === 0) return listings.map((listing) => ({ kind: "pin", listing }));

  const buckets = new Map<string, Listing[]>();
  for (const listing of listings) {
    const px = listing.mapX * w;
    const py = listing.mapY * h;
    const key = `${Math.floor(px / cell)}-${Math.floor(py / cell)}`;
    const arr = buckets.get(key) ?? [];
    arr.push(listing);
    buckets.set(key, arr);
  }

  const out: ClusterOrPin[] = [];
  for (const group of buckets.values()) {
    if (group.length === 1) {
      out.push({ kind: "pin", listing: group[0] });
    } else {
      const cx = group.reduce((s, l) => s + l.mapX, 0) / group.length;
      const cy = group.reduce((s, l) => s + l.mapY, 0) / group.length;
      out.push({ kind: "cluster", listings: group, cx, cy });
    }
  }
  return out;
}

type InteractiveMapProps = {
  listings: Listing[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
};

export function InteractiveMap({ listings, selectedId, onSelect, className }: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.92);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const clusters = useMemo(
    () => buildClusters(listings, zoom, size.w * 1.4, size.h * 1.4),
    [listings, zoom, size.w, size.h],
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((z) => Math.min(1.35, Math.max(0.48, z + delta)));
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    setIsDragging(true);
    last.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const endDrag = () => {
    dragging.current = false;
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative isolate overflow-hidden rounded-[1.75rem] ring-1 ring-brand/20 dark:ring-brand/30",
        className,
      )}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={endDrag}
      onMouseUp={endDrag}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand/18 via-brand/[0.04] to-brand/10 dark:from-brand/28 dark:via-brand/10 dark:to-brand/15" />
      <div
        className="absolute inset-[-20%] bg-map-grid opacity-40 dark:opacity-25"
        style={{ backgroundSize: "48px 48px" }}
      />
      <div className="absolute inset-0 bg-hero-mesh opacity-60 dark:opacity-40" />

      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: "50% 50%",
          transition: isDragging ? "none" : "transform 0.12s ease-out",
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-[3rem] bg-surface-elevated/30 dark:bg-slate-900/20"
          style={{
            boxShadow: "inset 0 0 140px rgba(37,150,190,0.14)",
          }}
        />

        {clusters.map((item, idx) =>
          item.kind === "pin" ? (
            <MapPin
              key={item.listing.id}
              listing={item.listing}
              selected={selectedId === item.listing.id}
              onSelect={() =>
                onSelect(selectedId === item.listing.id ? null : item.listing.id)
              }
            />
          ) : (
            <ClusterPin
              key={`c-${idx}-${item.listings[0].id}`}
              count={item.listings.length}
              style={{ left: `${item.cx * 100}%`, top: `${item.cy * 100}%` }}
              onClick={() => setZoom((z) => Math.min(1.35, z + 0.18))}
            />
          ),
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-2">
        <div className="glass glass-border rounded-xl px-3 py-2 text-xs text-ink-muted">
          Scroll to zoom · Drag to explore
        </div>
      </div>
    </div>
  );
}

function MapPin({
  listing,
  selected,
  onSelect,
}: {
  listing: Listing;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      style={{ left: `${listing.mapX * 100}%`, top: `${listing.mapY * 100}%` }}
      className={cn(
        "absolute z-10 -translate-x-1/2 -translate-y-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-full",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <span
        className={cn(
          "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full shadow-glass-lg",
          "bg-white ring-2 ring-brand/35 dark:bg-slate-900 dark:ring-brand/40",
          selected && "ring-4 ring-brand/45",
        )}
      >
        <Image src="/logo.png" alt="" width={36} height={36} className="object-contain p-1" />
        {listing.status === "reserved" && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900" />
        )}
      </span>
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 8, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute left-1/2 top-full z-20 w-64 -translate-x-1/2"
          >
            <div className="glass glass-border rounded-2xl p-3 text-left shadow-glass-lg">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">
                {listing.distanceKm.toFixed(1)} km · {listing.neighborhood}
              </p>
              <p className="mt-1 line-clamp-2 font-display text-sm font-semibold text-ink">
                {listing.title}
              </p>
              <p className="mt-1 text-xs text-ink-muted line-clamp-2">{listing.description}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-muted">{listing.owner.name}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    listing.priceType === "free"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-brand/15 text-brand-dim dark:text-brand-glow",
                  )}
                >
                  {listing.priceType === "free" ? "Free" : `€${listing.priceEuro?.toFixed(2)}`}
                </span>
              </div>
              <Link
                href={`/listing/${listing.id}`}
                className="pointer-events-auto mt-3 flex w-full items-center justify-center rounded-xl bg-brand py-2 text-xs font-semibold text-white shadow-brand-soft-sm"
                onClick={(e) => e.stopPropagation()}
              >
                Open listing
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function ClusterPin({
  count,
  style,
  onClick,
}: {
  count: number;
  style: React.CSSProperties;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      style={style}
      className={cn(
        "absolute z-[9] flex h-12 min-w-[3rem] -translate-x-1/2 -translate-y-full items-center justify-center rounded-full",
        "bg-ink px-3 text-sm font-bold text-white shadow-glass-lg ring-2 ring-white/80 dark:bg-slate-100 dark:text-slate-900",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {count}
    </motion.button>
  );
}
