<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue"
import { RouterLink, useRouter, useRoute } from "vue-router"
import flatpickr from "flatpickr"
import { Japanese } from "flatpickr/dist/l10n/ja"
import "flatpickr/dist/flatpickr.min.css"
import "../assets/styles/order-list.css"
import { searchOrders, type OrderItem } from "../composables/useOrderApi"
import { fetchAllDesignTypes, type DesignTypeItem } from "../composables/useDesignTypeApi"

const router = useRouter()
const route = useRoute()

/* 検索条件 */
const searchOrderNo = ref("")
const searchOrderName = ref("")
const searchAddress = ref("")
const searchCustomerName = ref("")
const searchDesignTypeId = ref<string>("")
const searchUpdater = ref("")

/* デザイン種別マスタ（検索条件のセレクト用） */
const designTypeOptions = ref<DesignTypeItem[]>([])

/* 検索条件の開閉 */
const searchConditionExpanded = ref(true)

/* API検索結果 */
const orderItems = ref<OrderItem[]>([])
const totalCount = ref(0)
const hasSearched = ref(false)
const isLoading = ref(false)
const apiError = ref("")
const showNoDataDialog = ref(false)
const showApiErrorDialog = ref(false)
const showDateRangeErrorDialog = ref(false)

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
    const inputFrom = document.getElementById("inputUpdateDateFrom") as HTMLInputElement
    const inputTo = document.getElementById("inputUpdateDateTo") as HTMLInputElement
    const updateDateFrom = inputFrom?.value ? toApiDate(inputFrom.value) : ""
    const updateDateTo = inputTo?.value ? toApiDate(inputTo.value) : ""

    const result = await searchOrders({
      orderNo: searchOrderNo.value,
      orderName: searchOrderName.value,
      address: searchAddress.value,
      customerName: searchCustomerName.value,
      designTypeId: searchDesignTypeId.value ? Number(searchDesignTypeId.value) : undefined,
      updateDateFrom,
      updateDateTo,
      updater: searchUpdater.value,
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

/* 更新日の開始＞終了チェック（YYYY/MM/DD 形式で比較可能） */
function isDateRangeInvalid(): boolean {
  const inputFrom = document.getElementById("inputUpdateDateFrom") as HTMLInputElement
  const inputTo = document.getElementById("inputUpdateDateTo") as HTMLInputElement
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
    const inputTo = document.getElementById("inputUpdateDateTo") as HTMLInputElement
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

/* デザイン種別の表示名（APIで名称を返すためそのまま表示） */
function designTypeLabel(value: string): string {
  return value || "—"
}

/* Flatpickr インスタンス */
let fpFrom: flatpickr.Instance | null = null
let fpTo: flatpickr.Instance | null = null

onMounted(async () => {
  try {
    designTypeOptions.value = await fetchAllDesignTypes()
  } catch {
    designTypeOptions.value = []
  }

  const orderNo = route.query.orderNo as string | undefined
  const searched = route.query.searched === "1"
  if (orderNo) searchOrderNo.value = orderNo
  if (orderNo || searched) performSearch()

  const inputFrom = document.getElementById("inputUpdateDateFrom") as HTMLInputElement
  const inputTo = document.getElementById("inputUpdateDateTo") as HTMLInputElement
  if (inputFrom && inputTo) {
    const opts = {
      locale: Japanese,
      dateFormat: "Y/m/d",
      allowInput: false,
    }
    fpFrom = flatpickr(inputFrom, opts)
    fpTo = flatpickr(inputTo, opts)
  }
})

onUnmounted(() => {
  fpFrom?.destroy()
  fpTo?.destroy()
})

/* URL の orderNo が変わったら検索条件に反映 */
watch(
  () => route.query.orderNo,
  (val) => {
    if (val) searchOrderNo.value = String(val)
  }
)
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
          <div class="flex items-center justify-between gap-4 mb-2 text-main">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-6 bg-subBlue rounded-full"></div>
              <h3 class="font-bold text-base tracking-tight">検索条件</h3>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition-all duration-200"
              :aria-expanded="searchConditionExpanded"
              @click="searchConditionExpanded = !searchConditionExpanded"
            >
              <span
                class="inline-flex transition-transform duration-200"
                :class="{ 'rotate-180': !searchConditionExpanded }"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
              <span>{{ searchConditionExpanded ? "閉じる" : "表示" }}</span>
            </button>
          </div>
          <div
            v-show="searchConditionExpanded"
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 min-w-0"
          >
            <div class="space-y-1.5 sm:col-span-3 min-w-0">
              <div class="flex flex-col lg:flex-row lg:items-center lg:gap-4 gap-2 min-w-0">
                <div class="space-y-1.5 flex-1 min-w-0">
                  <label class="text-xs font-bold text-slate-500 block">注文番号</label>
                  <input
                    v-model="searchOrderNo"
                    type="text"
                    id="inputOrderNo"
                    class="w-full min-w-0 h-[2.25rem] box-border px-4 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200"
                  />
                </div>
                <div class="space-y-1.5 flex-1 min-w-0">
                  <label class="text-xs font-bold text-slate-500 block">注文名</label>
                  <input
                    v-model="searchOrderName"
                    type="text"
                    class="w-full min-w-0 h-[2.25rem] box-border px-4 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200"
                  />
                </div>
                <div class="space-y-1.5 flex-1 min-w-0">
                  <label class="text-xs font-bold text-slate-500 block">住所</label>
                  <input
                    v-model="searchAddress"
                    type="text"
                    class="w-full min-w-0 h-[2.25rem] box-border px-4 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200"
                  />
                </div>
                <div class="space-y-1.5 flex-1 min-w-0">
                  <label class="text-xs font-bold text-slate-500 block">顧客名</label>
                  <input
                    v-model="searchCustomerName"
                    type="text"
                    class="w-full min-w-0 h-[2.25rem] box-border px-4 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200"
                  />
                </div>
              </div>
            </div>
            <div class="space-y-1.5 sm:col-span-3 min-w-0">
              <div class="flex flex-col lg:flex-row lg:items-center gap-2 min-w-0">
                <div class="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center min-w-0">
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
                  <div class="space-y-1.5 lg:ml-2 shrink-0">
                    <label class="text-xs font-bold text-slate-500 block">更新日</label>
                    <div class="flex items-center gap-2">
                      <input
                        type="text"
                        id="inputUpdateDateFrom"
                        readonly
                        placeholder="開始日"
                        class="w-32 min-w-0 h-[2.25rem] box-border px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200 bg-white cursor-pointer"
                      />
                      <span class="text-slate-400 shrink-0 text-xs">～</span>
                      <input
                        type="text"
                        id="inputUpdateDateTo"
                        readonly
                        placeholder="終了日"
                        class="w-32 min-w-0 h-[2.25rem] box-border px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200 bg-white cursor-pointer"
                      />
                    </div>
                  </div>
                  <div class="space-y-1.5 lg:ml-3 shrink-0">
                    <label class="text-xs font-bold text-slate-500 block">更新者</label>
                    <input
                      v-model="searchUpdater"
                      type="text"
                      class="w-36 md:w-40 h-[2.25rem] box-border px-4 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200"
                      placeholder="更新者名を入力"
                    />
                  </div>
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
            </div>
          </div>
        </div>
      </div>

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
              更新日の開始日が終了日より後になっています。<br />終了日を確認してください。
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
                <col id="col-production-type" />
                <col id="col-status" />
                <col id="col-date" />
                <col id="col-action" />
              </colgroup>
              <thead>
                <tr class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th class="px-5 py-4 font-bold border-b border-slate-200 whitespace-nowrap">注文番号</th>
                  <th class="px-5 py-4 font-bold border-b border-slate-200 whitespace-nowrap">
                    <span class="header-2line">注文名<br />住所</span>
                  </th>
                  <th class="px-5 py-4 font-bold border-b border-slate-200 whitespace-nowrap">
                    <span class="header-2line">顧客名<br />担当者</span>
                  </th>
                  <th class="col-design px-4 py-4 font-bold border-b border-slate-200 whitespace-nowrap">
                    <span class="header-2line">デザイン種別<br />テンプレート</span>
                  </th>
                  <th class="col-production-type px-4 py-4 font-bold border-b border-slate-200 whitespace-nowrap">制作区分</th>
                  <th class="col-status px-4 py-4 font-bold border-b border-slate-200 whitespace-nowrap">ステータス</th>
                  <th class="col-date pl-6 pr-2 py-4 font-bold border-b border-slate-200 whitespace-nowrap">
                    <span class="header-2line">更新日<br />更新者</span>
                  </th>
                  <th class="col-action pl-5 pr-2 py-4 font-bold border-b border-slate-200 whitespace-nowrap">枝番</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="order in orderItems"
                  :key="order.orderNo"
                  class="hover:bg-slate-100 transition-colors"
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
                    <div class="text-slate-600 font-semibold text-[12px]">{{ order.orderName }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5 truncate">{{ order.address }}</div>
                  </td>
                  <td class="px-5 py-2">
                    <div class="text-slate-600 font-semibold text-[12px]">{{ order.customerName }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5 truncate">{{ order.manager }}</div>
                  </td>
                  <td class="col-design px-4 py-2">
                    <div class="text-slate-600 text-[12px]">{{ designTypeLabel(order.designType) }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5 truncate">{{ order.template }}</div>
                  </td>
                  <td class="col-production-type px-4 py-2 text-[12px] text-slate-600">
                    {{ order.attribute_04 || "—" }}
                  </td>
                  <td class="col-status px-4 py-2 text-[12px] text-slate-600">
                    {{ order.attribute_05 || "—" }}
                  </td>
                  <td class="col-date pl-6 pr-2 py-2 text-[12px] text-slate-500">
                    <div>{{ order.updateDate }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5 truncate">{{ order.updater }}</div>
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
