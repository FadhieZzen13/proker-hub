import { supabase } from "@/integrations/supabase/client";

// Upload an image for the public website (Kabinet image, division photos, latest
// updates, member photos). The `site-upload` Edge Function checks the website-admin
// password and returns a one-time signed URL; the browser then uploads straight to
// the public `site-images` bucket.

export type SiteImageFolder = "kabinet" | "divisions" | "latest" | "members" | "prokers";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/site-upload`;
const MAX_SIDE = 1600;

/** Downscale to MAX_SIDE. PNGs stay PNG (keeps transparency, e.g. the Kabinet cut-out); everything else becomes JPEG. */
export async function shrinkImage(file: File): Promise<{ blob: Blob; ext: "jpg" | "png" }> {
  const keepPng = file.type === "image/png";
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const type = keepPng ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  if (!blob) throw new Error("Gambar tidak bisa diproses.");
  return { blob, ext: keepPng ? "png" : "jpg" };
}

export async function uploadSiteImage(file: File, folder: SiteImageFolder, adminSecret: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  const { blob, ext } = await shrinkImage(file);

  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ adminSecret, folder, ext }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Upload gagal (${res.status}).`);

  const { error } = await supabase.storage.from(data.bucket).uploadToSignedUrl(data.path, data.token, blob, { contentType: data.contentType });
  if (error) throw new Error(`Upload gagal: ${error.message}`);
  return data.publicUrl as string;
}
