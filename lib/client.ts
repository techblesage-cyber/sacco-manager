export type ApiResult<T = Record<string, unknown>> = {
  ok: boolean;
  data: T & { error?: string };
};

export async function sendJson<T = Record<string, unknown>>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch {
    return {
      ok: false,
      data: { error: "The server could not be reached. Check your connection and try again." } as T & { error?: string },
    };
  }
}
