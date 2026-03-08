<script setup lang="ts">
//-- OrderList - 注文一覧画面
//--
//-- 【用途】
//-- ・注文の検索・一覧表示・ページネーション
//-- ・行ダブルクリックで注文詳細モーダル表示
//-- ・「看板編集」ボタンで OrderDetail へ遷移（orderNo, itemCode をクエリで渡す）
//--
//-- 【主な機能】
//-- ・検索条件: 顧客・担当者・注文名・デザイン種別（主項目）、詳細検索で日付・ステータス等
//-- ・ソート: 注文番号・登録日で昇順/降順切り替え
//-- ・ページネーション: サーバー側（10件/ページ）
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue"
import { RouterLink, useRouter, useRoute } from "vue-router"
import flatpickr from "flatpickr"
import { Japanese } from "flatpickr/dist/l10n/ja"
import "flatpickr/dist/flatpickr.min.css"
import "../assets/styles/flatpickr-theme.css"
import "../assets/styles/order-list.css"
import { searchOrders, type OrderItem } from "../composables/useOrderApi"
import { useOrderNoSelectModal } from "../composables/useOrderNoSelectModal"
import { fetchDesignTypes, type DesignTypeItem } from "../composables/useDesignTypeApi"
import { fetchCustomers, type CustomerItem } from "../composables/useCustomerApi"
import { STATUS_OPTIONS, PRODUCTION_TYPE_OPTIONS } from "../constants/order"
import { FORM_IDS } from "../constants/form-ids"
import OrderNoSelectModal from "../components/OrderNoSelectModal.vue"
import OrderDetailModal from "../components/OrderDetailModal.vue"
import CustomerSelectModal from "../components/CustomerSelectModal.vue"

const router = useRouter()
const route = useRoute()

//-------------------------------------------------------------------------------
//-- ユーティリティ
//-------------------------------------------------------------------------------

//-- ログイン会社IDを返す。VITE_LOGIN_COMPANY_ID がなければ 1。
//-- 将来は認証ストア（Cognito 等）から取得する想定
function getLoginCompanyId(): number {
  const v = import.meta.env.VITE_LOGIN_COMPANY_ID as string | undefined
  if (v != null && v !== "") {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return 1
}

//-------------------------------------------------------------------------------
//-- 検索条件（主項目: 常時表示）
//-------------------------------------------------------------------------------

const searchCustomerId = ref<number | null>(null)
const searchCustomerName = ref("")
const searchManager = ref("")
const searchOrderName = ref("")
const searchDesignTypeId = ref<string>("")

//-- 検索条件（詳細: 展開時のみ表示）
const searchOrderNo = ref("")
const searchAddress = ref("")
const searchStatus = ref("")
const searchProductionType = ref("")
const searchNote = ref("")

//-- デザイン種別マスタ（検索条件のセレクト用）
const designTypeOptions = ref<DesignTypeItem[]>([])

//-- 詳細検索の開閉（初期は非表示）
const detailSearchExpanded = ref(false)

//-------------------------------------------------------------------------------
//-- API 検索結果・ローディング・エラー
//-------------------------------------------------------------------------------

const orderItems = ref<OrderItem[]>([])
const totalCount = ref(0)
const hasSearched = ref(false)
const isLoading = ref(false)
const apiError = ref("")
const showNoDataDialog = ref(false)
const showApiErrorDialog = ref(false)
const showDateRangeErrorDialog = ref(false)

//-------------------------------------------------------------------------------
//-- ソート（各カラムごとに昇順/降順を保持）
//-------------------------------------------------------------------------------

const sortBy = ref<"orderNo" | "createdDate" | null>(null)
const sortOrderByOrderNo = ref<"asc" | "desc">("asc")
const sortOrderByCreatedDate = ref<"asc" | "desc">("asc")

//-- 指定カラムの現在のソート順（昇順/降順）を返す
function getSortOrder(column: "orderNo" | "createdDate"): "asc" | "desc" {
  return column === "orderNo" ? sortOrderByOrderNo.value : sortOrderByCreatedDate.value
}

//-- 指定カラムのソート順をトグルし、1ページ目から再検索する。
//-- 初期状態（sortBy=null）は createdDate 昇順とみなし、登録日クリックでトグル
function toggleSortOrder(column: "orderNo" | "createdDate") {
  const isSameColumn = sortBy.value === column || (sortBy.value === null && column === "createdDate")
  if (isSameColumn) {
    const ref = column === "orderNo" ? sortOrderByOrderNo : sortOrderByCreatedDate
    ref.value = ref.value === "asc" ? "desc" : "asc"
    if (sortBy.value === null) sortBy.value = "createdDate"
  } else {
    const wasNull = sortBy.value === null
    sortBy.value = column
    //-- 初回（sortBy が null）で注文番号をクリックした場合、↓押下＝降順へ切り替え
    if (wasNull) {
      const ref = column === "orderNo" ? sortOrderByOrderNo : sortOrderByCreatedDate
      ref.value = "desc"
    }
  }
  currentPage.value = 1  //-- ソート変更時は1ページ目へ
  fetchOrders()
}

//-------------------------------------------------------------------------------
//-- ページネーション（サーバー側。10件/ページ）
//-------------------------------------------------------------------------------

//-- 1ページあたりの表示件数。API の perPage にそのまま渡す
const PER_PAGE = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PER_PAGE)))

