/**
 * 注文一覧API用 composable
 *
 * バックエンド GET /orders を呼び出し、検索結果を返す。
 * 開発時は Vite のプロキシ（/api → localhost:8000）を使用。VITE_API_BASE を指定すれば直指定も可。
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return "" // 同一オリジン → Vite プロキシ /api を使用
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

export interface OrderSearchParams {
  orderNo?: string
  orderName?: string
  address?: string
  companyName?: string
  designTypeId?: number
  designTypeName?: string
  updateDateFrom?: string
  updateDateTo?: string
  updater?: string
  page?: number
  perPage?: number
}

export interface OrderItem {
  orderNo: string
  orderName: string
  address: string
  companyId?: number
  companyName: string
  manager: string
  template: string
  designTypeId?: number
  designType: string
  /** 社内CD (attribute_01) */
  attribute_01?: string
  /** 事業所CD (attribute_02) */
  attribute_02?: string
  /** 現場CD (attribute_03) */
  attribute_03?: string
  updateDate: string
  updater: string
  branches: string[]
}

export interface OrderSearchResult {
  items: OrderItem[]
  total: number
  page: number
  perPage: number
}

/**
 * 注文登録時のテンプレート項目。
 * テンプレート項目は可変のため、ID と入力値のペアで渡す。
 */
export interface CreateOrderTemplateItem {
  /** テンプレート項目ID（order_item.template_item_id） */
  templateItemId: number
  /** 入力値（order_item.order_item_val、最大200文字） */
  orderItemVal: string
}

/** 注文新規登録 API のリクエスト Body */
export interface CreateOrderParams {
  /** ログイン会社ID（受注番号採番に使用。order_no_seq の company_id） */
  loginCompanyId: number
  orderName: string
  orderAdd: string
  /** 注文先会社ID（order_main.company_id。この会社に紐づく顧客が customer_id に使われる） */
  companyId: number
  templateId: number
  designTypeId: number
  /** 社内CD（必須） */
  attribute01: string
  /** 事業所CD（必須） */
  attribute02: string
  /** 現場CD（必須） */
  attribute03: string
  /** テンプレート項目ごとの ID と入力値。可変長。 */
  templateItems: CreateOrderTemplateItem[]
}

/** 注文新規登録 API のレスポンス */
export interface CreateOrderResult {
  /** 採番された受注番号（年4桁+連番6桁） */
  orderNo: string
  orderId: number
}

export async function searchOrders(
  params: OrderSearchParams
): Promise<OrderSearchResult> {
  const searchParams = new URLSearchParams()

  if (params.orderNo?.trim()) searchParams.set("order_no", params.orderNo.trim())
  if (params.orderName?.trim()) searchParams.set("order_name", params.orderName.trim())
  if (params.address?.trim()) searchParams.set("address", params.address.trim())
  if (params.companyName?.trim()) searchParams.set("company_name", params.companyName.trim())
  if (params.designTypeId != null) searchParams.set("design_type_id", String(params.designTypeId))
  if (params.designTypeName?.trim()) searchParams.set("design_type_name", params.designTypeName.trim())
  if (params.updateDateFrom?.trim()) searchParams.set("update_date_from", params.updateDateFrom.trim())
  if (params.updateDateTo?.trim()) searchParams.set("update_date_to", params.updateDateTo.trim())
  if (params.updater?.trim()) searchParams.set("updater", params.updater.trim())
  searchParams.set("page", String(params.page ?? 1))
  searchParams.set("per_page", String(params.perPage ?? 10))

  const base = getApiBase()
  const url = `${base}${API_PREFIX}/orders?${searchParams.toString()}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000) // 15秒でタイムアウト
  let res: Response
  try {
    res = await fetch(url, { signal: controller.signal })
  } catch (e) {
    clearTimeout(timeoutId)
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("接続がタイムアウトしました。バックエンド（port 8000）が起動しているか確認してください。")
    }
    throw e
  }
  clearTimeout(timeoutId)

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { error?: string; detail?: string }
      if (body?.error) detail = body.error
      else if (body?.detail && typeof body.detail === "string") detail = body.detail
    } catch {
      /* ignore */
    }
    throw new Error(`API error: ${detail}`)
  }

  return res.json()
}

/**
 * 注文を新規登録する（POST /orders）。
 *
 * - 受注番号（order_no）はバックエンドで order_no_seq に基づき採番される
 *   （ログイン会社・当年、形式: 年4桁+連番6桁）。
 * - テンプレート項目は order_item に、その他は order_main に登録される。
 * - 失敗時は Error を throw（400: 顧客不在、500: サーバーエラー等）。
 */
export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const base = getApiBase()
  const url = `${base}${API_PREFIX}/orders`
  const body = {
    loginCompanyId: params.loginCompanyId,
    orderName: params.orderName,
    orderAdd: params.orderAdd,
    companyId: params.companyId,
    templateId: params.templateId,
    designTypeId: params.designTypeId,
    attribute01: params.attribute01,
    attribute02: params.attribute02,
    attribute03: params.attribute03,
    templateItems: params.templateItems,
  }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timeoutId)
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("接続がタイムアウトしました。バックエンド（port 8000）が起動しているか確認してください。")
    }
    throw e
  }
  clearTimeout(timeoutId)
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const data = (await res.json()) as { detail?: string; error?: string }
      if (data?.detail && typeof data.detail === "string") detail = data.detail
      else if (data?.error && typeof data.error === "string") detail = data.error
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  return res.json()
}
