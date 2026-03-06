<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue"
import { RouterLink, useRouter, useRoute } from "vue-router"
import flatpickr from "flatpickr"
import { Japanese } from "flatpickr/dist/l10n/ja"
import "flatpickr/dist/flatpickr.min.css"
import "../assets/styles/flatpickr-theme.css"
import "../assets/styles/order-list.css"
import { searchOrders, type OrderItem } from "../composables/useOrderApi"
import { fetchDesignTypes, type DesignTypeItem } from "../composables/useDesignTypeApi"
import { fetchCustomers, type CustomerItem } from "../composables/useCustomerApi"
import OrderNoSelectModal from "../components/OrderNoSelectModal.vue"
import OrderDetailModal from "../components/OrderDetailModal.vue"
import CustomerSelectModal from "../components/CustomerSelectModal.vue"

const router = useRouter()
const route = useRoute()

/* ログイン会社ID（将来は認証ストアから取得） */
function getLoginCompanyId(): number {
  const v = import.meta.env.VITE_LOGIN_COMPANY_ID as string | undefined
  if (v != null && v !== "") {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return 1
}

/* 主項目（常時表示） */
const searchCustomerId = ref<number | null>(null)
const searchCustomerName = ref("")
const searchManager = ref("")
const searchOrderName = ref("")
const searchDesignTypeId = ref<string>("")

/* 詳細検索（展開時のみ表示） */
const searchOrderNo = ref("")
const searchAddress = ref("")
const searchStatus = ref("")
const searchProductionType = ref("")
const searchNote = ref("")

/* デザイン種別マスタ（検索条件のセレクト用） */
const designTypeOptions = ref<DesignTypeItem[]>([])

/* ステータス選択肢（注文登録画面と同様） */
const STATUS_OPTIONS = [
  "依頼中",
  "製作中",
  "確認中",
  "確認完了",
  "製作完了",
  "納品完了",
  "キャンセル",
] as const
/* 制作区分選択肢（注文登録画面と同様） */
const PRODUCTION_TYPE_OPTIONS = ["注文品", "試作品", "サンプル品"] as const

/* 詳細検索の開閉（初期は非表示） */
const detailSearchExpanded = ref(false)

/* API検索結果 */
const orderItems = ref<OrderItem[]>([])
const totalCount = ref(0)
const hasSearched = ref(false)
const isLoading = ref(false)
const apiError = ref("")
const showNoDataDialog = ref(false)
const showApiErrorDialog = ref(false)
const showDateRangeErrorDialog = ref(false)

/* ソート（各項目ごとに直前のソート順を保持） */
const sortBy = ref<"orderNo" | "createdDate" | null>(null)
const sortOrderByOrderNo = ref<"asc" | "desc">("asc")
const sortOrderByCreatedDate = ref<"asc" | "desc">("asc")

function getSortOrder(column: "orderNo" | "createdDate"): "asc" | "desc" {
  return column === "orderNo" ? sortOrderByOrderNo.value : sortOrderByCreatedDate.value
}

function toggleSortOrder(column: "orderNo" | "createdDate") {
  // 初期検索時は createdDate 昇順なので、登録日クリックはトグル扱い
  const isSameColumn = sortBy.value === column || (sortBy.value === null && column === "createdDate")
  if (isSameColumn) {
    const ref = column === "orderNo" ? sortOrderByOrderNo : sortOrderByCreatedDate
    ref.value = ref.value === "asc" ? "desc" : "asc"
    if (sortBy.value === null) sortBy.value = "createdDate"
  } else {
    const wasNull = sortBy.value === null
    sortBy.value = column
    // 初回（sortBy が null）で注文番号をクリックした場合、↓押下＝降順へ切り替え
    if (wasNull) {
      const ref = column === "orderNo" ? sortOrderByOrderNo : sortOrderByCreatedDate
      ref.value = "desc"
    }
  }
  currentPage.value = 1  // ソート変更時は1ページ目へ
  fetchOrders()
}

/* ページネーション（サーバー側） */
const PER_PAGE = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PER_PAGE)))

