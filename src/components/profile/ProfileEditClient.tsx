"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n";

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  neighborhood: string | null;
  bio: string | null;
};

export function ProfileEditClient({ profile }: { profile: Profile }) {
  const { t } = useLocale();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [neighborhood, setNeighborhood] = useState(profile.neighborhood ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const BUCKET = "avatars";

  async function handleAvatarChange(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${profile.id}/avatar.${ext}`;

      // Remove old avatar
      if (avatarUrl) {
        const oldPath = avatarUrl.split("/avatars/")[1];
        if (oldPath) {
          await supabase.storage.from(BUCKET).remove([oldPath]);
        }
      }

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      // Update profile avatar_url
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateErr) throw updateErr;

      setAvatarUrl(publicUrl + "?t=" + Date.now()); // cache bust
    } catch {
      setToast({ ok: false, msg: t("profile.savedError") });
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!avatarUrl) return;
    const supabase = createClient();
    const oldPath = avatarUrl.split("/avatars/")[1]?.split("?")[0];
    if (oldPath) {
      await supabase.storage.from(BUCKET).remove([oldPath]);
    }
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    setAvatarUrl(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setToast({ ok: false, msg: t("profile.valNameRequired") });
      return;
    }
    if (bio.length > 300) {
      setToast({ ok: false, msg: t("profile.valBioTooLong") });
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          bio: bio.trim() || null,
          neighborhood: neighborhood.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setToast({ ok: true, msg: t("profile.savedSuccess") });
      setTimeout(() => router.push("/profile"), 800);
    } catch {
      setToast({ ok: false, msg: t("profile.savedError") });
    } finally {
      setSaving(false);
    }
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg transition-all ${
            toast.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-900/60 dark:text-red-300"
          }`}
          onClick={() => setToast(null)}
        >
          {toast.msg}
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {t("profile.editTitle")}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Avatar */}
        <div className="flex items-center gap-6">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl ring-4 ring-white/80 shadow-xl dark:ring-slate-800">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" sizes="96px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-brand text-2xl font-bold text-white">
                {initials || "?"}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center justify-center rounded-full bg-surface px-5 py-2 text-sm font-semibold text-ink ring-1 ring-black/[0.06] transition hover:bg-slate-50 dark:ring-white/10 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {uploading ? t("profile.avatarUploading") : t("profile.avatarUpload")}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-xs font-semibold text-red-500 hover:underline"
              >
                {t("profile.avatarRemove")}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAvatarChange(f);
              }}
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">
            {t("profile.nameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            placeholder={t("profile.namePlaceholder")}
            className="w-full rounded-xl border border-black/[0.08] bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-slate-900/80"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">
            {t("profile.bioLabel")}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder={t("profile.bioPlaceholder")}
            className="w-full rounded-xl border border-black/[0.08] bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-slate-900/80 resize-none"
          />
          <p className="mt-1 text-right text-xs text-ink-muted">
            {bio.length}/300
          </p>
        </div>

        {/* Neighborhood */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">
            {t("profile.neighborhoodLabel")}
          </label>
          <input
            type="text"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            maxLength={60}
            placeholder={t("profile.neighborhoodPlaceholder")}
            className="w-full rounded-xl border border-black/[0.08] bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-slate-900/80"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-semibold text-white shadow-brand-soft-sm transition hover:bg-brand-dim disabled:opacity-60"
          >
            {saving ? t("profile.saving") : t("profile.saveButton")}
          </button>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="text-sm font-semibold text-ink-muted hover:text-ink"
          >
            {t("profile.cancelButton")}
          </button>
        </div>
      </form>
    </div>
  );
}
