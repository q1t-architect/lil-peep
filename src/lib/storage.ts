// =============================================================================
// Neighborly MVP — Storage helpers (TypeScript)
// For use with @supabase/supabase-js client
// =============================================================================

import { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StorageBucket = "avatars" | "listing-photos";

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export interface AvatarUploadOptions {
  userId: string;
  file: File;
}

export interface ListingPhotoUploadOptions {
  userId: string;
  listingId: string;
  index: number; // 0-4 (max 5 photos per listing)
  file: File;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const LISTING_PHOTO_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS_PER_LISTING = 5;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

function validateFile(file: File, maxSize: number): void {
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    throw new Error(
      `Invalid file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`
    );
  }
  if (file.size > maxSize) {
    throw new Error(
      `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: ${maxSize / 1024 / 1024}MB`
    );
  }
}

function getFileExtension(file: File): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return mimeToExt[file.type] ?? "jpg";
}

// ---------------------------------------------------------------------------
// Avatar helpers
// ---------------------------------------------------------------------------

/**
 * Upload (or replace) user avatar.
 * Path: {userId}/avatar.{ext}
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  { userId, file }: AvatarUploadOptions
): Promise<UploadResult> {
  validateFile(file, AVATAR_MAX_SIZE);

  const ext = getFileExtension(file);
  const filePath = `${userId}/avatar.${ext}`;

  // Remove existing avatar files (different extensions)
  const { data: existingFiles } = await supabase.storage
    .from("avatars")
    .list(userId);

  if (existingFiles && existingFiles.length > 0) {
    const filesToRemove = existingFiles
      .filter((f) => f.name.startsWith("avatar."))
      .map((f) => `${userId}/${f.name}`);

    if (filesToRemove.length > 0) {
      await supabase.storage.from("avatars").remove(filesToRemove);
    }
  }

  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Avatar upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return { path: filePath, publicUrl };
}

/**
 * Get avatar public URL (no auth needed).
 */
export function getAvatarUrl(
  supabase: SupabaseClient,
  userId: string
): string {
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(`${userId}/avatar.jpg`);

  return publicUrl;
}

/**
 * Delete user avatar.
 */
export async function deleteAvatar(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: existingFiles } = await supabase.storage
    .from("avatars")
    .list(userId);

  if (existingFiles && existingFiles.length > 0) {
    const filesToRemove = existingFiles.map((f) => `${userId}/${f.name}`);
    const { error } = await supabase.storage.from("avatars").remove(filesToRemove);
    if (error) throw new Error(`Avatar delete failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Listing photo helpers
// ---------------------------------------------------------------------------

/**
 * Upload a single listing photo.
 * Path: {userId}/{listingId}/{index}.{ext}
 * Max 5 photos per listing (enforced here + frontend).
 */
export async function uploadListingPhoto(
  supabase: SupabaseClient,
  { userId, listingId, index, file }: ListingPhotoUploadOptions
): Promise<UploadResult> {
  if (index < 0 || index >= MAX_PHOTOS_PER_LISTING) {
    throw new Error(`Invalid photo index: ${index}. Must be 0-${MAX_PHOTOS_PER_LISTING - 1}`);
  }

  validateFile(file, LISTING_PHOTO_MAX_SIZE);

  const ext = getFileExtension(file);
  const filePath = `${userId}/${listingId}/${index}.${ext}`;

  const { error } = await supabase.storage
    .from("listing-photos")
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Listing photo upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from("listing-photos").getPublicUrl(filePath);

  return { path: filePath, publicUrl };
}

/**
 * Get all public URLs for a listing's photos.
 * Returns up to MAX_PHOTOS_PER_LISTING potential URLs.
 */
export function getListingPhotoUrls(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
  count: number = MAX_PHOTOS_PER_LISTING
): string[] {
  const urls: string[] = [];
  for (let i = 0; i < Math.min(count, MAX_PHOTOS_PER_LISTING); i++) {
    const {
      data: { publicUrl },
    } = supabase.storage
      .from("listing-photos")
      .getPublicUrl(`${userId}/${listingId}/${i}.jpg`);
    urls.push(publicUrl);
  }
  return urls;
}

/**
 * Delete all photos for a listing.
 */
export async function deleteListingPhotos(
  supabase: SupabaseClient,
  userId: string,
  listingId: string
): Promise<void> {
  const folder = `${userId}/${listingId}`;
  const { data: existingFiles } = await supabase.storage
    .from("listing-photos")
    .list(folder);

  if (existingFiles && existingFiles.length > 0) {
    const filesToRemove = existingFiles.map((f) => `${folder}/${f.name}`);
    const { error } = await supabase.storage
      .from("listing-photos")
      .remove(filesToRemove);
    if (error) throw new Error(`Listing photos delete failed: ${error.message}`);
  }
}

/**
 * Delete a single listing photo by index.
 */
export async function deleteListingPhoto(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
  index: number
): Promise<void> {
  const exts = ["jpg", "png", "webp"];
  const paths = exts.map((ext) => `${userId}/${listingId}/${index}.${ext}`);
  const { error } = await supabase.storage.from("listing-photos").remove(paths);
  if (error) throw new Error(`Listing photo delete failed: ${error.message}`);
}
