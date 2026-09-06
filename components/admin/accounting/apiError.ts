import { isAxiosError, isCancel } from "axios"

/** Message from an admin API error response, or the fallback. */
export function apiMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: unknown; error?: unknown } | undefined
    if (typeof data?.message === "string" && data.message) return data.message
    if (typeof data?.error === "string" && data.error) return data.error
  }
  return fallback
}

export { isCancel }
