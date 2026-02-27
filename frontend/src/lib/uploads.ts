import { readErrorMessage } from "./api";

const BASE = import.meta.env.VITE_API_BASE_URL as string;

export async function presignPut(filename: string, contentType: string) {
  const res = await fetch(`${BASE}/api/uploads/presign-put`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, content_type: contentType }),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as { key: string; url: string; method: "PUT"; content_type: string };
}

export async function uploadToS3(url: string, file: File) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`S3 upload failed: ${res.status}`);
  }
}

export async function presignGet(key: string) {
  const res = await fetch(`${BASE}/api/uploads/presign-get?key=${encodeURIComponent(key)}`);

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as { url: string };
}
