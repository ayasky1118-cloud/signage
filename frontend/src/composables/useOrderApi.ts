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
  /** 会社ID（ログイン会社。指定時は当該会社の注文のみ返す） */
  companyId?: number
  customerId?: number
  manager?: string
  orderName?: string
  designTypeId?: number
  orderNo?: string
  address?: string
  createdDateFrom?: string
  createdDateTo?: string
  status?: string
  productionType?: string
  deadlineDt?: string
  proofreadingDt?: string
  note?: string
  /** ソート項目（orderNo / createdDate）。未指定時は createdDate 昇順 */
  sortBy?: "orderNo" | "createdDate"
  /** ソート順（asc / desc）。未指定時は asc */
  sortOrder?: "asc" | "desc"
  page?: number
  perPage?: number
}

export interface OrderItem {
  orderId?: number
  orderNo: string
  orderName: string
  address: string
  companyId?: number
  customerId?: number
  customerName: string
  manager: string
  templateId?: number
  template: string
  designTypeId?: number
  designType: string
  /** 納期（Y/m/d） */
  deadlineDt?: string
  /** 校正予定日（Y/m/d） */
  proofreadingDt?: string
  /** 社内CD (attribute_01) */
  attribute_01?: string
  /** 事業所CD (attribute_02) */
  attribute_02?: string
  /** 現場CD (attribute_03) */
  attribute_03?: string
  /** 制作区分 (attribute_04) */
  attribute_04?: string
  /** ステータス (attribute_05) */
  attribute_05?: string
  attribute_06?: string
  attribute_07?: string
  attribute_08?: string
  attribute_09?: string
  attribute_10?: string
  /** 備考 */
  note?: string
  createdDate: string
  creator: string
  branches: string[]
  /** 枝番ごとのデザイン編集データ（order_detail.design_data）。地図のルート・テキスト・画像等 */
  designDataByBranch?: Record<string, unknown>
  /** 枝番ごとの備考（order_detail.note） */
  noteByBranch?: Record<string, string>
}

export interface OrderSearchResult {
  items: OrderItem[]
  total: number
  page: number
  perPage: number
}

/** 注文1件取得（by-no）の order_item 1行 */
export interface OrderDetailItem {
  templateItemId: number
  orderItemVal: string
}

/** 注文1件取得（GET /orders/by-no）のレスポンス。order_item を orderItems で返す */
export interface OrderDetail {
  orderId: number
  orderNo: string
  orderName: string
  address: string
  companyId: number
  customerId: number
  customerName: string
  manager: string
  templateId: number
  templateName: string
  designTypeId: number
  designTypeName: string
  /** 納期（Y/m/d）。未設定時は空文字 */
  deadlineDt?: string
  /** 校正予定日（Y/m/d）。未設定時は空文字 */
  proofreadingDt?: string
  attribute_01: string
  attribute_02: string
  attribute_03: string
  /** 制作区分 (attribute_04) */
  attribute_04?: string
  /** ステータス (attribute_05) */
  attribute_05?: string
  /** 備考 */
  note?: string
  orderItems: OrderDetailItem[]
}

/**
 * 注文番号で1件取得（GET /orders/by-no）。order_item を含む。
 * 該当なしは 404 で throw。その他エラーも throw。
 */
