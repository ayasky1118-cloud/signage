//-- useAddressApi - 住所検証・ジオコーディング API 用 composable
//--
//-- 【用途】
//-- ・注文フォームの住所入力後、MapTiler Geocoding で住所を検証（地図表示可能かチェック）
//-- ・住所から座標（lat/lng）を取得し、MapPreview で地図を表示
//--
//-- 【API】
//-- ・GET /address/validate: 住所検証。1件以上ヒットで valid: true
//-- ・GET /address/geocode: ジオコーディング。座標を返す（404: 該当なし、503: API キー未設定）
//--
//-- 【環境】
//-- ・VITE_API_BASE 未設定時: 同一オリジン → Vite プロキシ /api を使用
//-- ・VITE_API_BASE 設定時: 指定 URL をベースに（末尾スラッシュは除去）

//-------------------------------------------------------------------------------
//-- API ベースURL 取得
//-------------------------------------------------------------------------------

//-- VITE_API_BASE またはデフォルトから API のベース URL を取得。末尾スラッシュは除去
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}

//-- getApiBase が空（同一オリジン）のとき /api をプレフィックスに付与（Vite プロキシ用）
const API_PREFIX = getApiBase() ? "" : "/api"

//-------------------------------------------------------------------------------
//-- 型定義
//-------------------------------------------------------------------------------

//-- 住所検証 API のレスポンス。valid: 検証結果、skipped: API キー未設定でスキップした場合 true
export interface ValidateAddressResult {
  valid: boolean
  message?: string | null
  skipped?: boolean
}

//-- ジオコーディング API のレスポンス。緯度・経度
export interface GeocodeResult {
  lat: number
  lng: number
}

//-------------------------------------------------------------------------------
//-- 住所検証
//-------------------------------------------------------------------------------

//-- 住所を検証する。バックエンドが MapTiler Geocoding を呼び、1件以上ヒットすれば valid: true。API キー未設定時は skipped: true で valid: true が返る。通信エラー・API エラー時は valid: false と message を返す（throw しない）。
export async function validateAddress(address: string): Promise<ValidateAddressResult> {
  const base = getApiBase()
  const url = `${base}${API_PREFIX}/address/validate?${new URLSearchParams({ address: address.trim() }).toString()}`
  let res: Response
  try {
    //-- 通信エラー時は throw せず valid: false を返す（ユーザーにエラーメッセージ表示）
    res = await fetch(url)
  } catch {
    return { valid: false, message: "住所の検証中にエラーが発生しました。（通信エラー）" }
  }
  let body: { valid?: boolean; message?: string | null; skipped?: boolean }
  try {
    //-- JSON パース失敗時も valid: false を返す
    body = (await res.json()) as typeof body
  } catch {
    return { valid: false, message: "住所の検証中にエラーが発生しました。" }
  }
  if (!res.ok) {
    return { valid: false, message: (body as { message?: string }).message ?? "住所の検証中にエラーが発生しました。" }
  }
  //-- 正常時: valid, message, skipped を正規化して返す
  return {
    valid: body.valid === true,
    message: body.message ?? null,
    skipped: body.skipped ?? false,
  }
}

//-------------------------------------------------------------------------------
//-- ジオコーディング
//-------------------------------------------------------------------------------

//-- 住所をジオコーディングし、座標（lat, lng）を返す。MapTiler Geocoding を利用。404: 該当住所なし、503: MAPTILER_API_KEY 未設定。いずれも Error を throw。
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
