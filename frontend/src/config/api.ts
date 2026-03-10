//-- API 設定（環境別）
//--
//-- 【環境】
//-- ・development: VITE_API_BASE 未設定 → 空（Vite プロキシ /api 使用）
//-- ・staging / production: .env.staging / .env.production の VITE_API_BASE を使用
//--
//-- 【使い方】
//-- ・getApiBase(): API のベース URL。空のときは同一オリジン（プロキシ経由）
//-- ・getApiPrefix(): 同一オリジン時は "/api"、外部 URL 時は ""

export function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}

export function getApiPrefix(): string {
  return getApiBase() ? "" : "/api"
}
