const BASE = (import.meta.env.VITE_API_BASE_URL ?? "") as string;

function defaultStatusMessage(res: Response) {
  return `${res.status} ${res.statusText}`.trim();
}

export async function readErrorMessage(res: Response): Promise<string> {
  const raw = await res.text().catch(() => "");

  if (!raw) return defaultStatusMessage(res);

  try {
    const parsed = JSON.parse(raw) as { detail?: unknown; message?: unknown };

    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      return parsed.detail;
    }

    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    // no-op
  }

  return raw;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const hasBody = init.body !== undefined && init.body !== null;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return (await res.text()) as T;
  }

  return (await res.json()) as T;
}

export const api = { request };
