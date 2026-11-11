const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export async function api<T = any>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(BASE + path, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {}

  if (res.status === 401 && token) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
  if (!res.ok || !data?.success) {
    throw new Error(data?.message ?? `Request failed (${res.status})`);
  }
  return data;
}

export const money = (v: unknown) => `$${Number(v).toFixed(2)}`;