const paginationStartPage = ref(1)
const visiblePageNumbers = computed(() => {
  const maxVisible = 5
  let start = Math.max(1, Math.min(currentPage.value - Math.floor((maxVisible - 1) / 2), totalPages.value - maxVisible + 1))
  start = Math.max(1, Math.min(start, totalPages.value - maxVisible + 1))
  const end = Math.min(totalPages.value, start + maxVisible - 1)
  paginationStartPage.value = start
  const pages: number[] = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function goToPage(page: number) {
  if (page === currentPage.value) return
  currentPage.value = page
  fetchOrders()
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchOrders()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchOrders()
  }
}

/* エラーメッセージを日本語に変換 */
function toJapaneseError(e: unknown): string {
  const msg = e instanceof Error ? e.message : ""
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "サーバーに接続できませんでした。バックエンドが起動しているか確認してください。"
  }
  if (msg.includes("API error")) {
    const detail = msg.replace(/^API error:\s*/i, "").trim()
    return detail ? `サーバーでエラーが発生しました。（${detail}）` : "サーバーでエラーが発生しました。"
  }
  if (msg.includes("fetch")) return "通信に失敗しました。"
  return msg || "検索に失敗しました。"
}

/* 日付を Y/m/d → YYYY-MM-DD に変換 */
function toApiDate(val: string): string {
  if (!val?.trim()) return ""
  return val.trim().replace(/\//g, "-")
}

/* API検索実行 */
async function fetchOrders() {
  isLoading.value = true
  apiError.value = ""
  try {
    const inputFrom = document.getElementById("inputCreatedDateFrom") as HTMLInputElement
    const inputTo = document.getElementById("inputCreatedDateTo") as HTMLInputElement
    const inputDeadline = document.getElementById("inputDeadline") as HTMLInputElement
    const inputProofreading = document.getElementById("inputProofreading") as HTMLInputElement
    const createdDateFrom = inputFrom?.value ? toApiDate(inputFrom.value) : ""
    const createdDateTo = inputTo?.value ? toApiDate(inputTo.value) : ""
    const deadlineDt = inputDeadline?.value ? toApiDate(inputDeadline.value) : ""
    const proofreadingDt = inputProofreading?.value ? toApiDate(inputProofreading.value) : ""

    const result = await searchOrders({
      companyId: getLoginCompanyId(),
      customerId: searchCustomerId.value ?? undefined,
      manager: searchManager.value,
      orderName: searchOrderName.value,
      designTypeId: searchDesignTypeId.value ? Number(searchDesignTypeId.value) : undefined,
      orderNo: searchOrderNo.value,
      address: searchAddress.value,
      createdDateFrom,
      createdDateTo,
      status: searchStatus.value,
      productionType: searchProductionType.value,
      deadlineDt,
      proofreadingDt,
      note: searchNote.value,
      sortBy: sortBy.value ?? undefined,
      sortOrder: sortBy.value ? getSortOrder(sortBy.value) : "asc",
      page: currentPage.value,
      perPage: PER_PAGE,
    })
    orderItems.value = result.items
    totalCount.value = result.total
    showNoDataDialog.value = result.total === 0
  } catch (e) {
    apiError.value = toJapaneseError(e)
    orderItems.value = []
    totalCount.value = 0
    showNoDataDialog.value = false
    showApiErrorDialog.value = true
  } finally {
    isLoading.value = false
  }
}

/* 登録日の開始＞終了チェック（YYYY/MM/DD 形式で比較可能） */
function isDateRangeInvalid(): boolean {
  const inputFrom = document.getElementById("inputCreatedDateFrom") as HTMLInputElement
  const inputTo = document.getElementById("inputCreatedDateTo") as HTMLInputElement
  const fromVal = inputFrom?.value?.trim() ?? ""
  const toVal = inputTo?.value?.trim() ?? ""
  if (!fromVal || !toVal) return false
  const fromNorm = fromVal.replace(/\//g, "-")
  const toNorm = toVal.replace(/\//g, "-")
  return fromNorm > toNorm
}

/* 検索ボタン押下 */
function performSearch() {
  if (isDateRangeInvalid()) {
    fpFrom?.close()
    fpTo?.close()
    showDateRangeErrorDialog.value = true
    return
  }
  hasSearched.value = true
  currentPage.value = 1
  fetchOrders()
}

/* 戻る */
function goBack() {
  router.back()
}

/* APIエラーダイアログを閉じる */
function closeApiErrorDialog() {
  showApiErrorDialog.value = false
  apiError.value = ""
}

/* 日付範囲エラーダイアログを閉じる（終了日にフォーカス） */
function closeDateRangeErrorDialog() {
  showDateRangeErrorDialog.value = false
  nextTick(() => {
    const inputTo = document.getElementById("inputCreatedDateTo") as HTMLInputElement
    inputTo?.focus()
  })
}

/* 注文メインへのリンク生成 */
function orderMainParams(order: OrderItem) {
  return { path: "/order/main", query: { orderNo: order.orderNo } }
}

/* 看板詳細へのリンク生成 */
function orderDetailParams(order: OrderItem, branch: string) {
  return { path: "/order/detail", query: { orderNo: order.orderNo, itemCode: branch, mode: "edit" } }
}

/* 注文詳細モーダル用 */
const orderDetailModalOpen = ref(false)
const orderDetailSelected = ref<OrderItem | null>(null)

/* 注文詳細モーダルを開く（ダブルクリック時） */
function openOrderView(order: OrderItem) {
  orderDetailSelected.value = order
  orderDetailModalOpen.value = true
}

watch(orderDetailModalOpen, (open) => {
  if (!open) orderDetailSelected.value = null
})

/* デザイン種別の表示名（APIで名称を返すためそのまま表示） */
function designTypeLabel(value: string): string {
  return value || "—"
}

/* Flatpickr インスタンス */
let fpFrom: flatpickr.Instance | null = null
let fpTo: flatpickr.Instance | null = null
let fpDeadline: flatpickr.Instance | null = null
let fpProofreading: flatpickr.Instance | null = null

/* 顧客選択モーダル用 */
const customerListForSelect = ref<CustomerItem[]>([])
const customerSelectModalOpen = ref(false)
const isLoadingCustomers = ref(false)

/* 注文番号選択モーダル用 */
const orderListForSelect = ref<OrderItem[]>([])
const orderNoSelectModalOpen = ref(false)
const isLoadingOrders = ref(false)

function openCustomerSelectModal() {
  customerSelectModalOpen.value = true
  if (customerListForSelect.value.length === 0) {
    isLoadingCustomers.value = true
    fetchCustomers(getLoginCompanyId())
      .then((list) => { customerListForSelect.value = list })
      .catch(() => { customerListForSelect.value = [] })
      .finally(() => { isLoadingCustomers.value = false })
  }
}

/** 顧客選択時。一覧画面では担当者名は検索条件に反映しない */
function selectCustomer(c: CustomerItem) {
  searchCustomerId.value = c.customerId
  searchCustomerName.value = c.customerName
}

function clearCustomer() {
  searchCustomerId.value = null
  searchCustomerName.value = ""
}

async function openOrderNoSelectModal() {
  orderNoSelectModalOpen.value = true
  isLoadingOrders.value = true
  try {
    const result = await searchOrders({ companyId: getLoginCompanyId(), perPage: 50, page: 1 })
    orderListForSelect.value = result.items
  } catch {
    orderListForSelect.value = []
  } finally {
    isLoadingOrders.value = false
  }
}

function selectOrderNo(order: OrderItem) {
  searchOrderNo.value = order.orderNo ?? ""
}

onMounted(async () => {
  try {
    designTypeOptions.value = await fetchDesignTypes(getLoginCompanyId())
  } catch {
    designTypeOptions.value = []
  }

  /* order/main から遷移時: パラメータの注文番号を検索条件に設定し、初期検索を実施 */
  const orderNoFromQuery = (route.query.orderNo as string)?.trim()
  if (orderNoFromQuery) {
    searchOrderNo.value = orderNoFromQuery
    detailSearchExpanded.value = true
    hasSearched.value = true
    currentPage.value = 1
    await fetchOrders()
  }

  await nextTick()
  const opts = { locale: Japanese, dateFormat: "Y/m/d", allowInput: false }
  const inputFrom = document.getElementById("inputCreatedDateFrom") as HTMLInputElement
  const inputTo = document.getElementById("inputCreatedDateTo") as HTMLInputElement
  const inputDeadline = document.getElementById("inputDeadline") as HTMLInputElement
  const inputProofreading = document.getElementById("inputProofreading") as HTMLInputElement
  if (inputFrom && inputTo) {
    fpFrom = flatpickr(inputFrom, opts)
    fpTo = flatpickr(inputTo, opts)
  }
  if (inputDeadline) fpDeadline = flatpickr(inputDeadline, opts)
  if (inputProofreading) fpProofreading = flatpickr(inputProofreading, opts)
})

onUnmounted(() => {
  fpFrom?.destroy()
  fpTo?.destroy()
  fpDeadline?.destroy()
  fpProofreading?.destroy()
})

</script>

<template>
  <main id="order-list-page" class="bg-[#e2e8f0] text-slate-600 min-h-screen">
    <div class="max-w-6xl mx-auto py-12 px-8">
      <!-- 検索条件カード -->
      <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 overflow-hidden mb-4">
        <div class="bg-main px-8 py-4">
          <h2 class="text-base md:text-lg font-bold text-white tracking-tight">注文一覧</h2>
        </div>
        <div class="px-6 pt-4 pb-6 md:px-8 md:pt-5 md:pb-7 min-w-0">
          <!-- 主項目（常時表示）：顧客、担当者名、注文名、デザイン種別 -->
          <div class="flex flex-col gap-4 min-w-0">
            <div class="flex flex-col lg:flex-row lg:items-end lg:gap-4 gap-3 min-w-0">
              <div class="space-y-1.5 flex-1 min-w-0">
                <label class="text-xs font-bold text-slate-500 block">顧客</label>
                <div class="flex items-center gap-2">
                  <input
                    v-model="searchCustomerName"
                    type="text"
                    readonly
                    placeholder="顧客を選択してください"
                    class="flex-1 min-w-0 h-[2.25rem] box-border bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-xs"
                  />
                  <button
                    type="button"
                    title="選択"
                    class="flex items-center justify-center h-[2.25rem] w-[2.25rem] shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-md shadow-slate-300/60 transition-all duration-200"
                    @click="openCustomerSelectModal"
                  >
                    <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="space-y-1.5 w-36 md:w-40 shrink-0">
                <label class="text-xs font-bold text-slate-500 block">担当者名</label>
                <input
                  v-model="searchManager"
                  type="text"
                  class="w-full min-w-0 h-[2.25rem] box-border px-4 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200"
                  placeholder="担当者名を入力"
                />
              </div>
              <div class="space-y-1.5 flex-1 min-w-0">
                <label class="text-xs font-bold text-slate-500 block">注文名</label>
                <input
                  v-model="searchOrderName"
                  type="text"
                  class="w-full min-w-0 h-[2.25rem] box-border px-4 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200"
                  placeholder="注文名を入力"
                />
              </div>
              <div class="space-y-1.5 shrink-0">
                <label class="text-xs font-bold text-slate-500 block">デザイン種別</label>
                <select
                  v-model="searchDesignTypeId"
                  class="w-40 md:w-48 h-[2.25rem] box-border px-4 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none"
                >
                  <option value="">デザイン種別を選択</option>
                  <option
                    v-for="opt in designTypeOptions"
                    :key="opt.designTypeId"
                    :value="String(opt.designTypeId)"
                  >
                    {{ opt.designTypeName }}
                  </option>
                </select>
              </div>
              <div class="space-y-1.5 flex-none">
                <label class="text-xs font-bold text-slate-500 block invisible select-none">検索</label>
                <button
                  type="button"
                  class="shrink-0 h-[2.25rem] px-6 py-2 text-xs rounded-xl bg-main hover:bg-subBlue text-white font-bold shadow-md shadow-main/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="isLoading"
                  @click="performSearch"
                >
                  検索
                </button>
              </div>
            </div>

            <!-- 詳細検索（展開で表示） -->
            <div class="border-t border-slate-200/80 pt-4 mt-2">
              <button
                type="button"
                class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200"
                :aria-expanded="detailSearchExpanded"
                @click="detailSearchExpanded = !detailSearchExpanded"
              >
                <span
                  class="inline-flex transition-transform duration-200"
                  :class="{ 'rotate-180': detailSearchExpanded }"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
                <span>詳細</span>
              </button>
              <div v-show="detailSearchExpanded" class="mt-4 space-y-4 min-w-0">
                <!-- 注文番号・住所・登録日・ステータス（同一行、住所のみ横幅最大） -->
                <div class="flex flex-wrap items-end gap-4 min-w-0">
                  <div class="space-y-1.5 shrink-0">
                    <label class="text-xs font-bold text-slate-500 block">注文番号</label>
                    <div class="flex items-center gap-2">
                      <input
                        v-model="searchOrderNo"
                        type="text"
                        id="inputOrderNo"
                        class="w-32 min-w-0 h-[2.25rem] box-border px-4 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200"
                        placeholder="注文番号を入力してください"
                      />
                      <button
                        type="button"
                        title="選択"
                        class="flex items-center justify-center h-[2.25rem] w-[2.25rem] shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-md shadow-slate-300/60 transition-all duration-200"
                        @click="openOrderNoSelectModal"
                      >
                        <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div class="space-y-1.5 flex-1 min-w-0">
                    <label class="text-xs font-bold text-slate-500 block">住所</label>
                    <input
                      v-model="searchAddress"
                      type="text"
                      class="w-full min-w-0 h-[2.25rem] box-border px-4 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200"
                      placeholder="住所を入力してください"
                    />
                  </div>
                  <div class="space-y-1.5 shrink-0">
                    <label class="text-xs font-bold text-slate-500 block">登録日</label>
                    <div class="flex items-center gap-2">
                      <input
                        type="text"
                        id="inputCreatedDateFrom"
                        readonly
                        placeholder="開始日"
                        class="w-28 min-w-0 h-[2.25rem] box-border px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200 bg-white cursor-pointer"
                      />
                      <span class="text-slate-400 shrink-0 text-xs">～</span>
                      <input
                        type="text"
                        id="inputCreatedDateTo"
                        readonly
                        placeholder="終了日"
                        class="w-28 min-w-0 h-[2.25rem] box-border px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200 bg-white cursor-pointer"
                      />
                    </div>
                  </div>
                  <div class="space-y-1.5 shrink-0">
                    <label class="text-xs font-bold text-slate-500 block">ステータス</label>
                    <select
                      v-model="searchStatus"
                      class="w-28 max-w-28 min-w-0 h-[2.25rem] box-border px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none"
                    >
                      <option value="">ステータスを選択してください</option>
                      <option v-for="opt in STATUS_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                  </div>
                </div>
                <!-- 制作区分・納期・校正予定日・備考（同一行） -->
                <div class="flex flex-wrap items-end gap-4 min-w-0">
                  <div class="space-y-1.5 shrink-0">
                    <label class="text-xs font-bold text-slate-500 block">制作区分</label>
                    <select
                      v-model="searchProductionType"
                      class="w-32 max-w-32 min-w-0 h-[2.25rem] box-border px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none"
                    >
                      <option value="">制作区分を選択してください</option>
                      <option v-for="opt in PRODUCTION_TYPE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                  </div>
                  <div class="space-y-1.5 shrink-0">
                    <label class="text-xs font-bold text-slate-500 block">納期</label>
                    <input
                      type="text"
                      id="inputDeadline"
                      readonly
                      placeholder="納期を選択"
                      class="w-28 min-w-0 h-[2.25rem] box-border px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200 bg-white cursor-pointer"
                    />
                  </div>
                  <div class="space-y-1.5 shrink-0">
                    <label class="text-xs font-bold text-slate-500 block">校正予定日</label>
                    <input
                      type="text"
                      id="inputProofreading"
                      readonly
                      placeholder="校正予定日を選択"
                      class="w-28 min-w-0 h-[2.25rem] box-border px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200 bg-white cursor-pointer"
                    />
                  </div>
                  <div class="space-y-1.5 flex-1 min-w-0">
                    <label class="text-xs font-bold text-slate-500 block">備考</label>
                    <input
                      v-model="searchNote"
                      type="text"
                      class="w-full min-w-0 h-[2.25rem] box-border px-4 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200"
                      placeholder="備考を入力してください"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 注文番号選択モーダル（共通コンポーネント） -->
      <OrderNoSelectModal
        v-model="orderNoSelectModalOpen"
        :items="orderListForSelect"
        :loading="isLoadingOrders"
        @select="selectOrderNo"
      />

      <!-- 注文詳細モーダル（共通コンポーネント） -->
      <OrderDetailModal
        v-model="orderDetailModalOpen"
        :order="orderDetailSelected"
      />

      <!-- 顧客選択モーダル（共通コンポーネント。一覧から起動時は担当者名は反映しない） -->
      <CustomerSelectModal
        v-model="customerSelectModalOpen"
        :items="customerListForSelect"
        :loading="isLoadingCustomers"
        @select="selectCustomer"
        @clear="clearCustomer"
      />

      <!-- 該当データなしダイアログ -->
      <div
        v-show="showNoDataDialog"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="noDataDialogMessage"
      >
        <div class="fixed inset-0 bg-black/40" @click="showNoDataDialog = false"></div>
        <div class="relative bg-white rounded-2xl card-shadow border border-slate-200/80 w-full max-w-md overflow-hidden">
          <div class="px-8 pt-8 pb-6 text-center">
            <p id="noDataDialogMessage" class="text-sm text-slate-600">該当データがありません</p>
          </div>
          <div class="px-8 py-5 flex justify-center">
            <button
              type="button"
              class="px-8 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200"
              @click="showNoDataDialog = false"
            >
              OK
            </button>
          </div>
        </div>
      </div>

      <!-- APIエラーダイアログ -->
      <div
        v-show="showApiErrorDialog"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apiErrorDialogMessage"
      >
        <div class="fixed inset-0 bg-black/40" @click="closeApiErrorDialog"></div>
        <div class="relative bg-white rounded-2xl card-shadow border border-slate-200/80 w-full max-w-md overflow-hidden">
          <div class="px-8 pt-8 pb-6 text-center">
            <p id="apiErrorDialogMessage" class="text-sm text-slate-600">{{ apiError }}</p>
          </div>
          <div class="px-8 py-5 flex justify-center">
            <button
              type="button"
              class="px-8 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200"
              @click="closeApiErrorDialog"
            >
              OK
            </button>
          </div>
        </div>
      </div>

      <!-- 日付範囲エラーダイアログ（開始＞終了） -->
      <div
        v-show="showDateRangeErrorDialog"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dateRangeErrorDialogMessage"
      >
        <div class="fixed inset-0 bg-black/40" @click="closeDateRangeErrorDialog"></div>
        <div class="relative bg-white rounded-2xl card-shadow border border-slate-200/80 w-full max-w-md overflow-hidden">
          <div class="px-8 pt-8 pb-6 text-center">
            <p id="dateRangeErrorDialogMessage" class="text-sm text-slate-600">
              登録日の開始日が終了日より後になっています。<br />終了日を確認してください。
            </p>
          </div>
          <div class="px-8 py-5 flex justify-center">
            <button
              type="button"
              class="px-8 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200"
              @click="closeDateRangeErrorDialog"
            >
              OK
            </button>
          </div>
        </div>
      </div>

      <!-- 読み込み中表示 -->
      <div v-show="hasSearched && isLoading" class="py-12 text-center text-slate-500 text-sm">
        読み込み中...
      </div>

      <!-- 検索結果一覧（データがある場合のみ表示） -->
      <div v-show="hasSearched && !isLoading && orderItems.length > 0" class="orderListSection">
        <div class="flex justify-end items-center gap-4 mb-2 pl-6 pr-6">
          <span class="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60 text-xs">
            <span class="text-slate-500 font-medium">該当</span>
            <span class="font-bold text-main tabular-nums">{{ totalCount }}</span>
            <span class="text-slate-500 font-medium">件</span>
          </span>
        </div>

        <div class="bg-white rounded-2xl card-shadow border border-slate-200/80 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="order-list-table w-full text-left">
              <colgroup>
                <col id="col-order-no" />
                <col id="col-name" />
                <col id="col-customer" />
                <col id="col-design" />
                <col id="col-date" />
                <col id="col-action" />
              </colgroup>
              <thead>
                <tr class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th class="px-5 py-4 font-bold border-b border-slate-200 whitespace-nowrap">
                    <span class="inline-flex items-center gap-1">
                      注文番号
                      <button
                        type="button"
                        :title="getSortOrder('orderNo') === 'asc' ? '降順へ切り替え' : '昇順へ切り替え'"
                        class="w-5 h-6 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 text-[10px] leading-none transition-colors hover:bg-slate-50 hover:border-slate-400"
                        @click="toggleSortOrder('orderNo')"
                      >{{ getSortOrder('orderNo') === 'asc' ? '↓' : '↑' }}</button>
                    </span>
                  </th>
                  <th class="px-5 py-4 font-bold border-b border-slate-200 whitespace-nowrap">
                    <span class="header-2line">注文名<br />住所</span>
                  </th>
                  <th class="px-5 py-4 font-bold border-b border-slate-200 whitespace-nowrap">
                    <span class="header-2line">顧客名<br />担当者</span>
                  </th>
                  <th class="col-design px-4 py-4 font-bold border-b border-slate-200 whitespace-nowrap">
                    <span class="header-2line">デザイン種別<br />テンプレート</span>
                  </th>
                  <th class="col-date pl-6 pr-2 py-4 font-bold border-b border-slate-200 whitespace-nowrap">
                    <span class="inline-flex items-center gap-1">
                      <span class="header-2line">登録日<br />登録者</span>
                      <button
                        type="button"
                        :title="getSortOrder('createdDate') === 'asc' ? '降順へ切り替え' : '昇順へ切り替え'"
                        class="w-5 h-6 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 text-[10px] leading-none transition-colors hover:bg-slate-50 hover:border-slate-400"
                        @click="toggleSortOrder('createdDate')"
                      >{{ getSortOrder('createdDate') === 'asc' ? '↓' : '↑' }}</button>
                    </span>
                  </th>
                  <th class="col-action pl-5 pr-2 py-4 font-bold border-b border-slate-200 whitespace-nowrap">枝番</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="order in orderItems"
                  :key="order.orderNo"
                  class="hover:bg-slate-100 transition-colors cursor-pointer"
                  @dblclick="openOrderView(order)"
                >
                  <td class="px-5 py-2">
                    <RouterLink
                      :to="orderMainParams(order)"
                      class="order-main-link font-mono text-[12px] text-main hover:underline"
                    >
                      {{ order.orderNo }}
                    </RouterLink>
                  </td>
                  <td class="px-5 py-2">
                    <div class="text-slate-600 text-[12px]">{{ order.orderName }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5 truncate">{{ order.address }}</div>
                  </td>
                  <td class="px-5 py-2">
                    <div class="text-slate-600 text-[12px]">{{ order.customerName || "—" }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5 truncate">{{ order.manager?.trim() || "—" }}</div>
                  </td>
                  <td class="col-design px-4 py-2">
                    <div class="text-slate-600 text-[12px]">{{ designTypeLabel(order.designType) }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5 truncate">{{ order.template }}</div>
                  </td>
                  <td class="col-date pl-6 pr-2 py-2 text-[12px] text-slate-500">
                    <div>{{ order.createdDate }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5 truncate">{{ order.creator }}</div>
                  </td>
                  <td class="col-action pl-5 pr-2 py-2 font-mono text-[12px] text-slate-600">
                    <span class="order-branch-links">
                      <RouterLink
                        v-for="branch in order.branches"
                        :key="branch"
                        :to="orderDetailParams(order, branch)"
                        class="font-mono text-[12px] text-main hover:underline"
                      >
                        {{ branch }}
                      </RouterLink>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ページネーション -->
          <div class="bg-slate-50 px-5 py-4 border-t border-slate-200">
            <nav class="flex w-full items-center">
              <div class="flex-1"></div>
              <div class="flex gap-3 items-center">
                <button
                  type="button"
                  class="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-40"
                  :disabled="currentPage <= 1"
                  @click="prevPage"
                >
                  ＜
                </button>
                <div class="flex gap-1.5">
                  <button
                    v-for="p in visiblePageNumbers"
                    :key="p"
                    type="button"
                    class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-200"
                    :class="
                      p === currentPage
                        ? 'bg-main text-white shadow-sm cursor-default pointer-events-none'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                    "
                    :disabled="p === currentPage"
                    @click="goToPage(p)"
                  >
                    {{ p }}
                  </button>
                </div>
                <button
                  type="button"
                  class="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-40"
                  :disabled="currentPage >= totalPages"
                  @click="nextPage"
                >
                  ＞
                </button>
              </div>
              <div class="flex-1 flex justify-end items-center min-w-0">
                <span
                  class="inline-flex items-center gap-1 px-3 py-2.5 rounded-lg bg-white/80 border border-slate-200/60 text-xs text-slate-600 tabular-nums"
                >
                  <span class="text-slate-600">{{ currentPage }}</span>
                  <span class="text-slate-400">/</span>
                  <span>{{ totalPages }}</span>
                </span>
              </div>
            </nav>
          </div>
        </div>
      </div>

      <!-- 戻るボタン -->
      <div class="mt-8 flex justify-start">
        <button
          type="button"
          class="inline-block px-8 py-2.5 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200"
          @click="goBack"
        >
          戻る
        </button>
      </div>
    </div>
  </main>
</template>
