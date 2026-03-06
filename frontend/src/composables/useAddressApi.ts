/**
 * 住所検証API用 composable
 *
 * バックエンド GET /address/validate を呼び出し、MapTiler Geocoding で住所を検証する。
 */

function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

export interface ValidateAddressResult {
  valid: boolean
  message?: string | null
  skipped?: boolean
}

/**
 * 住所を検証する。バックエンドが MapTiler Geocoding を呼び、1件以上ヒットすれば valid: true。
 * API キー未設定時は skipped: true で valid: true が返る。
 */
export async function validateAddress(address: string): Promise<ValidateAddressResult> {
  const base = getApiBase()
  const url = `${base}${API_PREFIX}/address/validate?${new URLSearchParams({ address: address.trim() }).toString()}`
  let res: Response
  try {
    res = await fetch(url)
  } catch (e) {
    return { valid: false, message: "住所の検証中にエラーが発生しました。（通信エラー）" }
  }
  let body: { valid?: boolean; message?: string | null; skipped?: boolean }
  try {
    body = (await res.json()) as typeof body
  } catch {
    return { valid: false, message: "住所の検証中にエラーが発生しました。" }
  }
  if (!res.ok) {
    return { valid: false, message: (body as { message?: string }).message ?? "住所の検証中にエラーが発生しました。" }
  }
  return {
    valid: body.valid === true,
    message: body.message ?? null,
    skipped: body.skipped ?? false,
  }
}