const paginationStartPage = ref(1)
//-- ページネーションで表示するページ番号の配列。最大5件。現在ページを中心に表示
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

//-- 指定ページへ移動し、そのページの検索結果を取得する
function goToPage(page: number) {
  if (page === currentPage.value) return
  currentPage.value = page
  fetchOrders()
}

//-- 前のページへ移動し、検索を再実行する
function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchOrders()
  }
}

//-- 次のページへ移動し、検索を再実行する
function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchOrders()
  }
}

//-- API・ネットワークエラーを日本語メッセージに変換する
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

//-- 画面上の日付（Y/m/d）を API 用の YYYY-MM-DD 形式に変換
function toApiDate(val: string): string {
  if (!val?.trim()) return ""
  return val.trim().replace(/\//g, "-")
}

//-- 検索条件で注文一覧 API を呼び出し、結果を orderItems に反映。日付は Flatpickr の DOM から取得
async function fetchOrders() {
  isLoading.value = true
  apiError.value = ""
  try {
    //-- 日付系は Flatpickr が DOM に値を保持するため、getElementById で取得
    const inputFrom = document.getElementById(FORM_IDS.search.createdDateFrom) as HTMLInputElement
    const inputTo = document.getElementById(FORM_IDS.search.createdDateTo) as HTMLInputElement
    const inputDeadline = document.getElementById(FORM_IDS.search.deadline) as HTMLInputElement
    const inputProofreading = document.getElementById(FORM_IDS.search.proofreading) as HTMLInputElement
    const createdDateFrom = inputFrom?.value ? toApiDate(inputFrom.value) : ""
    const createdDateTo = inputTo?.value ? toApiDate(inputTo.value) : ""
    const deadlineDt = inputDeadline?.value ? toApiDate(inputDeadline.value) : ""
    const proofreadingDt = inputProofreading?.value ? toApiDate(inputProofreading.value) : ""

    //-- searchOrders API 呼び出し
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
    //-- 成功時：結果を反映。0件のときは該当データなしダイアログを表示
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

//-- 登録日の開始日が終了日より後でないかチェック。不正時は showDateRangeErrorDialog を表示
function isDateRangeInvalid(): boolean {
  const inputFrom = document.getElementById(FORM_IDS.search.createdDateFrom) as HTMLInputElement
  const inputTo = document.getElementById(FORM_IDS.search.createdDateTo) as HTMLInputElement
  const fromVal = inputFrom?.value?.trim() ?? ""
  const toVal = inputTo?.value?.trim() ?? ""
  if (!fromVal || !toVal) return false
  const fromNorm = fromVal.replace(/\//g, "-")
  const toNorm = toVal.replace(/\//g, "-")
  return fromNorm > toNorm
}

const searchBtnRef = ref<HTMLButtonElement | null>(null)

//-- 検索ボタン押下時。日付範囲チェックののち検索を実行する
function performSearch() {
  if (isLoading.value) return
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

//-- 検索完了時に検索ボタンのフォーカスを外し、色を元に戻す
watch(isLoading, (loading, prev) => {
  if (prev === true && loading === false) {
    nextTick(() => searchBtnRef.value?.blur())
  }
})

//-- 戻るボタン押下。履歴を1つ戻す
function goBack() {
  router.back()
}

//-- APIエラーダイアログを閉じ、エラーメッセージをクリアする
function closeApiErrorDialog() {
  showApiErrorDialog.value = false
  apiError.value = ""
}

//-- 日付範囲エラーダイアログを閉じ、終了日入力欄にフォーカスする
function closeDateRangeErrorDialog() {
  showDateRangeErrorDialog.value = false
  nextTick(() => {
    const inputTo = document.getElementById(FORM_IDS.search.createdDateTo) as HTMLInputElement
    inputTo?.focus()
  })
}

//-- 注文（新規・変更）画面へのルートパラメータ。orderNo をクエリで渡し、変更モードで表示
function orderMainParams(order: OrderItem) {
  return { path: "/order/main", query: { orderNo: order.orderNo } }
}

//-- 看板編集画面へのルートパラメータ。orderNo・itemCode（枝番）・mode=edit をクエリで渡す
function orderDetailParams(order: OrderItem, branch: string) {
  return { path: "/order/detail", query: { orderNo: order.orderNo, itemCode: branch, mode: "edit" } }
}

//-------------------------------------------------------------------------------
//-- 注文詳細モーダル
//-------------------------------------------------------------------------------

const orderDetailModalOpen = ref(false)
const orderDetailSelected = ref<OrderItem | null>(null)

//-- 一覧行のダブルクリックで注文詳細モーダルを開く
function openOrderView(order: OrderItem) {
  orderDetailSelected.value = order
  orderDetailModalOpen.value = true
}

watch(orderDetailModalOpen, (open) => {
  if (!open) orderDetailSelected.value = null
})

//-- デザイン種別の表示用。空の場合は — を返す
function designTypeLabel(value: string): string {
  return value || "—"
}

//-------------------------------------------------------------------------------
//-- Flatpickr（日付ピッカー）
//-------------------------------------------------------------------------------

let fpFrom: flatpickr.Instance | null = null
let fpTo: flatpickr.Instance | null = null
let fpDeadline: flatpickr.Instance | null = null
let fpProofreading: flatpickr.Instance | null = null

//-- 日付ピッカー（登録日・納期・校正予定日）を初期化。詳細検索展開時に呼ぶ
function initDatePickers() {
  if (fpFrom && fpTo) return  //-- 既に初期化済み
  const opts = { locale: Japanese, dateFormat: "Y/m/d", allowInput: false }
  const inputFrom = document.getElementById(FORM_IDS.search.createdDateFrom) as HTMLInputElement
  const inputTo = document.getElementById(FORM_IDS.search.createdDateTo) as HTMLInputElement
  const inputDeadline = document.getElementById(FORM_IDS.search.deadline) as HTMLInputElement
  const inputProofreading = document.getElementById(FORM_IDS.search.proofreading) as HTMLInputElement
  if (inputFrom && inputTo) {
    fpFrom = flatpickr(inputFrom, opts)
    fpTo = flatpickr(inputTo, opts)
  }
  if (inputDeadline && !fpDeadline) fpDeadline = flatpickr(inputDeadline, opts)
  if (inputProofreading && !fpProofreading) fpProofreading = flatpickr(inputProofreading, opts)
}

//-------------------------------------------------------------------------------
//-- 顧客選択モーダル・注文番号選択モーダル
//-------------------------------------------------------------------------------

const customerListForSelect = ref<CustomerItem[]>([])
const customerSelectModalOpen = ref(false)
const isLoadingCustomers = ref(false)

const {
  orderListForSelect,
  isLoadingOrders,
  fetchErrorMessage,
  modalOpen: orderNoSelectModalOpen,
  openOrderNoSelectModal,
} = useOrderNoSelectModal(getLoginCompanyId)

//-- 顧客選択モーダルを開く。未取得の場合はAPIで顧客一覧を取得する
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

//-- 顧客選択モーダルで選択した顧客を検索条件（顧客ID・顧客名）に反映する（担当者名は反映しない）
function selectCustomer(c: CustomerItem) {
  searchCustomerId.value = c.customerId
  searchCustomerName.value = c.customerName
}

//-- 顧客選択をクリアし、検索条件の顧客ID・顧客名を空にする
function clearCustomer() {
  searchCustomerId.value = null
  searchCustomerName.value = ""
}

//-- 注文番号選択モーダルで選択した注文番号を検索条件に反映する
function selectOrderNo(order: OrderItem) {
  searchOrderNo.value = order.orderNo ?? ""
}

onMounted(async () => {
  try {
    designTypeOptions.value = await fetchDesignTypes(getLoginCompanyId())
  } catch {
    designTypeOptions.value = []
  }

  //-- order/main から遷移時: パラメータの注文番号を検索条件に設定し、初期検索を実施
  const orderNoFromQuery = (route.query.orderNo as string)?.trim()
  if (orderNoFromQuery) {
    searchOrderNo.value = orderNoFromQuery
    detailSearchExpanded.value = true
    hasSearched.value = true
    currentPage.value = 1
    await fetchOrders()
  }

  await nextTick()
  if (detailSearchExpanded.value) initDatePickers()
})

//-- 詳細検索を展開したときに日付ピッカーを初期化。DOM が描画された後に nextTick で initDatePickers
watch(detailSearchExpanded, (expanded) => {
  if (expanded) nextTick(() => initDatePickers())
})

onUnmounted(() => {
  fpFrom?.destroy()
  fpTo?.destroy()
  fpDeadline?.destroy()
  fpProofreading?.destroy()
})

</script>

<template>
  <!--
    注文一覧画面。検索条件カード → 結果テーブル → ページネーション。
    行ダブルクリックで OrderDetailModal、枝番クリックで OrderDetail へ遷移。
  -->
  <main id="order-list-page" class="order-list-page">
    <div class="order-list-page-container">
      <!-- === 検索条件カード === -->
      <div class="order-list-search-card card-header-full">
        <div class="page-card-header order-list-search-card-header">
          <h2>注文一覧</h2>
        </div>
        <div class="order-list-search-card-body">
          <!-- -- 主検索（常時表示） -- -->
          <div class="order-list-search-form">
            <div class="order-list-search-row">
              <div class="order-list-search-field">
                <label class="form-label" :for="FORM_IDS.search.customer">顧客</label>
                <div class="order-list-field-row">
                  <input
                    :id="FORM_IDS.search.customer"
                    v-model="searchCustomerName"
                    type="text"
                    readonly
                    placeholder="顧客を選択してください"
                    class="form-input form-input--readonly"
                  />
                  <button
                    type="button"
                    title="選択"
                    class="btn-icon btn-icon--select"
                    @click="openCustomerSelectModal"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="order-list-search-field order-list-search-field--narrow">
                <label class="form-label" :for="FORM_IDS.search.manager">担当者名</label>
                <input
                  :id="FORM_IDS.search.manager"
                  v-model="searchManager"
                  type="text"
                  class="form-input"
                  placeholder="担当者名を入力してください"
                />
              </div>
              <div class="order-list-search-field">
                <label class="form-label" :for="FORM_IDS.search.orderName">注文名</label>
                <input
                  :id="FORM_IDS.search.orderName"
                  v-model="searchOrderName"
                  type="text"
                  class="form-input"
                  placeholder="注文名を入力してください"
                />
              </div>
              <div class="order-list-search-field order-list-search-field--design">
                <label class="form-label" :for="FORM_IDS.search.designType">デザイン種別</label>
                <select
                  :id="FORM_IDS.search.designType"
                  v-model="searchDesignTypeId"
                  class="form-select"
                  :class="{ 'form-select--placeholder': !searchDesignTypeId }"
                >
                  <option value="">デザイン種別を選択してください</option>
                  <option
                    v-for="opt in designTypeOptions"
                    :key="opt.designTypeId"
                    :value="String(opt.designTypeId)"
                  >
                    {{ opt.designTypeName }}
                  </option>
                </select>
              </div>
              <div class="order-list-search-field order-list-search-field--hidden-label">
                <label class="form-label">検索</label>
                <button
                  ref="searchBtnRef"
                  type="button"
                  title="検索"
                  class="btn-icon btn-icon--search"
                  :class="{ 'order-list-search-btn--disabled': isLoading }"
                  @click="performSearch"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- 詳細検索。v-show で展開時のみ表示。展開時に initDatePickers で Flatpickr 初期化 -->
            <div class="order-list-detail-toggle">
              <button
                type="button"
                class="detail-toggle-btn"
                :aria-expanded="detailSearchExpanded"
                @click="detailSearchExpanded = !detailSearchExpanded"
              >
                <span class="detail-toggle-btn-icon" :class="{ 'detail-toggle-btn-icon--expanded': detailSearchExpanded }">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
                <span>詳細</span>
              </button>
              <div v-show="detailSearchExpanded" class="order-list-search-detail">
                <!-- 注文番号・住所・登録日・ステータス（同一行） -->
                <div class="order-list-search-detail-row order-list-search-detail-row--single">
                  <div class="order-list-search-field order-list-search-field--order-no">
                    <label class="form-label" :for="FORM_IDS.search.orderNo">注文番号</label>
                    <div class="order-list-field-row">
                      <input
                        :id="FORM_IDS.search.orderNo"
                        v-model="searchOrderNo"
                        type="text"
                        class="form-input order-list-input--order-no"
                        placeholder="注文番号を入力してください"
                      />
                      <button
                        type="button"
                        title="選択"
                        class="btn-icon btn-icon--select"
                        @click="openOrderNoSelectModal"
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div class="order-list-search-field order-list-search-field--address">
                    <label class="form-label" :for="FORM_IDS.search.address">住所</label>
                    <input
                      :id="FORM_IDS.search.address"
                      v-model="searchAddress"
                      type="text"
                      class="form-input"
                      placeholder="住所を入力してください"
                    />
                  </div>
                  <div class="order-list-search-field order-list-search-field--date order-list-search-field--date-range">
                    <label class="form-label" :for="FORM_IDS.search.createdDateFrom">登録日</label>
                    <div class="order-list-date-range">
                      <input
                        type="text"
                        :id="FORM_IDS.search.createdDateFrom"
                        readonly
                        placeholder="開始日を選択してください"
                        class="form-input order-list-date-input"
                      />
                      <span class="order-list-date-separator">～</span>
                      <input
                        type="text"
                        :id="FORM_IDS.search.createdDateTo"
                        readonly
                        placeholder="終了日を選択してください"
                        class="form-input order-list-date-input"
                      />
                    </div>
                  </div>
                  <div class="order-list-search-field order-list-search-field--status">
                    <label class="form-label" :for="FORM_IDS.search.status">ステータス</label>
                    <select
                      :id="FORM_IDS.search.status"
                      v-model="searchStatus"
                      class="form-select"
                      :class="{ 'form-select--placeholder': !searchStatus }"
                    >
                      <option value="">ステータスを選択してください</option>
                      <option v-for="opt in STATUS_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                  </div>
                </div>
                <!-- 制作区分・納期・校正予定日・備考（同一行） -->
                <div class="order-list-search-detail-row">
                  <div class="order-list-search-field order-list-search-field--production">
                    <label class="form-label" :for="FORM_IDS.search.productionType">制作区分</label>
                    <select
                      :id="FORM_IDS.search.productionType"
                      v-model="searchProductionType"
                      class="form-select"
                      :class="{ 'form-select--placeholder': !searchProductionType }"
                    >
                      <option value="">制作区分を選択してください</option>
                      <option v-for="opt in PRODUCTION_TYPE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                  </div>
                  <div class="order-list-search-field order-list-search-field--date">
                    <label class="form-label" :for="FORM_IDS.search.deadline">納期</label>
                    <input
                      type="text"
                      :id="FORM_IDS.search.deadline"
                      readonly
                      placeholder="納期を選択してください"
                      class="form-input order-list-date-input"
                    />
                  </div>
                  <div class="order-list-search-field order-list-search-field--date">
                    <label class="form-label" :for="FORM_IDS.search.proofreading">校正予定日</label>
                    <input
                      type="text"
                      :id="FORM_IDS.search.proofreading"
                      readonly
                      placeholder="校正予定日を選択してください"
                      class="form-input order-list-date-input"
                    />
                  </div>
                  <div class="order-list-search-field">
                    <label class="form-label" :for="FORM_IDS.search.note">備考</label>
                    <input
                      :id="FORM_IDS.search.note"
                      v-model="searchNote"
                      type="text"
                      class="form-input"
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
        :error-message="fetchErrorMessage"
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
        class="form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="noDataDialogMessage"
      >
        <div class="form-dialog-overlay" @click="showNoDataDialog = false"></div>
        <div class="form-dialog-content form-dialog-content--narrow">
          <div class="form-dialog-body" style="text-align: center">
            <p id="noDataDialogMessage">該当データがありません</p>
          </div>
          <div class="form-dialog-footer form-dialog-footer--center">
            <button type="button" class="btn btn-primary" @click="showNoDataDialog = false">OK</button>
          </div>
        </div>
      </div>

      <!-- APIエラーダイアログ -->
      <div
        v-show="showApiErrorDialog"
        class="form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apiErrorDialogMessage"
      >
        <div class="form-dialog-overlay" @click="closeApiErrorDialog"></div>
        <div class="form-dialog-content form-dialog-content--narrow">
          <div class="form-dialog-body" style="text-align: center">
            <p id="apiErrorDialogMessage">{{ apiError }}</p>
          </div>
          <div class="form-dialog-footer form-dialog-footer--center">
            <button type="button" class="btn btn-primary" @click="closeApiErrorDialog">OK</button>
          </div>
        </div>
      </div>

      <!-- 日付範囲エラーダイアログ（開始＞終了） -->
      <div
        v-show="showDateRangeErrorDialog"
        class="form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dateRangeErrorDialogMessage"
      >
        <div class="form-dialog-overlay" @click="closeDateRangeErrorDialog"></div>
        <div class="form-dialog-content form-dialog-content--narrow">
          <div class="form-dialog-body" style="text-align: center">
            <p id="dateRangeErrorDialogMessage">
              登録日の開始日が終了日より後になっています。<br />終了日を確認してください。
            </p>
          </div>
          <div class="form-dialog-footer form-dialog-footer--center">
            <button type="button" class="btn btn-primary" @click="closeDateRangeErrorDialog">OK</button>
          </div>
        </div>
      </div>

      <!-- 読み込み中表示 -->
      <div v-show="hasSearched && isLoading" class="order-list-loading">読み込み中...</div>

      <!-- === 検索結果一覧（05f007f準拠: 該当件数は白カード外、結果テーブルは別の白カード） === -->
      <div v-show="hasSearched && !isLoading && orderItems.length > 0">
        <!-- -- インフォメーション＋該当件数（同一ブロック。前者は左寄せ、後者は右寄せ） -- -->
        <div class="order-list-result-header">
          <span class="order-list-info-tip" role="status" aria-live="polite">
            <span class="order-list-info-tip-icon" aria-hidden="true">ⓘ</span>
            対象行をダブルクリックすると、注文詳細画面が表示されます
          </span>
          <span class="order-list-count-badge">
            <span class="order-list-count-label">該当</span>
            <span class="order-list-count-value">{{ totalCount }}</span>
            <span class="order-list-count-label">件</span>
          </span>
        </div>

        <!-- -- 結果テーブル（別の白カードで囲む） -- -->
        <div class="order-list-result-card">
          <div class="order-list-result-card-inner">
            <table class="order-list-table">
              <colgroup>
                <col id="col-order-no" />
                <col id="col-name" />
                <col id="col-customer" />
                <col id="col-design" />
                <col id="col-date" />
                <col id="col-action" />
              </colgroup>
              <thead>
                <tr class="order-list-table-header data-table-header">
                  <th>
                    <span class="order-list-table-header-sort">
                      注文番号
                      <button
                        type="button"
                        class="sort-btn"
                        :title="getSortOrder('orderNo') === 'asc' ? '降順へ切り替え' : '昇順へ切り替え'"
                        @click="toggleSortOrder('orderNo')"
                      >{{ getSortOrder('orderNo') === 'asc' ? '↓' : '↑' }}                      </button>
                    </span>
                  </th>
                  <th>
                    <span class="header-2line">注文名<br />住所</span>
                  </th>
                  <th>
                    <span class="header-2line">顧客名<br />担当者</span>
                  </th>
                  <th class="col-design">
                    <span class="header-2line">デザイン種別<br />テンプレート</span>
                  </th>
                  <th class="col-date">
                    <span class="order-list-table-header-sort">
                      <span class="header-2line">登録日<br />登録者</span>
                      <button
                        type="button"
                        class="sort-btn"
                        :title="getSortOrder('createdDate') === 'asc' ? '降順へ切り替え' : '昇順へ切り替え'"
                        @click="toggleSortOrder('createdDate')"
                      >{{ getSortOrder('createdDate') === 'asc' ? '↓' : '↑' }}                      </button>
                    </span>
                  </th>
                  <th class="col-action">枝番</th>
                </tr>
              </thead>
              <!-- 行ダブルクリックで openOrderView → OrderDetailModal。注文番号は OrderMain、枝番は OrderDetail への RouterLink -->
              <tbody>
                <tr
                  v-for="order in orderItems"
                  :key="order.orderNo"
                  class="order-list-table-row"
                  @dblclick="openOrderView(order)"
                >
                  <td>
                    <RouterLink
                      :to="orderMainParams(order)"
                      class="order-main-link order-list-cell-order-no"
                    >
                      {{ order.orderNo }}
                    </RouterLink>
                  </td>
                  <td>
                    <div class="order-list-cell-primary">{{ order.orderName }}</div>
                    <div class="order-list-cell-secondary">{{ order.address }}</div>
                  </td>
                  <td>
                    <div class="order-list-cell-primary">{{ order.customerName || "—" }}</div>
                    <div class="order-list-cell-secondary">{{ order.manager?.trim() || "—" }}</div>
                  </td>
                  <td class="col-design">
                    <div class="order-list-cell-primary">{{ designTypeLabel(order.designType) }}</div>
                    <div class="order-list-cell-secondary">{{ order.template }}</div>
                  </td>
                  <td class="col-date">
                    <div class="order-list-cell-date">{{ order.createdDate }}</div>
                    <div class="order-list-cell-secondary">{{ order.creator }}</div>
                  </td>
                  <td class="col-action">
                    <span class="order-branch-links">
                      <RouterLink
                        v-for="branch in order.branches"
                        :key="branch"
                        :to="orderDetailParams(order, branch)"
                        class="order-list-branch-link"
                      >
                        {{ branch }}
                      </RouterLink>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ページネーション（05f007f準拠） -->
          <div class="order-list-pagination">
            <nav class="order-list-pagination-nav">
              <div class="order-list-pagination-spacer"></div>
              <div class="order-list-pagination-buttons">
                <button
                  type="button"
                  class="order-list-pagination-btn"
                  :disabled="currentPage <= 1"
                  @click="prevPage"
                >
                  ＜
                </button>
                <div class="order-list-pagination-pages">
                  <button
                    v-for="p in visiblePageNumbers"
                    :key="p"
                    type="button"
                    class="order-list-pagination-page"
                    :class="p === currentPage ? 'order-list-pagination-page--current' : 'order-list-pagination-page--other'"
                    :disabled="p === currentPage"
                    @click="goToPage(p)"
                  >
                    {{ p }}
                  </button>
                </div>
                <button
                  type="button"
                  class="order-list-pagination-btn"
                  :disabled="currentPage >= totalPages"
                  @click="nextPage"
                >
                  ＞
                </button>
              </div>
              <div class="order-list-pagination-spacer order-list-pagination-spacer--right">
                <span class="order-list-pagination-info-badge">
                  <span>{{ currentPage }}</span>
                  <span class="order-list-pagination-separator">/</span>
                  <span>{{ totalPages }}</span>
                </span>
              </div>
            </nav>
          </div>
        </div>
      </div>

      <!-- -- 戻るボタン（05f007f準拠） -- -->
      <div class="order-list-back-area">
        <button type="button" class="btn-back" @click="goBack">戻る</button>
      </div>
    </div>
  </main>
</template>
