//-- useCompanyApi - 会社一覧 API 用 composable
//--
//-- 【用途】
//-- ・メニュー画面等でログイン会社の選択肢を取得
//-- ・company テーブルをそのまま返すシンプルな API
//--
//-- 【API】
//-- ・GET /companies: 会社一覧（is_deleted = 0 のみ）
//--
//-- 【レスポンス形式】
//-- ・API は snake_case（company_id, company_name, company_post, company_add）で返す
//-- ・本 composable 内で camelCase にマッピングして返却
//--
//-- 【API ベースURL】
//-- ・VITE_API_BASE が設定されていればその値（末尾スラッシュ除去）
//-- ・未設定かつブラウザ実行時: 空文字（同一オリジン。Vite プロキシ /api を使用）
//-- ・未設定かつ SSR 時: http://localhost:8000
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}
//-- 同一オリジン（getApiBase が空）のとき /api を付与。Vite の proxy で /api → バックエンドに転送
const API_PREFIX = getApiBase() ? "" : "/api"

//-- 会社1件。address は company_post + company_add を結合した文字列
export interface CompanyItem {
  companyId: number
  companyName: string
  address: string
}

//-- 会社一覧を取得。メニュー画面のログイン会社選択等で使用。API の snake_case を camelCase にマッピング。エラー時は throw。
export async function fetchCompanies(): Promise<CompanyItem[]> {
  const base = getApiBase()
  const res = await fetch(`${base}${API_PREFIX}/companies`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>
  //-- API は company_id, company_name, company_post, company_add を返す。address は郵便番号+住所を結合
  return rows.map((r) => ({
    companyId: Number(r.company_id),
    companyName: String(r.company_name ?? ""),
    address: [r.company_post, r.company_add].filter(Boolean).join(" ") || "",
  }))
}
