"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { createListing, updateListing, type CreateListingInput } from "@/lib/listings.client";
import { CATEGORIES, MADRID_NEIGHBORHOODS } from "@/lib/constants";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { validateListing } from "@/lib/moderation";
import type { ListingWithOwner } from "@/lib/listings.client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  userId: string;
  editing?: ListingWithOwner;
}

/**
 * A photo is either:
 * - "url"  — already a remote URL (from existing listing or previous upload)
 * - "file" — new local file not yet uploaded; preview is an object URL for display
 */
type PhotoEntry =
  | { type: "url"; url: string }
  | { type: "file"; preview: string; file: File };

function getPhotoSrc(entry: PhotoEntry): string {
  return entry.type === "url" ? entry.url : entry.preview;
}

function getFileExt(file: File): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[file.type] ?? "jpg";
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
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>(
    (editing?.images ?? []).map((url) => ({ type: "url", url })),
  );
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // -------------------------------------------------------------------------
  // Photo selection — just create local preview, defer upload to submit
  // -------------------------------------------------------------------------
  const handleFiles = useCallback(
    (files: FileList) => {
      const remaining = 5 - photoEntries.length;
      const toAdd = Array.from(files).slice(0, remaining);

      const newEntries: PhotoEntry[] = [];
      for (const file of toAdd) {
        if (file.size > 5 * 1024 * 1024) {
          setToast(`${file.name}: max 5 MB`);
          continue;
        }
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          setToast(`${file.name}: JPEG, PNG or WebP only`);
          continue;
        }
        newEntries.push({ type: "file", preview: URL.createObjectURL(file), file });
      }
      setPhotoEntries((prev) => [...prev, ...newEntries]);
    },
    [photoEntries.length],
  );

  const removePhoto = (index: number) => {
    setPhotoEntries((prev) => {
      const entry = prev[index];
      // Revoke blob URL to avoid memory leaks
      if (entry.type === "file") URL.revokeObjectURL(entry.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // -------------------------------------------------------------------------
  // Neighborhood → coords
  // -------------------------------------------------------------------------
  const handleNeighborhood = (name: string) => {
    setNeighborhood(name);
    const n = MADRID_NEIGHBORHOODS.find((nb) => nb.name === name);
    if (n) { setLat(n.lat); setLng(n.lng); }
  };

  // -------------------------------------------------------------------------
  // Validate
  // -------------------------------------------------------------------------
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = t("listing.valTitleRequired");
    else if (title.length > 80) e.title = t("listing.valTitleTooLong");
    if (!description.trim()) e.description = t("listing.valDescriptionRequired");
    if (!category) e.category = t("listing.valCategoryRequired");
    if (!neighborhood) e.neighborhood = t("listing.valNeighborhoodRequired");
    if (photoEntries.length === 0) e.photos = t("listing.valPhotoRequired");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // -------------------------------------------------------------------------
  // Upload pending files to Supabase Storage
  // Returns final URL list (existing urls kept, new files uploaded)
  // -------------------------------------------------------------------------
  async function uploadPendingPhotos(listingId: string): Promise<string[]> {
    const supabase = createClient();
    const urls: string[] = [];

    for (let i = 0; i < photoEntries.length; i++) {
      const entry = photoEntries[i];
      if (entry.type === "url") {
        urls.push(entry.url);
        continue;
      }

      setUploadProgress(`Uploading photo ${i + 1} of ${photoEntries.length}…`);

      const ext = getFileExt(entry.file);
      const path = `${userId}/${listingId}/${i}.${ext}`;

      const { error } = await supabase.storage
        .from("listing-photos")
        .upload(path, entry.file, { upsert: true, contentType: entry.file.type });

      if (error) {
        console.error("Photo upload error:", error.message);
        // Skip failed uploads — don't break the whole listing creation
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("listing-photos")
        .getPublicUrl(path);

      urls.push(publicUrl);
      // Revoke blob URL now that we have the real URL
      URL.revokeObjectURL(entry.preview);
    }

    setUploadProgress(null);
    return urls;
  }

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Rate limit: listing creation
    if (!isEdit) {
      const { allowed } = checkRateLimit(
        `listingCreate:${userId}`,
        RATE_LIMITS.listingCreate.limit,
        RATE_LIMITS.listingCreate.windowMs,
      );
      if (!allowed) {
        setToast("You’ve created too many listings recently. Please try again later.");
        return;
      }
    }

    // Content moderation
    const mod = validateListing(title, description);
    if (!mod.ok) {
      setToast(`Content blocked: ${mod.reason}`);
      setErrors({ ...errors, moderation: mod.reason });
      return;
    }

    setSubmitting(true);

    try {
      const baseInput: CreateListingInput = {
        title: title.trim(),
        description: description.trim(),
        category,
        neighborhood,
        price_type: priceType,
        price_euro: priceType === "symbolic" ? parseFloat(priceEuro) || undefined : undefined,
        lat: lat ?? 40.4168,
        lng: lng ?? -3.7038,
        images: [],
      };

      if (isEdit && editing) {
        // Edit flow: upload new files first (we already have the listing ID)
        const imageUrls = await uploadPendingPhotos(editing.id);
        await updateListing({ id: editing.id, ...baseInput, images: imageUrls });
        router.push(`/listing/${editing.id}`);
      } else {
        // Create flow:
        // 1. Create listing with no images to get an ID
        const result = await createListing({ ...baseInput, images: [] });
        if (!result?.id) throw new Error("Listing creation returned no ID");

        // 2. Upload photos to {userId}/{listingId}/{index}.ext
        const imageUrls = await uploadPendingPhotos(result.id);

        // 3. Update listing with the real image URLs (only if we got any)
        if (imageUrls.length > 0) {
          await updateListing({ id: result.id, images: imageUrls });
        }

        router.push(`/listing/${result.id}`);
      }
    } catch (err) {
      console.error("Submit error:", err);
      setToast(isEdit ? t("listing.updateError") : t("listing.createError"));
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  // -------------------------------------------------------------------------
  // Static map preview
  // -------------------------------------------------------------------------
  const staticMapUrl =
    lat != null && lng != null
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
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t("listing.titleLabel")}
          </label>
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
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t("listing.descriptionLabel")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder={t("listing.descriptionPlaceholder")}
            className="input-base min-h-[100px] resize-y"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-rose-500">{errors.description}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t("listing.categoryLabel")}
          </label>
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
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t("listing.neighborhoodLabel")}
          </label>
          <select
            value={neighborhood}
            onChange={(e) => handleNeighborhood(e.target.value)}
            className="input-base"
          >
            <option value="">{t("listing.neighborhoodPlaceholder")}</option>
            {MADRID_NEIGHBORHOODS.map((n) => (
              <option key={n.name} value={n.name}>
                {n.name}
              </option>
            ))}
          </select>
          {errors.neighborhood && (
            <p className="mt-1 text-xs text-rose-500">{errors.neighborhood}</p>
          )}
        </div>

        {/* Price */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t("listing.priceLabel")}
          </label>
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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-muted">
                  €
                </span>
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
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t("listing.photosLabel")}
          </label>
          <div className="flex flex-wrap gap-3">
            {photoEntries.map((entry, i) => (
              <div
                key={i}
                className="relative h-24 w-24 overflow-hidden rounded-2xl ring-2 ring-brand/20"
              >
                {/* Use img for blob: preview URLs to avoid Next.js Image domain restrictions */}
                {entry.type === "file" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src={entry.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white hover:bg-black/70"
                >
                  ×
                </button>
                {entry.type === "file" && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-[9px] text-white">
                    new
                  </span>
                )}
              </div>
            ))}
            {photoEntries.length < 5 && (
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

        {/* Pickup location */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t("listing.locationLabel")}
          </label>
          <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={staticMapUrl}
              alt="Pickup location"
              className="h-[200px] w-full object-cover"
            />
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
          {uploadProgress ?? (submitting
            ? "…"
            : isEdit
              ? t("listing.updateBtn")
              : t("listing.createBtn"))}
        </motion.button>
      </form>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[110] w-[min(90vw,420px)] -translate-x-1/2 cursor-pointer rounded-2xl border border-black/[0.06] bg-white/95 px-4 py-3 text-center text-sm font-medium text-ink shadow-glass-lg dark:border-white/10 dark:bg-slate-900/95"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
