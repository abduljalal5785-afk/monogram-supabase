import { supabase } from './client';

const BUCKET = 'media';

// ── Upload a file (base64 data URL → Storage) ─────────────
export async function uploadMedia(dataUrl: string, filename: string): Promise<string | null> {
  // Convert data URL to Blob
  const res = await fetch(dataUrl);
  const blob = await res.blob();

  const path = `${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: true,
  });
  if (error) {
    console.error('Storage upload error:', error);
    return null;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

// ── Upload a File object (from input[type=file]) ──────────
export async function uploadFile(file: File): Promise<string | null> {
  const path = `${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) {
    console.error('Storage upload error:', error);
    return null;
  }
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}
