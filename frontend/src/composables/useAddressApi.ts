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

export interface GeocodeResult {
  lat: number
  lng: number
}

/**
 * 住所をジオコーディングし、座標を返す。MapTiler Geocoding を利用。
 * 失敗時は Error を throw。
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const base = getApiBase()
  const url = `${base}${API_PREFIX}/address/geocode?${new URLSearchParams({ address: address.trim() }).toString()}`
  const res = await fetch(url)
  if (res.status === 404) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(body?.detail ?? "該当する住所が見つかりません。")
  }
  if (res.status === 503) {
    throw new Error("地図表示の設定がありません。MAPTILER_API_KEY を設定してください。")
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(body?.detail ?? "住所の検索中にエラーが発生しました。")
  }
  const data = (await res.json()) as { lat: number; lng: number }
  return { lat: data.lat, lng: data.lng }
}
