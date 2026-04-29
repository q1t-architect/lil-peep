"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { createListing, updateListing, type CreateListingInput } from "@/lib/listings.client";
import { CATEGORIES, MADRID_NEIGHBORHOODS } from "@/lib/data";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ListingWithOwner } from "@/lib/listings.client";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  userId: string;
  editing?: ListingWithOwner;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ListingFormClient({ userId, editing }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!editing;

  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [neighborhood, setNeighborhood] = useState(editing?.neighborhood ?? "");
  const [priceType, setPriceType] = useState<"free" | "symbolic">(editing?.price_type ?? "free");
  const [priceEuro, setPriceEuro] = useState(editing?.price_euro?.toString() ?? "");
  const [photos, setPhotos] = useState<string[]>(editing?.images ?? []);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

  // --- Photo upload ---
  const handleFiles = useCallback(async (files: FileList) => {
    const supabase = createClient();
    const remaining = 5 - photos.length;
    const toUpload = Array.from(files).slice(0, remaining);

    for (const file of toUpload) {
      if (file.size > 5 * 1024 * 1024) {
        setToast("Max file size is 5 MB");
        continue;
      }
      // In demo mode (no storage), create a local preview URL
      const previewUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, previewUrl]);

      // Try real upload if Supabase is available
      try {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${userId}/temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error } = await supabase.storage.from("listing-photos").upload(path, file);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("listing-photos").getPublicUrl(path);
          setPhotos((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = publicUrl;
            return updated;
          });
        }
      } catch {
        // Keep the blob URL for demo
      }
    }
  }, [photos.length, userId]);

  // --- Neighborhood → coords ---
  const handleNeighborhood = (name: string) => {
    setNeighborhood(name);
    const n = MADRID_NEIGHBORHOODS.find((nb) => nb.name === name);
    if (n) {
      setLat(n.lat);
      setLng(n.lng);
    }
  };

  // --- Validate ---
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = t("listing.valTitleRequired");
    else if (title.length > 80) e.title = t("listing.valTitleTooLong");
    if (!description.trim()) e.description = t("listing.valDescriptionRequired");
    if (!category) e.category = t("listing.valCategoryRequired");
    if (!neighborhood) e.neighborhood = t("listing.valNeighborhoodRequired");
    if (photos.length === 0) e.photos = t("listing.valPhotoRequired");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const input: CreateListingInput = {
        title: title.trim(),
        description: description.trim(),
        category,
        neighborhood,
        price_type: priceType,
        price_euro: priceType === "symbolic" ? parseFloat(priceEuro) || undefined : undefined,
        lat: lat ?? 40.4168,
        lng: lng ?? -3.7038,
        images: photos,
      };

      if (isEdit && editing) {
        await updateListing({ id: editing.id, ...input });
        router.push(`/listing/${editing.id}`);
      } else {
        const result = await createListing(input);
        if (result?.id) {
          router.push(`/listing/${result.id}`);
        } else {
          router.push("/");
        }
      }
    } catch (err) {
      setToast(isEdit ? t("listing.updateError") : t("listing.createError"));
      setSubmitting(false);
    }
  };

  // --- Mapbox static map URL for pickup location ---
  const staticMapUrl = lat != null && lng != null
    ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+2596be(${lng},${lat})/${lng},${lat},14,0/600x300@2x?access_token=${MAPBOX_TOKEN}`
    : `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/-3.7038,40.4168,12,0/600x300@2x?access_token=${MAPBOX_TOKEN}`;

  const categoriesList = CATEGORIES.filter((c) => c !== "All");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={isEdit ? `/listing/${editing!.id}` : "/"}
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition hover:text-brand"
      >
        {t("listing.backToListing")}
      </Link>

      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink">
        {isEdit ? t("listing.editTitle") : t("listing.createTitle")}
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">{t("listing.titleLabel")}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder={t("listing.titlePlaceholder")}
            className="input-base"
          />
          {errors.title && <p className="mt-1 text-xs text-rose-500">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">{t("listing.descriptionLabel")}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder={t("listing.descriptionPlaceholder")}
            className="input-base min-h-[100px] resize-y"
          />
          {errors.description && <p className="mt-1 text-xs text-rose-500">{errors.description}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">{t("listing.categoryLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {categoriesList.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  category === c
                    ? "bg-brand text-white shadow-brand-soft-sm"
                    : "border border-black/[0.08] text-ink-muted hover:border-brand/30 dark:border-white/10",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {errors.category && <p className="mt-1 text-xs text-rose-500">{errors.category}</p>}
        </div>

        {/* Neighborhood */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">{t("listing.neighborhoodLabel")}</label>
          <select
            value={neighborhood}
            onChange={(e) => handleNeighborhood(e.target.value)}
            className="input-base"
          >
            <option value="">{t("listing.neighborhoodPlaceholder")}</option>
            {MADRID_NEIGHBORHOODS.map((n) => (
              <option key={n.name} value={n.name}>{n.name}</option>
            ))}
          </select>
          {errors.neighborhood && <p className="mt-1 text-xs text-rose-500">{errors.neighborhood}</p>}
        </div>

        {/* Price type */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">{t("listing.priceLabel")}</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPriceType("free")}
              className={cn(
                "flex-1 rounded-2xl border py-3 text-center text-sm font-semibold transition",
                priceType === "free"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "border-black/[0.08] text-ink-muted dark:border-white/10",
              )}
            >
              {t("listing.freeLabel")}
            </button>
            <button
              type="button"
              onClick={() => setPriceType("symbolic")}
              className={cn(
                "flex-1 rounded-2xl border py-3 text-center text-sm font-semibold transition",
                priceType === "symbolic"
                  ? "border-brand bg-brand/10 text-brand-dim dark:text-brand-glow"
                  : "border-black/[0.08] text-ink-muted dark:border-white/10",
              )}
            >
              {t("listing.symbolicLabel")}
            </button>
          </div>
          {priceType === "symbolic" && (
            <div className="mt-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-muted">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={priceEuro}
                  onChange={(e) => setPriceEuro(e.target.value)}
                  placeholder="0.00"
                  className="input-base pl-8"
                />
              </div>
            </div>
          )}
        </div>

        {/* Photos */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">{t("listing.photosLabel")}</label>
          <div className="flex flex-wrap gap-3">
            {photos.map((src, i) => (
              <div key={i} className="relative h-24 w-24 overflow-hidden rounded-2xl ring-2 ring-brand/20">
                <Image src={src} alt="" fill className="object-cover" sizes="96px" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white hover:bg-black/70"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-black/[0.12] text-ink-muted transition hover:border-brand/40 hover:text-brand dark:border-white/15"
              >
                <span className="text-2xl">+</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <p className="mt-1.5 text-xs text-ink-muted">{t("listing.photosHint")}</p>
          {errors.photos && <p className="mt-1 text-xs text-rose-500">{errors.photos}</p>}
        </div>

        {/* Pickup location (static map) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">{t("listing.locationLabel")}</label>
          <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={staticMapUrl} alt="Pickup location" className="h-[200px] w-full object-cover" />
            <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-ink backdrop-blur dark:bg-slate-900/80 dark:text-slate-100">
              {neighborhood || "Madrid"} · Pickup
            </div>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">{t("listing.locationHint")}</p>
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={cn(
            "w-full rounded-2xl bg-brand py-4 text-center text-sm font-semibold text-white shadow-brand-soft transition",
            "hover:bg-brand-dim disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {submitting ? "..." : isEdit ? t("listing.updateBtn") : t("listing.createBtn")}
        </motion.button>
      </form>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[110] w-[min(90vw,420px)] -translate-x-1/2 rounded-2xl border border-black/[0.06] bg-white/95 px-4 py-3 text-center text-sm font-medium text-ink shadow-glass-lg dark:border-white/10 dark:bg-slate-900/95">
          {toast}
        </div>
      )}
    </div>
  );
}