export async function getOrderByNo(orderNo: string): Promise<OrderDetail> {
  const no = orderNo?.trim()
  if (!no) throw new Error("注文番号を指定してください。")
  const base = getApiBase()
  const url = `${base}${API_PREFIX}/orders/by-no?order_no=${encodeURIComponent(no)}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  let res: Response
  try {
    res = await fetch(url, { signal: controller.signal })
  } catch (e) {
    clearTimeout(timeoutId)
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("接続がタイムアウトしました。")
    }
    throw e
  }
  clearTimeout(timeoutId)
  if (res.status === 404) {
    const body = await res.json().catch(() => ({})) as { detail?: string }
    throw new Error(body?.detail ?? "該当データがありません")
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { error?: string; detail?: string }
      if (body?.detail && typeof body.detail === "string") detail = body.detail
      else if (body?.error) detail = body.error
    } catch {
      /* ignore */
    }
    throw new Error(`API error: ${detail}`)
  }
  const data = (await res.json()) as Record<string, unknown>
  return {
    orderId: Number(data.orderId),
    orderNo: String(data.orderNo ?? ""),
    orderName: String(data.orderName ?? ""),
    address: String(data.address ?? ""),
    companyId: Number(data.companyId),
    customerId: Number(data.customerId),
    customerName: String(data.customerName ?? ""),
    manager: String(data.manager ?? ""),
    templateId: Number(data.templateId),
    templateName: String(data.templateName ?? ""),
    designTypeId: Number(data.designTypeId),
    designTypeName: String(data.designTypeName ?? ""),
    deadlineDt: data.deadlineDt != null ? String(data.deadlineDt) : "",
    proofreadingDt: data.proofreadingDt != null ? String(data.proofreadingDt) : "",
    attribute_01: String(data.attribute_01 ?? ""),
    attribute_02: String(data.attribute_02 ?? ""),
    attribute_03: String(data.attribute_03 ?? ""),
    attribute_04: data.attribute_04 != null ? String(data.attribute_04) : "",
    attribute_05: data.attribute_05 != null ? String(data.attribute_05) : "",
    note: data.note != null ? String(data.note) : "",
    orderItems: Array.isArray(data.orderItems)
      ? (data.orderItems as OrderDetailItem[]).map((o) => ({
          templateItemId: Number((o as Record<string, unknown>).templateItemId),
          orderItemVal: String((o as Record<string, unknown>).orderItemVal ?? ""),
        }))
      : [],
  }
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
  /** 顧客ID（order_main.customer_id。顧客の company_id が order_main.company_id に使われる） */
  customerId: number
  templateId: number
  designTypeId: number
  /** 社内CD（必須） */
  attribute01: string
  /** 事業所CD（必須） */
  attribute02: string
  /** 現場CD（必須） */
  attribute03: string
  /** 制作区分（attribute_04）。任意 */
  attribute04?: string
  /** ステータス（attribute_05）。任意 */
  attribute05?: string
  /** 担当者名。任意 */
  managerName?: string
  /** 納期（YYYY-MM-DD）。任意 */
  deadlineDt?: string
  /** 校正予定日（YYYY-MM-DD）。任意 */
  proofreadingDt?: string
  /** 備考。任意 */
  note?: string
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

  if (params.companyId != null) searchParams.set("company_id", String(params.companyId))
  if (params.customerId != null) searchParams.set("customer_id", String(params.customerId))
  if (params.manager?.trim()) searchParams.set("manager", params.manager.trim())
  if (params.orderName?.trim()) searchParams.set("order_name", params.orderName.trim())
  if (params.designTypeId != null) searchParams.set("design_type_id", String(params.designTypeId))
  if (params.orderNo?.trim()) searchParams.set("order_no", params.orderNo.trim())
  if (params.address?.trim()) searchParams.set("address", params.address.trim())
  if (params.createdDateFrom?.trim()) searchParams.set("created_date_from", params.createdDateFrom.trim())
  if (params.createdDateTo?.trim()) searchParams.set("created_date_to", params.createdDateTo.trim())
  if (params.status?.trim()) searchParams.set("status", params.status.trim())
  if (params.productionType?.trim()) searchParams.set("production_type", params.productionType.trim())
  if (params.deadlineDt?.trim()) searchParams.set("deadline_dt", params.deadlineDt.trim())
  if (params.proofreadingDt?.trim()) searchParams.set("proofreading_dt", params.proofreadingDt.trim())
  if (params.note?.trim()) searchParams.set("note", params.note.trim())
  if (params.sortBy === "orderNo") searchParams.set("sort_by", "order_no")
  else if (params.sortBy === "createdDate") searchParams.set("sort_by", "created_date")
  if (params.sortOrder === "asc" || params.sortOrder === "desc") searchParams.set("sort_order", params.sortOrder)
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

/** 枝番毎の登録・更新用 */
export interface OrderDetailBranch {
  branchNo: string
  note?: string
  designData?: unknown
}

/**
 * 注文詳細（枝番毎の備考・design_data）を登録・更新する（PATCH /orders/by-no/details）。
 * 失敗時は Error を throw。
 */
export async function updateOrderDetails(
  orderNo: string,
  branches: OrderDetailBranch[]
): Promise<{ orderNo: string; updated: boolean }> {
  const no = orderNo?.trim()
  if (!no) throw new Error("注文番号を指定してください。")
  const base = getApiBase()
  const url = `${base}${API_PREFIX}/orders/by-no/details?order_no=${encodeURIComponent(no)}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  let res: Response
  try {
    res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branches }),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timeoutId)
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("接続がタイムアウトしました。")
    }
    throw e
  }
  clearTimeout(timeoutId)
  if (res.status === 404) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(body?.detail ?? "該当する注文が見つかりませんでした")
  }
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

/** order_item 更新用（CreateOrderTemplateItem と同形式） */
export interface UpdateOrderItemEntry {
  templateItemId: number
  orderItemVal: string
}

/**
 * 注文の order_item（テンプレート項目の値）を登録・更新する（PATCH /orders/by-no/items）。
 * 失敗時は Error を throw。
 */
export async function updateOrderItems(
  orderNo: string,
  templateItems: UpdateOrderItemEntry[]
): Promise<{ orderNo: string; updated: boolean }> {
  const no = orderNo?.trim()
  if (!no) throw new Error("注文番号を指定してください。")
  const base = getApiBase()
  const url = `${base}${API_PREFIX}/orders/by-no/items?order_no=${encodeURIComponent(no)}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  let res: Response
  try {
    res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateItems }),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timeoutId)
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("接続がタイムアウトしました。")
    }
    throw e
  }
  clearTimeout(timeoutId)
  if (res.status === 404) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(body?.detail ?? "該当する注文が見つかりませんでした")
  }
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
  const body: Record<string, unknown> = {
    loginCompanyId: params.loginCompanyId,
    orderName: params.orderName,
    orderAdd: params.orderAdd,
    customerId: params.customerId,
    templateId: params.templateId,
    designTypeId: params.designTypeId,
    attribute01: params.attribute01,
    attribute02: params.attribute02,
    attribute03: params.attribute03,
    templateItems: params.templateItems,
  }
  if (params.attribute04 != null && params.attribute04 !== "") body.attribute04 = params.attribute04
  if (params.attribute05 != null && params.attribute05 !== "") body.attribute05 = params.attribute05
  if (params.managerName != null && params.managerName !== "") body.managerName = params.managerName
  if (params.deadlineDt != null && params.deadlineDt !== "") body.deadlineDt = params.deadlineDt
  if (params.proofreadingDt != null && params.proofreadingDt !== "") body.proofreadingDt = params.proofreadingDt
  if (params.note != null && params.note !== "") body.note = params.note
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
