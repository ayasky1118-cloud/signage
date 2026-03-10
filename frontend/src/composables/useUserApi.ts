//-- useUserApi - ユーザー API 用 composable
//--
//-- 【用途】
//-- ・注文フォーム等で担当者（user）の選択肢を取得（fetchUsers）
//-- ・ログイン後の user マスタ突合（fetchUserByAuthUid）
//--
//-- 【API】
//-- ・GET /users?company_id=:id: 指定会社のユーザー一覧
//-- ・GET /users/by-auth-uid?auth_uid=:sub: auth_uid（Cognito sub）でマスタ検索。404 なら存在しない
//--
//-- 【レスポンス形式】
//-- ・API は camelCase（userId, companyId, userName）で返す。バックエンドで変換済み
//--
//-- 【API ベースURL】
//-- ・src/config/api の getApiBase / getApiPrefix を使用（環境別 .env で切り替え）
import { getApiBase, getApiPrefix } from "../config/api"
const API_PREFIX = getApiPrefix()

//-- ユーザー1件。担当者選択用
export interface UserItem {
  userId: number
  companyId: number
  userName: string
}

//-- auth_uid（Cognito sub）で user マスタを検索。ログイン可否の突合用。存在しない場合は null を返す。
export interface UserByAuthUid {
  userId: number
  companyId: number
  authUid: string
  email: string
  userName: string
  role: string
}

export async function fetchUserByAuthUid(authUid: string): Promise<UserByAuthUid | null> {
  const base = getApiBase()
  const res = await fetch(`${base}${API_PREFIX}/users/by-auth-uid?auth_uid=${encodeURIComponent(authUid)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
  const r = (await res.json()) as Record<string, unknown>
  return {
    userId: Number(r.userId),
    companyId: Number(r.companyId),
    authUid: String(r.authUid ?? ""),
    email: String(r.email ?? ""),
    userName: String(r.userName ?? ""),
    role: String(r.role ?? ""),
  }
}

//-- 指定会社に紐づくユーザー一覧を取得。担当者選択ドロップダウン等で使用。エラー時は throw。
export async function fetchUsers(companyId: number): Promise<UserItem[]> {
  const base = getApiBase()
  const res = await fetch(`${base}${API_PREFIX}/users?company_id=${companyId}`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>
  return rows.map((r) => ({
    userId: Number(r.userId),
    companyId: Number(r.companyId),
    userName: String(r.userName ?? ""),
  }))
}
