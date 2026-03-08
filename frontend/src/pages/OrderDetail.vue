<script setup lang="ts">
//-- OrderDetail - 看板編集画面
//--
//-- 【用途】
//-- ・地図上でルート・テキスト・画像・吹き出し等を配置・編集
//-- ・枝番ごとにデザイン編集データ（design_data）を保持・更新
//--
//-- 【主な機能】
//-- ・注文番号で検索・選択（OrderList から遷移時は orderNo, itemCode をクエリで受け取る）
//-- ・枝番タブ: 追加・削除・切り替え。備考（note）を枝番ごとに保持
//-- ・全画面編集オーバーレイ: サイドバーで HTML オブジェクトを選択し、地図上に配置
//-- ・地図出力/読込: design_data を JSON 形式でエクスポート・インポート
//-- ・updateOrderDetails / updateOrderItems API で枝番・テンプレート項目を登録・更新
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue"
import { useRouter, useRoute } from "vue-router"
import "../assets/styles/order-detail.css"
import { searchOrders, getOrderByNo, updateOrderDetails, type OrderItem } from "../composables/useOrderApi"
import { FORM_IDS } from "../constants/form-ids"
import { useOrderNoSelectModal } from "../composables/useOrderNoSelectModal"
import { geocodeAddress } from "../composables/useAddressApi"
import { fetchHtmlObjects, type HtmlObjectItem, type HtmlObjectValueItem } from "../composables/useHtmlObjectApi"
import { getImageItemsFromHtmlObjects } from "../composables/useMapLayers"
import { installMapWarnSuppress, uninstallMapWarnSuppress } from "../composables/useMapWarnSuppress"
import { useMapFeatures } from "../composables/useMapFeatures"
import { useMapInteraction } from "../composables/useMapInteraction"
import { useMapHistory } from "../composables/useMapHistory"
import { useMapData } from "../composables/useMapData"
import type { FeatureCollection, LineString, Point } from "geojson"
import {
  ensureRoutesAsRouteItems,
  ensureRoutesAsFeatureCollection,
  type RouteItem,
  type RouteFeatureProperties,
} from "../types/map-data"
import type maplibregl from "maplibre-gl"
import OrderNoSelectModal from "../components/OrderNoSelectModal.vue"
import OrderDetailModal from "../components/OrderDetailModal.vue"
import MapPreview from "../components/MapPreview.vue"
import HtmlObjectValueSelectModal from "../components/HtmlObjectValueSelectModal.vue"

const router = useRouter()
const route = useRoute()

//-------------------------------------------------------------------------------
//-- 定数・ユーティリティ
//-------------------------------------------------------------------------------

//-- 枝番タブを横に並べて表示する最大個数（超えるとスライドで表示）
const MAX_BRANCH_DISPLAY = 10
//-- 1注文あたりの枝番の上限数
const MAX_BRANCH_COUNT = 99

//-- ログイン会社IDを返す。VITE_LOGIN_COMPANY_ID がなければ 1。将来は認証ストアから取得
function getLoginCompanyId(): number {
  const v = import.meta.env.VITE_LOGIN_COMPANY_ID as string | undefined
  if (v != null && v !== "") {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return 1
}

//-- 枝番を2桁ゼロ埋めの文字列に正規化する（例: "1" → "01"）
function normalizeBranchNo(val: string): string {
  const s = (val ?? "").trim()
  if (!s) return ""
  return String(parseInt(s, 10) || s).padStart(2, "0")
}

//-- デザイン種別の表示用。空の場合は — を返す
function designTypeLabel(designType: string): string {
  return designType || "—"
}

//-- 空白時は em dash で表示（注文詳細モーダルと合わせる）
function orDash(val: string | undefined): string {
  return (val ?? "").trim() || "—"
}

//-- 詳細エリアのフィールド表示: 初期表示・クリア時は空白、データ取得済みで null の場合は —
function fieldDisplay(val: string | undefined): string {
  if (!hasSearched.value) return ""
  const s = (val ?? "").trim()
  return s || "—"
}

//-------------------------------------------------------------------------------
//-- ルートクエリ（一覧から遷移時: orderNo, itemCode, mode=edit）
//-------------------------------------------------------------------------------

//-- 注文一覧から「看板編集」で遷移してきた場合 true（注文番号を編集不可にする等）
const cameFromList = computed(() => route.query.mode === "edit" && !!route.query.orderNo)
//-- URL の orderNo クエリ。一覧から遷移時はここから初期検索する
const initialOrderNo = computed(() => (route.query.orderNo as string) ?? "")
//-- URL の itemCode（枝番）。一覧から遷移時はこの枝番を初期表示する
const initialItemCode = computed(() => (route.query.itemCode as string) ?? "")

//-------------------------------------------------------------------------------
//-- 注文情報エリアの開閉
//-------------------------------------------------------------------------------

const orderInfoExpanded = ref(true)

//-- 注文情報エリアの開閉をトグルする
function toggleOrderInfo() {
  orderInfoExpanded.value = !orderInfoExpanded.value
}

//-------------------------------------------------------------------------------
//-- 注文番号・検索済み・表示用データ
//-------------------------------------------------------------------------------

const inputOrderNo = ref("")
const orderNoInputRef = ref<HTMLInputElement | null>(null)
const branchNoInputRef = ref<HTMLInputElement | null>(null)
const hasSearched = ref(false)
//-- 最後に検索でヒットした注文番号（注文番号リセット確認や切り替え時の基準）
const lastConfirmedOrderNo = ref("")
//-- 注文情報エリアに表示する項目（注文名・住所・顧客名・担当者・テンプレート等）
const orderDisplay = ref<{
  orderName: string
  address: string
  customerName: string
  manager: string
  template: string
  designType: string
  updateDate: string
  updater: string
}>({
  orderName: "",
  address: "",
  customerName: "",
  manager: "",
  template: "",
  designType: "",
  updateDate: "",
  updater: "",
})

//-- 注文番号は一覧から来た場合は読取専用
const orderNoReadOnly = computed(() => cameFromList.value)
const selectSearchDisabled = computed(() => cameFromList.value)

//-------------------------------------------------------------------------------
//-- 枝番（タブ・スライド・備考・未保存変更判定）
//-------------------------------------------------------------------------------

//-- この注文に紐づく枝番一覧（2桁ゼロ埋めで保持）
const allBranches = ref<string[]>([])
//-- 枝番タブのスライドで、表示開始位置のインデックス
const visibleStartIndex = ref(0)
const activeBranch = ref("")
//-- 未保存変更判定用。現在表示中の枝番の「元の値」
const originalBranchNo = ref("")
const branchMemo = ref("")
//-- 未保存変更判定用。現在表示中の備考の「元の値」
const originalBranchMemo = ref("")
//-- 枝番追加モーダルで直前に追加した枝番（確認モーダルで「破棄して追加」したときに削除する対象）
const lastAddedBranchNo = ref<string | null>(null)
//-- 枝番ごとの備考を保持。枝番切り替え時に復元する
const branchMemoByBranch = ref<Record<string, string>>({})

//-- 現在スライド範囲で表示している枝番の配列
const visibleBranches = computed(() =>
  allBranches.value.slice(visibleStartIndex.value, visibleStartIndex.value + MAX_BRANCH_DISPLAY)
)

const hasBranches = computed(() => allBranches.value.length > 0)
const canSlidePrev = computed(() => visibleStartIndex.value > 0)
const canSlideNext = computed(
  () =>
    allBranches.value.length > MAX_BRANCH_DISPLAY &&
    visibleStartIndex.value < allBranches.value.length - MAX_BRANCH_DISPLAY
)

//-- 注文番号・枝番・備考のいずれかが「元の値」から変更されているか。戻る・枝番切り替え時の確認に使用
const isDirty = computed(() => {
  const curNo = normalizeBranchNo(activeBranch.value)
  const origNo = normalizeBranchNo(originalBranchNo.value)
  return (
    (inputOrderNo.value || "").trim() !== lastConfirmedOrderNo.value ||
    curNo !== origNo ||
    branchMemo.value !== originalBranchMemo.value
  )
})

//-- 現在の枝番・備考を「元の値」として記録し、未保存変更判定に使う
function setOriginalBranchValues(no: string, memo: string) {
  originalBranchNo.value = no
  originalBranchMemo.value = memo
}

//-- 指定した枝番がこの注文の枝番一覧に含まれるかどうかを返す
function branchExistsInOrder(branchNo: string): boolean {
  const n = normalizeBranchNo(branchNo)
  return allBranches.value.indexOf(n) >= 0
}

//-- 枝番タブの表示範囲をスライドし、指定枝番が visibleBranches 内に含まれるようにする
function ensureVisible(branchNo: string) {
  const n = normalizeBranchNo(branchNo)
  const idx = allBranches.value.indexOf(n)
  if (idx < 0) return
  const maxStart = Math.max(0, allBranches.value.length - MAX_BRANCH_DISPLAY)
  if (idx < visibleStartIndex.value) visibleStartIndex.value = Math.max(0, idx)
  else if (idx >= visibleStartIndex.value + MAX_BRANCH_DISPLAY)
    visibleStartIndex.value = Math.min(maxStart, idx - MAX_BRANCH_DISPLAY + 1)
}

//-------------------------------------------------------------------------------
//-- 注文一覧（選択モーダル用）
//-------------------------------------------------------------------------------

const {
  orderListForSelect,
  isLoadingOrders,
  fetchErrorMessage,
  modalOpen: showOrderNoSelectModal,
  openOrderNoSelectModal,
} = useOrderNoSelectModal(getLoginCompanyId)

//-- 注文番号で検索し、取得した注文の表示項目・枝番一覧を反映する。見つからない場合は該当なしモーダルを表示
//-- preferBranchNo: 取得後にこの枝番をカレント選択する（登録後の再取得時など）
async function applyOrderBySearch(orderNo: string, preferBranchNo?: string) {
  const no = orderNo.trim()
  if (!no) return
  //-- 1) searchOrders で一覧APIから取得（枝番・designDataByBranch・noteByBranch が取れる）
  try {
    const result = await searchOrders({
      companyId: getLoginCompanyId(),
      orderNo: no,
      page: 1,
      perPage: 1,
    })
    if (result.items.length > 0) {
      lastAddedBranchNo.value = null  //-- 検索で再取得した時点で「枝番追加」状態を解除
      const o = result.items[0]
      orderDisplay.value = {
        orderName: o.orderName ?? "",
        address: o.address ?? "",
        customerName: o.customerName ?? "",
        manager: o.manager ?? "",
        template: o.template ?? "",
        designType: designTypeLabel(o.designType),
        updateDate: o.createdDate ?? "",
        updater: o.creator ?? "",
      }
      lastConfirmedOrderNo.value = o.orderNo
      inputOrderNo.value = o.orderNo
      const branches = o.branches && o.branches.length > 0 ? [...o.branches] : []
      allBranches.value = branches
      visibleStartIndex.value = 0
      //-- 枝番ごとの design_data を mapDataByBranch に初期化（地図出力・読込・編集のベース）
      const ddb = o.designDataByBranch
      if (ddb && typeof ddb === "object") {
        const next: Record<string, MapDataJson> = {}
        for (const bn of branches) {
          next[bn] = normalizeDesignDataToMapData(ddb[bn], bn, o.orderNo)
        }
        mapDataByBranch.value = next
      } else {
        mapDataByBranch.value = {}
      }
      //-- 枝番ごとの備考を branchMemoByBranch に初期化
      const nbb = o.noteByBranch
      if (nbb && typeof nbb === "object") {
        branchMemoByBranch.value = { ...nbb }
      } else {
        branchMemoByBranch.value = {}
      }
      //-- 枝番あり：初期表示する枝番を決定（preferBranchNo > URL の itemCode > 先頭）
      if (branches.length > 0) {
        const prefer = preferBranchNo ? normalizeBranchNo(preferBranchNo) : ""
        let initial =
          prefer && branches.indexOf(prefer) >= 0
            ? prefer
            : initialItemCode.value
              ? normalizeBranchNo(initialItemCode.value)
              : branches[0]
        if (branches.indexOf(initial) < 0) initial = branches[0]
        activeBranch.value = initial
        ensureVisible(initial)
        branchMemo.value = branchMemoByBranch.value[initial] ?? ""
        setOriginalBranchValues(initial, branchMemo.value)
      } else {
        activeBranch.value = ""
        branchMemo.value = ""
        setOriginalBranchValues("", "")
      }
      hasSearched.value = true
      //-- 枝番がある場合：注文住所を中心に地図を取得
      if (branches.length > 0) fetchMapCenter()
      return
    }
  } catch {
    //-- ignore
  }
  //-- 2) 一覧に無ければ getOrderByNo で詳細APIから取得（枝番は空。新規注文等）
  try {
    lastAddedBranchNo.value = null
    const detail = await getOrderByNo(no)
    orderDisplay.value = {
      orderName: detail.orderName ?? "",
      address: detail.address ?? "",
      customerName: detail.customerName ?? "",
      manager: detail.manager ?? "",
      template: detail.templateName ?? "",
      designType: designTypeLabel(detail.designTypeName),
      updateDate: detail.deadlineDt ?? "",
      updater: "",
    }
    lastConfirmedOrderNo.value = detail.orderNo
    inputOrderNo.value = detail.orderNo
    allBranches.value = []
    visibleStartIndex.value = 0
    activeBranch.value = ""
    branchMemo.value = ""
    mapDataByBranch.value = {}
    setOriginalBranchValues("", "")
    hasSearched.value = true
  } catch {
    //-- 3) getOrderByNo も失敗（404等）：該当なしモーダル表示。入力値は注文番号のみ残し、hasSearched は false
    lastAddedBranchNo.value = null
    orderDisplay.value = {
      orderName: "",
      address: "",
      customerName: "",
      manager: "",
      template: "",
      designType: "",
      updateDate: "",
      updater: "",
    }
    lastConfirmedOrderNo.value = ""
    inputOrderNo.value = no
    allBranches.value = []
    activeBranch.value = ""
    branchMemo.value = ""
    mapDataByBranch.value = {}
    setOriginalBranchValues("", "")
    hasSearched.value = false
    showOrderSearchNoResultModal.value = true
  }
}

//-- 注文検索「該当なし」モーダルを閉じる
function closeOrderSearchNoResultModal() {
  showOrderSearchNoResultModal.value = false
}

//-- 現在の注文の詳細を取得し、注文詳細モーダルを開く
async function openOrderDetailModal() {
  const no = lastConfirmedOrderNo.value?.trim()
  if (!no || !hasSearched.value) return
  try {
    const result = await searchOrders({
      companyId: getLoginCompanyId(),
      orderNo: no,
      page: 1,
      perPage: 1,
    })
    if (result.items.length > 0) {
      orderDetailForModal.value = result.items[0]
      orderDetailModalOpen.value = true
    }
  } catch {
    orderDetailForModal.value = null
  }
}

//-- 注文番号以外の表示項目・枝番・備考をクリアする（一覧から来た場合以外は検索済みフラグもリセット）
function clearOrderInfoExceptOrderNo() {
  orderDisplay.value = {
    orderName: "",
    address: "",
    customerName: "",
    manager: "",
    template: "",
    designType: "",
    updateDate: "",
    updater: "",
  }
  if (!cameFromList.value) hasSearched.value = false
  allBranches.value = []
  activeBranch.value = ""
  branchMemo.value = ""
  mapDataByBranch.value = {}
  setOriginalBranchValues("", "")
}

//-- 枝番を切り替え、備考を枝番ごとのキャッシュに保存してから新しい枝番の備考を表示する
function performBranchSwitch(branchNo: string) {
  branchMemoByBranch.value[activeBranch.value] = branchMemo.value
  const next = normalizeBranchNo(branchNo)
  activeBranch.value = next
  branchMemo.value = branchMemoByBranch.value[next] ?? ""
  setOriginalBranchValues(next, branchMemo.value)
}

//-- 枝番タブクリック時。未保存変更があれば確認モーダルを出し、OK で枝番を切り替える
function switchToBranch(branchNo: string) {
  const target = normalizeBranchNo(branchNo)
  if (normalizeBranchNo(activeBranch.value) === target) return
  if (isDirty.value) {
    pendingAction.value = { type: "branch", branchNo: target }
    openBranchSwitchConfirmModal()
    return
  }
  performBranchSwitch(target)
}

//-- 枝番タブの表示範囲を左に1つスライドする
function slidePrevBranch() {
  if (visibleStartIndex.value <= 0) return
  visibleStartIndex.value = Math.max(0, visibleStartIndex.value - 1)
}

//-- 枝番タブの表示範囲を右に1つスライドする
function slideNextBranch() {
  if (allBranches.value.length <= MAX_BRANCH_DISPLAY) return
  const maxStart = allBranches.value.length - MAX_BRANCH_DISPLAY
  if (visibleStartIndex.value >= maxStart) return
  visibleStartIndex.value = Math.min(maxStart, visibleStartIndex.value + 1)
}

//-- 枝番入力欄の値から、既存枝番へ切り替えまたは新規枝番追加を行う。未保存変更があれば確認モーダルを表示
function applyActiveBranchDisplayValue() {
  const value = (activeBranch.value ?? "").trim()
  if (!value) return
  const branchNo = normalizeBranchNo(value)
  const currentBranch = normalizeBranchNo(originalBranchNo.value)
  if (branchNo === currentBranch) return
  if (branchExistsInOrder(branchNo)) {
    ensureVisible(branchNo)
    switchToBranch(branchNo)
    return
  }
  if (isDirty.value) {
    pendingAction.value = { type: "applyBranchInput", branchNo }
    openBranchSwitchConfirmModal()
    return
  }
  doApplyActiveBranchDisplayValue(branchNo, false)
}

//-- 枝番の切り替えのみ行う、または新規枝番を追加してその枝番に切り替える（switchOnly: true のときは切り替えのみ）
function doApplyActiveBranchDisplayValue(branchNo: string, switchOnly: boolean) {
  if (switchOnly) {
    ensureVisible(branchNo)
    performBranchSwitch(branchNo)
    return
  }
  if (allBranches.value.length >= MAX_BRANCH_COUNT) return
  if (allBranches.value.indexOf(branchNo) >= 0) return
  allBranches.value = [...allBranches.value, branchNo].sort()
  ensureVisible(branchNo)
  activeBranch.value = branchNo
  branchMemo.value = branchMemoByBranch.value[branchNo] ?? ""
  setOriginalBranchValues(branchNo, branchMemo.value)
  lastAddedBranchNo.value = branchNo
}

//-- モーダル: 検索バリデーション・登録確認・登録結果・注文選択・枝番追加・枝番切り替え確認・枝番存在・枝番削除・注文詳細
const showOrderSearchValidationModal = ref(false)
const orderDetailModalOpen = ref(false)
const orderDetailForModal = ref<OrderItem | null>(null)
const showRegisterConfirmModal = ref(false)
const showRegisterResultModal = ref(false)
const registerResultMessage = ref("")
const showBranchAddModal = ref(false)
const branchAddInput = ref("")
const showBranchSwitchConfirmModal = ref(false)
const branchSwitchConfirmMessage = ref("")
const branchSwitchConfirmDiscardLabel = ref("")
const branchSwitchConfirmRegisterLabel = ref("")
const hideBranchSwitchRegisterButton = ref(false)
const showBranchExistsModal = ref(false)
const showBranchDeleteModal = ref(false)
const branchDeleteTargetNo = ref("")
const showOrderNoResetConfirmModal = ref(false)
const showOrderSearchNoResultModal = ref(false)

//-- 枝番切り替え確認モーダルで保留するアクションの種類（枝番切替・注文変更・枝番追加・戻る・遷移など）
type PendingAction =
  | { type: "branch"; branchNo: string }
  | { type: "applyBranchInput"; branchNo: string }
  | { type: "changeOrderNo"; orderNo: string }
  | { type: "addBranch" }
  | { type: "navigate"; url: string; labels: { message: string; discard: string; register: string } }
  | { type: "back"; labels: { message: string; discard: string; register: string } }
//-- 枝番切り替え確認・戻る確認等で「登録/更新してから」を選んだあと、結果モーダルで OK を押したときに実行するアクション
const pendingAction = ref<PendingAction | null>(null)

//-- 一覧から来た場合、または検索済みで枝番がある場合は edit（登録ボタンラベル等に使用）
const pageMode = computed(() => (cameFromList.value || (hasSearched.value && hasBranches.value) ? "edit" : "register"))
const registerButtonLabel = computed(() => (pageMode.value === "edit" ? "更新" : "登録"))
//-- 一覧から来ていないかつ未検索、または検索済みだが枝番が0件のときは登録ボタンを無効にする
const registerButtonDisabled = computed(
  () => (!cameFromList.value && !hasSearched.value) || (hasSearched.value && !hasBranches.value)
)

//-- 注文番号未入力の検索バリデーションエラーモーダルを開く
function openOrderSearchValidationModal() {
  showOrderSearchValidationModal.value = true
}

//-- 登録/更新確認モーダルを開く
function openRegisterConfirmModal() {
  showRegisterConfirmModal.value = true
}

//-- 登録/更新結果モーダルを指定メッセージで開く
function openRegisterResultModal(message: string) {
  registerResultMessage.value = message
  showRegisterResultModal.value = true
}


//-- 枝番追加モーダルを開き、入力欄にフォーカスする
function openBranchAddModal() {
  branchAddInput.value = ""
  showBranchAddModal.value = true
  nextTick(() => branchNoInputRef.value?.focus())
}

//-- 枝番切り替え確認モーダルを開く。保留アクションに応じてメッセージ・ボタンラベルを変える
function openBranchSwitchConfirmModal(action?: PendingAction | null) {
  if (action) pendingAction.value = action
  const pa = pendingAction.value
  const verb = pageMode.value === "edit" ? "更新して" : "登録して"
  //-- デフォルトメッセージ
  let message = `変更が保存されていません。${verb}から枝番を切り替えますか`
  let discard = "破棄して切り替え"
  let register = `${verb}切り替え`
  hideBranchSwitchRegisterButton.value = false
  //-- 保留アクション種別ごとにメッセージ・ラベルを上書き
  if (pa?.type === "navigate" && pa.labels) {
    message = pa.labels.message
    discard = pa.labels.discard
    register = pa.labels.register
  } else if (pa?.type === "back" && pa.labels) {
    message = pa.labels.message
    discard = pa.labels.discard
    register = pa.labels.register
  } else if (pa?.type === "changeOrderNo") {
    message = "看板情報に変更があります。注文番号を変更しますか。変更は破棄されます"
    discard = "破棄して変更"
    register = `${verb}変更`
    hideBranchSwitchRegisterButton.value = true
  } else if (pa?.type === "addBranch") {
    message = `変更が保存されていません。枝番を追加しますか。変更は破棄されます`
    discard = "破棄して追加"
    register = `${verb}追加`
    hideBranchSwitchRegisterButton.value = true
  }
  branchSwitchConfirmMessage.value = message
  branchSwitchConfirmDiscardLabel.value = discard
  branchSwitchConfirmRegisterLabel.value = register
  showBranchSwitchConfirmModal.value = true
}

//-- 枝番が既に存在する旨のモーダルを開く
function openBranchExistsModal() {
  showBranchExistsModal.value = true
}

//-- 枝番削除確認モーダルを開く（削除対象の枝番を指定）
function openBranchDeleteModal(branchNo: string) {
  branchDeleteTargetNo.value = branchNo
  showBranchDeleteModal.value = true
}

//-- 検索バリデーションモーダルを閉じ、注文番号入力欄にフォーカスする
function closeOrderSearchValidationModal() {
  showOrderSearchValidationModal.value = false
  nextTick(() => orderNoInputRef.value?.focus())
}

//-- 登録確認モーダルを閉じる
function closeRegisterConfirmModal() {
  showRegisterConfirmModal.value = false
}

//-- 登録結果モーダルを閉じ、更新モードに切り替える
function closeRegisterResultModal() {
  showRegisterResultModal.value = false
  switchToUpdateMode()
}

//-- 検索済み状態にし、保留アクションをクリアする（登録結果モーダル閉じた後など）
function switchToUpdateMode() {
  hasSearched.value = true
  pendingAction.value = null
}

//-- 枝番追加モーダルを閉じ、入力値をクリアする
function closeBranchAddModal() {
  branchAddInput.value = ""
  showBranchAddModal.value = false
}

//-- 枝番切り替え確認モーダルを閉じる。clearPending が true のとき保留アクションもクリアする
function closeBranchSwitchConfirmModal(clearPending = true) {
  showBranchSwitchConfirmModal.value = false
  if (clearPending) pendingAction.value = null
}

//-- 枝番存在モーダルを閉じる
function closeBranchExistsModal() {
  showBranchExistsModal.value = false
}

//-- 枝番削除モーダルを閉じ、削除対象をクリアする
function closeBranchDeleteModal() {
  showBranchDeleteModal.value = false
  branchDeleteTargetNo.value = ""
}

//-- 注文番号を検索値に戻す確認モーダルを開く（誤編集と思われるとき）
function openOrderNoResetConfirmModal() {
  showOrderNoResetConfirmModal.value = true
}

//-- 注文番号リセット確認モーダルを閉じる
function closeOrderNoResetConfirmModal() {
  showOrderNoResetConfirmModal.value = false
}

//-- 注文番号を最後に検索した値に戻し、その注文を再取得して表示する
function confirmOrderNoReset() {
  const no = lastConfirmedOrderNo.value
  inputOrderNo.value = no
  closeOrderNoResetConfirmModal()
  if (no) applyOrderBySearch(no)
}

//-- 注文番号選択モーダルで選択した注文に切り替える。未保存変更があれば確認モーダルを表示
function selectOrderFromList(order: OrderItem) {
  if (order.orderNo === lastConfirmedOrderNo.value) return
  if (isDirty.value) {
    pendingAction.value = { type: "changeOrderNo", orderNo: order.orderNo }
    openBranchSwitchConfirmModal()
    return
  }
  inputOrderNo.value = order.orderNo
  lastConfirmedOrderNo.value = order.orderNo
  clearOrderInfoExceptOrderNo()
  applyOrderBySearch(order.orderNo)
}

//-- 検索ボタン押下。注文番号が空ならバリデーションモーダルを出し、なければ注文を取得して表示する
function confirmSearch() {
  const no = inputOrderNo.value.trim()
  if (!no) {
    openOrderSearchValidationModal()
    return
  }
  applyOrderBySearch(no)
}

//-- 登録/更新確認で OK を押したとき。order_detail を API で保存し、結果モーダルを表示する
async function confirmRegister() {
  closeRegisterConfirmModal()
  const orderNo = lastConfirmedOrderNo.value?.trim()
  if (!orderNo) {
    openRegisterResultModal("注文番号がありません")
    return
  }
  //-- 現在の枝番の備考を branchMemoByBranch に反映してから送信
  const bn = normalizeBranchNo(activeBranch.value)
  if (bn) branchMemoByBranch.value[bn] = branchMemo.value

  const branches = allBranches.value.map((b) => ({
    branchNo: b,
    note: (branchMemoByBranch.value[b] ?? "").trim() || undefined,
    designData: designDataForApi(mapDataByBranch.value[b]),
  }))

  try {
    await updateOrderDetails(orderNo, branches)
    //-- 登録後：order_detail を再取得し、処理した枝番をカレント選択にする
    const branchToSelect = normalizeBranchNo(activeBranch.value)
    await applyOrderBySearch(orderNo, branchToSelect)
    openRegisterResultModal(pageMode.value === "edit" ? "更新が完了しました" : "登録が完了しました")
  } catch (e) {
    openRegisterResultModal(e instanceof Error ? e.message : "登録に失敗しました")
  }
}

//-- 枝番追加モーダルで OK を押したとき。入力値を正規化し、新規追加または既存枝番へ切り替える
function confirmBranchAdd() {
  const value = branchAddInput.value.trim()
  if (!value) {
    closeBranchAddModal()
    return
  }
  const branchNo = normalizeBranchNo(value)
  const exists = branchExistsInOrder(branchNo)
  //-- 上限チェック（新規追加時のみ）
  if (!exists && allBranches.value.length >= MAX_BRANCH_COUNT) {
    closeBranchAddModal()
    return
  }
  if (!exists) {
    //-- 新規追加：枝番一覧に追加し、その枝番に切り替え
    allBranches.value = [...allBranches.value, branchNo].sort()
    //-- 全画面編集のルート・画像ドロップダウンを「選択してください」に初期化（新枝番は未選択状態）
    //-- 方式B: ROUTE_LINE_TYPE / ROUTE_LINE_COLOR / ROUTE_LINE_WIDTH も初期化
    htmlObjects.value.forEach((obj) => {
      if (
        obj.categoryCode === "ROUTE_DRAWING" ||
        obj.categoryCode === "IMAGE_PLACEMENT" ||
        ROUTE_LINE_CATEGORIES.includes(obj.categoryCode)
      ) {
        selectedValueIdByObjectId.value[obj.htmlObjectId] = SELECT_PLACEHOLDER_VALUE
      }
    })
    //-- mapDataByBranch を初期化（design_data 送信時に undefined にならないよう）
    if (!mapDataByBranch.value[branchNo]) {
      mapDataByBranch.value = {
        ...mapDataByBranch.value,
        [branchNo]: {
          version: 1,
          branchNo,
          orderNo: lastConfirmedOrderNo.value || undefined,
          routes: [],
          texts: [],
          images: [],
          callouts: [],
        },
      }
    }
    if (allBranches.value.length === 1) {
      activeBranch.value = branchNo
      branchMemo.value = ""
      setOriginalBranchValues(branchNo, "")
    }
    ensureVisible(branchNo)
    activeBranch.value = branchNo
    branchMemo.value = branchMemoByBranch.value[branchNo] ?? ""
    setOriginalBranchValues(branchNo, branchMemo.value)
    lastAddedBranchNo.value = branchNo
    //-- 枝番追加時：注文住所を中心に地図を取得
    fetchMapCenter()
  } else {
    //-- 既存枝番：その枝番へ切り替え（未保存変更があれば confirmBranchSwitchDiscard 側で処理済みの想定ではないが、ここに来る場合は直接追加）
    ensureVisible(branchNo)
    switchToBranch(branchNo)
  }
  closeBranchAddModal()
}

//-- 枝番切り替え確認で「破棄して〜」を押したとき。保留アクションに応じて枝番切り替え・遷移・注文変更・枝番追加モーダルなどを実行する
function confirmBranchSwitchDiscard() {
  const pa = pendingAction.value
  if (!pa) {
    closeBranchSwitchConfirmModal()
    return
  }
  //-- 枝番タブ切り替え
  if (pa.type === "branch" && pa.branchNo) {
    closeBranchSwitchConfirmModal()
    pendingAction.value = null
    performBranchSwitch(pa.branchNo)
    return
  }
  //-- リンク遷移（看板編集等）
  if (pa.type === "navigate" && pa.url) {
    closeBranchSwitchConfirmModal()
    pendingAction.value = null
    router.push(pa.url)
    return
  }
  //-- 戻る
  if (pa.type === "back") {
    closeBranchSwitchConfirmModal()
    pendingAction.value = null
    router.back()
    return
  }
  //-- 注文番号変更（選択モーダルから別注文を選んだ）
  if (pa.type === "changeOrderNo" && pa.orderNo !== undefined) {
    closeBranchSwitchConfirmModal()
    inputOrderNo.value = pa.orderNo
    lastConfirmedOrderNo.value = pa.orderNo
    clearOrderInfoExceptOrderNo()
    applyOrderBySearch(pa.orderNo)
    pendingAction.value = null
    return
  }
  //-- 枝番入力欄で既存枝番へ切り替え（switchOnly）
  if (pa.type === "applyBranchInput" && pa.branchNo) {
    closeBranchSwitchConfirmModal()
    doApplyActiveBranchDisplayValue(pa.branchNo, true)
    pendingAction.value = null
    return
  }
  //-- 枝番追加：直前追加分を破棄してから追加モーダルを開く
  if (pa.type === "addBranch") {
    if (lastAddedBranchNo.value) {
      //-- 直前追加した枝番を一覧から削除し、アクティブを先頭または空に切り替え
      const idx = allBranches.value.indexOf(lastAddedBranchNo.value)
      if (idx >= 0) {
        allBranches.value = allBranches.value.filter((_, i) => i !== idx)
        lastAddedBranchNo.value = null
        if (allBranches.value.length > 0) {
          activeBranch.value = allBranches.value[0]
          branchMemo.value = branchMemoByBranch.value[activeBranch.value] ?? ""
          setOriginalBranchValues(activeBranch.value, branchMemo.value)
        } else {
          activeBranch.value = ""
          branchMemo.value = ""
          setOriginalBranchValues("", "")
        }
      }
    }
    closeBranchSwitchConfirmModal()
    pendingAction.value = null
    openBranchAddModal()
    return
  }
  closeBranchSwitchConfirmModal()
}

//-- 枝番切り替え確認で「登録/更新して〜」を押したとき。order_detail を保存してから結果モーダルを開く
async function confirmBranchSwitchRegister() {
  closeBranchSwitchConfirmModal(false)
  const orderNo = lastConfirmedOrderNo.value?.trim()
  if (!orderNo) {
    openRegisterResultModal("注文番号がありません")
    return
  }
  const bn = normalizeBranchNo(activeBranch.value)
  if (bn) branchMemoByBranch.value[bn] = branchMemo.value
  const branches = allBranches.value.map((b) => ({
    branchNo: b,
    note: (branchMemoByBranch.value[b] ?? "").trim() || undefined,
    designData: designDataForApi(mapDataByBranch.value[b]),
  }))
  try {
    await updateOrderDetails(orderNo, branches)
    const branchToSelect = normalizeBranchNo(activeBranch.value)
    await applyOrderBySearch(orderNo, branchToSelect)
    openRegisterResultModal(pageMode.value === "edit" ? "更新が完了しました" : "登録が完了しました")
  } catch (e) {
    openRegisterResultModal(e instanceof Error ? e.message : "登録に失敗しました")
  }
}

//-- 登録結果モーダルで OK を押したとき。保留アクション（枝番切り替え・遷移など）を実行してからモーダルを閉じる
function onRegisterResultModalOk() {
  const pa = pendingAction.value
  if (pa) {
    if (pa.type === "branch" && pa.branchNo) performBranchSwitch(pa.branchNo)
    else if (pa.type === "applyBranchInput" && pa.branchNo) doApplyActiveBranchDisplayValue(pa.branchNo, true)
    else if (pa.type === "navigate" && pa.url) router.push(pa.url)
    else if (pa.type === "back") router.back()
  }
  closeRegisterResultModal()
  switchToUpdateMode()
  pendingAction.value = null
}

//-- 枝番削除確認で OK を押したとき。枝番一覧から対象を削除し、表示中の枝番を適切に切り替える
function executeBranchDelete() {
  const target = branchDeleteTargetNo.value
  if (!target) {
    closeBranchDeleteModal()
    return
  }
  const idx = allBranches.value.indexOf(target)
  if (idx >= 0) {
    //-- 枝番一覧から削除
    allBranches.value = allBranches.value.filter((_, i) => i !== idx)
    if (target === lastAddedBranchNo.value) lastAddedBranchNo.value = null
  }
  //-- 削除後のアクティブ枝番を決定（削除した枝番がアクティブだった場合は隣へ。nextIdx で削除位置以降の先頭、または末尾を指定）
  if (allBranches.value.length > 0) {
    const nextIdx = Math.min(idx, allBranches.value.length - 1)
    const nextBranch = allBranches.value[nextIdx] ?? allBranches.value[0]
    activeBranch.value = nextBranch
    branchMemo.value = branchMemoByBranch.value[nextBranch] ?? ""
    setOriginalBranchValues(nextBranch, branchMemo.value)
    visibleStartIndex.value = Math.min(
      visibleStartIndex.value,
      Math.max(0, allBranches.value.length - MAX_BRANCH_DISPLAY)
    )
  } else {
    activeBranch.value = ""
    branchMemo.value = ""
    setOriginalBranchValues("", "")
  }
  closeBranchDeleteModal()
}

//-- 枝番追加ボタン押下。未保存変更があれば確認モーダルを出し、なければ枝番追加モーダルを開く
//-- 直前で新規追加した枝番（lastAddedBranchNo）も変更対象とみなす
function clickAddBranch() {
  const hasChanges = isDirty.value || lastAddedBranchNo.value != null
  if (allBranches.value.length > 0 && hasChanges) {
    pendingAction.value = { type: "addBranch" }
    openBranchSwitchConfirmModal()
    return
  }
  openBranchAddModal()
}

//-- 枝番削除ボタン押下。現在の枝番を削除対象として枝番削除確認モーダルを開く
function clickDeleteBranch() {
  const cur = normalizeBranchNo(activeBranch.value)
  if (!cur || !branchExistsInOrder(cur)) return
  openBranchDeleteModal(cur)
}

//-- 戻るボタン/リンク押下時。未保存変更があれば確認モーダルを出し、OK で履歴を戻す
function handleBackClick(e: Event) {
  if (!isDirty.value) {
    router.back()
    return
  }
  e.preventDefault()
  const verb = pageMode.value === "edit" ? "更新して" : "登録して"
  pendingAction.value = {
    type: "back",
    labels: {
      message: `変更が保存されていません。${verb}から戻りますか`,
      discard: "破棄して戻る",
      register: `${verb}戻る`,
    },
  }
  openBranchSwitchConfirmModal()
}

//-- 地図表示（注文住所を中心に MapTiler で表示）。全画面終了時にズームを保持
const mapCenter = ref<[number, number] | null>(null)
const mapZoom = ref(15)
const mapCenterLoading = ref(false)
const mapCenterError = ref<string | null>(null)
const mapPreviewRef = ref<InstanceType<typeof MapPreview> | null>(null)
const fullscreenMapRef = ref<InstanceType<typeof MapPreview> | null>(null)

//-- MapTiler API キー（VITE_MAPTILER_API_KEY）
const mapTilerApiKey = (import.meta.env.VITE_MAPTILER_API_KEY as string) ?? ""

//-- 注文住所をジオコーディングし、地図の中心座標を取得
async function fetchMapCenter() {
  const address = orderDisplay.value.address?.trim()
  if (!address || !hasBranches.value) {
    mapCenter.value = null
    mapCenterError.value = null
    return
  }
  mapCenterLoading.value = true
  mapCenterError.value = null
  try {
    const { lat, lng } = await geocodeAddress(address)
    mapCenter.value = [lng, lat]
    mapZoom.value = 15
  } catch (e) {
    mapCenter.value = null
    mapCenterError.value = e instanceof Error ? e.message : "住所の検索に失敗しました"
  } finally {
    mapCenterLoading.value = false
  }
}

//-- 全画面編集
const fullscreenEditVisible = ref(false)

//-- HTMLオブジェクトマスタ（ルート描画・テキスト配置・画像配置・吹き出し配置等）
const htmlObjects = ref<HtmlObjectItem[]>([])
//-- 地図用画像（IMAGE_PLACEMENT の sampleImagePath から取得）。MapPreview の imageItems に渡す
const imageItemsForMap = computed(() => getImageItemsFromHtmlObjects(htmlObjects.value))
//-- 各オブジェクトで選択中の値ID（has_child_table のとき使用）
const selectedValueIdByObjectId = ref<Record<number, number>>({})
//-- 吹き出し等の入力テキスト（has_child_table でないとき使用）
const inputTextByObjectId = ref<Record<number, string>>({})
//-- 選択モーダルを開いている html_object_id（null のとき閉じている）
const openSelectModalObjectId = ref<number | null>(null)

//-- 地図描画用 composables（Phase 8 で mapDataByBranch と連携・クリックハンドラ接続予定）
const mapFeatures = useMapFeatures()
const mapInteraction = useMapInteraction()
const mapHistory = useMapHistory()
const mapData = useMapData()

//-- 区分コード別のツールチップ文言
const TOOLTIP_BY_CATEGORY: Record<string, string> = {
  ROUTE_DRAWING: "地図上に経路を描画します",
  TEXT_PLACEMENT: "地図上にテキストを配置します",
  IMAGE_PLACEMENT: "地図上に画像を配置します",
  BALLOON_PLACEMENT: "地図上に吹き出しを配置します",
}

//-- 区分コード別のアクションボタンラベル（ルート描画→描画、画像/テキスト配置→配置）
const ACTION_LABEL_BY_CATEGORY: Record<string, string> = {
  ROUTE_DRAWING: "描画",
  TEXT_PLACEMENT: "配置",
  IMAGE_PLACEMENT: "配置",
  BALLOON_PLACEMENT: "配置",
}

//-- ドロップダウンの「選択してください」プレースホルダー用の値（DB値とは別）
const SELECT_PLACEHOLDER_VALUE = 0

//-- 方式B: ルート描画の3つのドロップダウン用オブジェクト（ROUTE_LINE_TYPE / ROUTE_LINE_COLOR / ROUTE_LINE_WIDTH）
const ROUTE_LINE_CATEGORIES = ["ROUTE_LINE_TYPE", "ROUTE_LINE_COLOR", "ROUTE_LINE_WIDTH"] as const
const routeLineTypeObj = computed(() => htmlObjects.value.find((o) => o.categoryCode === "ROUTE_LINE_TYPE"))
const routeLineColorObj = computed(() => htmlObjects.value.find((o) => o.categoryCode === "ROUTE_LINE_COLOR"))
const routeLineWidthObj = computed(() => htmlObjects.value.find((o) => o.categoryCode === "ROUTE_LINE_WIDTH"))
//-- メインループで表示するオブジェクト（ROUTE_LINE_* は ROUTE_DRAWING 内で表示するため除外）
const displayableHtmlObjects = computed(() =>
  htmlObjects.value.filter((o) => !ROUTE_LINE_CATEGORIES.includes(o.categoryCode))
)
//-- 方式B: 線の種類・色・太さの3つがすべて選択済みか
const allRouteOptionsSelected = computed(() => {
  const typeVal = routeLineTypeObj.value ? getSelectedValue(routeLineTypeObj.value) : undefined
  const colorVal = routeLineColorObj.value ? getSelectedValue(routeLineColorObj.value) : undefined
  const widthVal = routeLineWidthObj.value ? getSelectedValue(routeLineWidthObj.value) : undefined
  return !!(typeVal && colorVal && widthVal)
})

//-- 全画面編集オーバーレイを表示し、背景のスクロールを無効にする
function openFullscreenEdit() {
  fullscreenEditVisible.value = true
  document.body.style.overflow = "hidden"
  nextTick(() => {
    setTimeout(() => fullscreenMapRef.value?.fitMapToContainer(), 100)
  })
}

//-- 全画面編集オーバーレイを閉じ、背景のスクロールを復元する。地図の中心・ズームをプレビューに引き継ぐ
function closeFullscreenEdit() {
  const map = fullscreenMapRef.value?.getMap()
  if (map) {
    const center = map.getCenter()
    mapCenter.value = [center.lng, center.lat]
    mapZoom.value = map.getZoom()
  }
  fullscreenEditVisible.value = false
  openSelectModalObjectId.value = null
  document.body.style.overflow = ""
}

//-- 全画面マップの map-loaded 時：復元・リサイズ（sinage_old と同様に map が正しいサイズでクリックを受け付けるようにする）
function onFullscreenMapLoaded(map: maplibregl.Map) {
  nextTick(() => {
    fullscreenMapRef.value?.fitMapToContainer()
  })
  const bn = normalizeBranchNo(activeBranch.value)
  const data = bn ? (mapDataByBranch.value[bn] ?? {}) : {}
  mapFeatures.restoreFeatures(map, data as unknown as Record<string, unknown>)
}

//-- 全画面マップのクリック時：MapPreview から emit される。editMode に応じてテキスト・画像・吹き出し・ルートを配置
function onFullscreenMapClick(lngLat: { lng: number; lat: number }) {
  const map = fullscreenMapRef.value?.getMap() ?? null
  const { lng, lat } = lngLat
  switch (mapInteraction.editMode.value) {
    case "text": {
      const obj = htmlObjects.value.find((o) => o.categoryCode === "TEXT_PLACEMENT")
      const text = obj ? (inputTextByObjectId.value[obj.htmlObjectId] ?? "") : ""
      mapFeatures.addText(map, lng, lat, text)
      mapHistory.pushHistory("text")
      mapInteraction.editMode.value = "route"
      syncMapFeaturesToBranch(activeBranch.value)
      break
    }
    case "image": {
      const obj = htmlObjects.value.find((o) => o.categoryCode === "IMAGE_PLACEMENT")
      const imageId = obj ? (getSelectedValue(obj)?.valueCode ?? "") : ""
      if (imageId) {
        mapFeatures.addImage(map, lng, lat, imageId)
        mapHistory.pushHistory("image")
        mapInteraction.editMode.value = "route"
        syncMapFeaturesToBranch(activeBranch.value)
      }
      break
    }
    case "balloon": {
      const obj = htmlObjects.value.find((o) => o.categoryCode === "BALLOON_PLACEMENT")
      const text = obj ? (inputTextByObjectId.value[obj.htmlObjectId] ?? "") : ""
      mapFeatures.addBalloon(map, lng, lat, text)
      mapHistory.pushHistory("balloon")
      mapInteraction.editMode.value = "route"
      syncMapFeaturesToBranch(activeBranch.value)
      break
    }
    case "route":
      mapFeatures.addTempMarker(map, lng, lat)
      break
  }
}

//-- useMapFeatures の編集結果を mapDataByBranch に同期する
function syncMapFeaturesToBranch(branchNo: string) {
  const bn = normalizeBranchNo(branchNo)
  if (!bn) return
  const existing = mapDataByBranch.value[bn] ?? {}
  const built = mapData.buildMapData(null, {
    routeFeatures: mapFeatures.routeFeatures.value,
    textFeatures: mapFeatures.textFeatures.value,
    imageFeatures: mapFeatures.imageFeatures.value,
    balloonFeatures: mapFeatures.balloonFeatures.value,
  }, { branchNo: bn, orderNo: existing.orderNo ?? lastConfirmedOrderNo.value })
  const merged = { ...existing, ...built } as MapDataJson
  mapDataByBranch.value = { ...mapDataByBranch.value, [bn]: merged }
}

//-- コンポーネント破棄時に body の overflow をリセット（他ページへ遷移した際のスクロール復元）
onBeforeUnmount(() => {
  document.body.style.overflow = ""
  uninstallMapWarnSuppress()
})

//-- ルート描画モードか（地図クリックで一時マーカーを打てる状態）
const isRouteDrawingMode = () => mapInteraction.editMode.value === "route"

//-- アクションボタン押下：editMode を設定し地図クリックで配置可能にする。ルート描画中に再度クリックでキャンセル
function onActionButtonClick(obj: HtmlObjectItem) {
  const code = obj.categoryCode
  if (code === "ROUTE_DRAWING") {
    if (isRouteDrawingMode()) {
      //-- ルート描画中に再度クリック：一時マーカーをクリアしモード解除（開始の点を打って戻りたい時）
      mapFeatures.clearTempMarkers(fullscreenMapRef.value?.getMap() ?? null)
      mapInteraction.editMode.value = "none"
    } else {
      mapInteraction.editMode.value = "route"
    }
  } else if (code === "TEXT_PLACEMENT") mapInteraction.editMode.value = "text"
  else if (code === "IMAGE_PLACEMENT") mapInteraction.editMode.value = "image"
  else if (code === "BALLOON_PLACEMENT") mapInteraction.editMode.value = "balloon"
}

//-- html_object_value の valueData をパース（色・線種・太さ）。JSON 形式 {"color":"#FF0000","width":4} を想定
function parseRouteValueData(valueData: string | null | undefined): { type?: string; color?: string; width?: number } {
  if (!valueData?.trim()) return {}
  try {
    const parsed = JSON.parse(valueData) as Record<string, unknown>
    if (parsed && typeof parsed === "object") {
      return {
        type: typeof parsed.type === "string" ? parsed.type : undefined,
        color: typeof parsed.color === "string" ? parsed.color : undefined,
        width: typeof parsed.width === "number" ? parsed.width : undefined,
      }
    }
  } catch {
    //-- JSON でない場合は無視（カンマ区切り等は将来対応）
  }
  return {}
}

//-- 方式B: 3つのドロップダウン選択値から drawOptions を組み立てる
function buildRouteDrawOptionsFromThreeDropdowns(): {
  type: string
  color: string
  width: number
  stripe: boolean
  style: "solid" | "dashed"
} {
  const typeVal = routeLineTypeObj.value ? getSelectedValue(routeLineTypeObj.value) : undefined
  const colorVal = routeLineColorObj.value ? getSelectedValue(routeLineColorObj.value) : undefined
  const widthVal = routeLineWidthObj.value ? getSelectedValue(routeLineWidthObj.value) : undefined
  const typeCode = typeVal?.valueCode ?? ""
  const colorCode = colorVal?.valueCode ?? ""
  const widthCode = widthVal?.valueCode ?? ""
  let color = "#FF0000"
  let width = 4
  let stripe = false
  let style: "solid" | "dashed" = "solid"
  if (colorVal?.valueData) {
    try {
      const parsed = JSON.parse(colorVal.valueData) as { color?: string }
      if (typeof parsed.color === "string") color = parsed.color
    } catch {
      /* ignore */
    }
  }
  if (widthVal?.valueData) {
    try {
      const parsed = JSON.parse(widthVal.valueData) as { width?: number }
      if (typeof parsed.width === "number") width = parsed.width
    } catch {
      /* ignore */
    }
  }
  if (typeVal?.valueData) {
    try {
      const parsed = JSON.parse(typeVal.valueData) as { stripe?: boolean; style?: string }
      stripe = parsed.stripe === true
      if (parsed.style === "dashed") style = "dashed"
    } catch {
      /* ignore */
    }
  }
  //-- type は復元用に複合コード（例: SOLID_RED_W4, STRIPE_BLUE_W4）
  const type = `${typeCode}_${colorCode}_${widthCode}`.replace(/^_|_$/g, "") || "LINE"
  return { type, color, width, stripe, style }
}

//-- ルート描画確定：一時マーカーを線に変換し mapDataByBranch に反映。方式B: 3つのドロップダウン選択値を組み合わせて drawRoute に渡す
function onConfirmRouteDraw() {
  const map = fullscreenMapRef.value?.getMap() ?? null
  const drawOptions = buildRouteDrawOptionsFromThreeDropdowns()
  mapFeatures.drawRoute(map, drawOptions)
  mapInteraction.editMode.value = "none"
  mapHistory.pushHistory("route")
  syncMapFeaturesToBranch(activeBranch.value)
}

//-- 直前の操作を元に戻す（テキスト・画像・吹き出し・ルートの追加を取り消し）。取り消し後に mapDataByBranch に同期
function onUndoLastAction() {
  const map = fullscreenMapRef.value?.getMap() ?? null
  mapHistory.undoLastAction(map, {
    routeFeatures: mapFeatures.routeFeatures.value,
    textFeatures: mapFeatures.textFeatures.value,
    imageFeatures: mapFeatures.imageFeatures.value,
    callouts: mapFeatures.balloonFeatures.value,
  })
  syncMapFeaturesToBranch(activeBranch.value)
}

//-- オブジェクトで選択中の値（ドロップダウン・選択モーダルで選択したもの）
function getSelectedValue(obj: HtmlObjectItem): HtmlObjectValueItem | undefined {
  const id = selectedValueIdByObjectId.value[obj.htmlObjectId] ?? obj.values[0]?.htmlObjectValueId
  return obj.values.find((v) => v.htmlObjectValueId === id)
}

//-- プレビュー/出力で使うフォーマット（jpeg または svg）
const outputFormat = ref<"jpeg" | "svg">("jpeg")

//-- プレビューボタン押下（枝番のプレビュー表示・未実装）
function onPreview() {
  //-- TODO: 枝番のプレビュー表示
}

//-- 出力ボタン押下（表示中の枝番を選択フォーマットで出力・未実装）
function onOutput() {
  //-- TODO: 表示中の枝番を選択フォーマットで出力
}

//-- 全枝番出力ボタン押下（全枝番をまとめて選択フォーマットで出力・未実装）
function onOutputAllBranches() {
  //-- TODO: 全枝番を選択フォーマットでまとめて出力
}

//-- 地図データのJSON形式（枝番ごとのルート・テキスト・画像・吹き出し等）
//-- routes は RouteItem[] または FeatureCollection（normalizeDesignDataToMapData で FeatureCollection に統一）
interface MapDataJson {
  version: number
  branchNo: string
  orderNo?: string
  routes?: RouteItem[] | FeatureCollection<LineString, RouteFeatureProperties>
  texts?: unknown[]
  images?: unknown[]
  callouts?: unknown[]
}

//-- routes/texts/images/callouts のいずれかに要素があるか（地図情報が設定されているか）
function hasMapContent(data: MapDataJson | undefined): boolean {
  if (!data) return false
  const hasRoutes =
    (Array.isArray(data.routes) && data.routes.length > 0) ||
    (data.routes &&
      typeof data.routes === "object" &&
      "features" in data.routes &&
      Array.isArray((data.routes as FeatureCollection).features) &&
      (data.routes as FeatureCollection).features.length > 0)
  return (
    hasRoutes ||
    (Array.isArray(data.texts) && data.texts.length > 0) ||
    (Array.isArray(data.images) && data.images.length > 0) ||
    (Array.isArray(data.callouts) && data.callouts.length > 0)
  )
}

//-- API 登録用に design_data を整形。version/branchNo/orderNo は不要。routes は RouteItem[] 形式に正規化（手順 9-1）
function designDataForApi(data: MapDataJson | undefined): unknown {
  if (!data || !hasMapContent(data)) return undefined
  return {
    routes: ensureRoutesAsRouteItems(data.routes),
    texts: Array.isArray(data.texts) ? data.texts : [],
    images: Array.isArray(data.images) ? data.images : [],
    callouts: Array.isArray(data.callouts) ? data.callouts : [],
  }
}

//-- 枝番ごとの地図データを保持（design_data のフロントエンド表現。編集・出力・読込で使用）
const mapDataByBranch = ref<Record<string, MapDataJson>>({})

//-- 表示中の枝番の design_data（プレビューエリアで表示）
const activeBranchDesignData = computed(() => {
  const bn = normalizeBranchNo(activeBranch.value)
  if (!bn) return null
  return mapDataByBranch.value[bn] ?? null
})

//-- 現在の枝番に地図情報が設定されているか（地図出力ボタンの有効/無効に使用）
const canExportMap = computed(() => hasMapContent(mapDataByBranch.value[normalizeBranchNo(activeBranch.value)]))
//-- 元に戻すボタンの有効/無効（履歴が空でないとき有効）
const canUndo = computed(() => mapHistory.undoStack.value.length > 0)


//-- API の design_data を MapDataJson 形式に正規化する（枝番・注文番号を補完、配列を安全に取得）
//-- routes が RouteItem[] 形式の場合は FeatureCollection に変換（手順 9-2）
function normalizeDesignDataToMapData(
  raw: unknown,
  branchNo: string,
  orderNo: string
): MapDataJson {
  if (raw && typeof raw === "object" && raw !== null) {
    const r = raw as Record<string, unknown>
    return {
      version: typeof r.version === "number" ? r.version : 1,
      branchNo,
      orderNo: (r.orderNo as string) ?? orderNo,
      routes: ensureRoutesAsFeatureCollection(r.routes),
      texts: Array.isArray(r.texts) ? r.texts : [],
      images: Array.isArray(r.images) ? r.images : [],
      callouts: Array.isArray(r.callouts) ? r.callouts : [],
    }
  }
  //-- raw が無効な場合：空の構造を返す
  return {
    version: 1,
    branchNo,
    orderNo: orderNo || undefined,
    routes: ensureRoutesAsFeatureCollection(undefined),
    texts: [],
    images: [],
    callouts: [],
  }
}

//-- 地図出力ボタン押下（現在の枝番の地図データをJSONファイルでダウンロード）。routes は RouteItem[] 形式で出力（手順 9-1）
function onMapOutput() {
  const branchNo = normalizeBranchNo(activeBranch.value)
  if (!branchNo) return
  //-- 枝番のデータを取得（未設定時は空の構造で初期化）
  const raw = mapDataByBranch.value[branchNo] ?? {
    version: 1,
    branchNo,
    orderNo: lastConfirmedOrderNo.value || undefined,
    routes: [],
    texts: [],
    images: [],
    callouts: [],
  }
  const data: MapDataJson = { ...raw, routes: ensureRoutesAsRouteItems(raw.routes) }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `map_${lastConfirmedOrderNo.value || "unknown"}_${branchNo}.json`
  a.click()
  URL.revokeObjectURL(url)  //-- メモリ解放
}

//-- JSONファイルを選択したとき。別枝番で保存した design_data を読込み、現在の枝番に適用する（読込後に編集可能）
function onMapLoad(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      //-- 1) ファイル内容をテキストとして取得し、JSON パース
      const text = reader.result as string
      const data = JSON.parse(text) as MapDataJson
      if (typeof data !== "object" || data === null) return
      const branchNo = normalizeBranchNo(activeBranch.value)
      if (!branchNo) return
      //-- 2) 現在の枝番用に正規化（version/branchNo/orderNo を補完。routes は RouteItem[] なら FeatureCollection に変換）
      const normalized: MapDataJson = {
        version: data.version ?? 1,
        branchNo,
        orderNo: data.orderNo ?? (lastConfirmedOrderNo.value || undefined),
        routes: ensureRoutesAsFeatureCollection(data.routes),
        texts: Array.isArray(data.texts) ? data.texts : [],
        images: Array.isArray(data.images) ? data.images : [],
        callouts: Array.isArray(data.callouts) ? data.callouts : [],
      }
      //-- 3) mapDataByBranch にマージして反映（他枝番のデータは維持）
      mapDataByBranch.value = { ...mapDataByBranch.value, [branchNo]: normalized }
      //-- TODO: 地図編集コンポーネントに反映（MapLibre等実装時に連携）
    } catch {
      //-- JSONパースエラー時は何もしない
    }
  }
  reader.readAsText(file)
  input.value = ""  //-- 同一ファイル再選択を可能にするためクリア
}

//-- 注文番号フォーカス移動時: 検索値の「誤編集」と思われるときだけ画面初期化の確認を表示。
//-- - 注文番号を消した場合（空）→ 出さない（検索で未入力チェックされる）
//-- - 別の注文番号を入力した場合（検索値と無関係）→ 出さない
//-- - 検索値の先頭から一部削った／末尾に足しただけ（いずれかがもう一方の接頭辞）→ 出す
function onOrderNoBlur() {
  if (orderNoReadOnly.value) return
  if (!hasSearched.value) return
  const current = (inputOrderNo.value || "").trim()
  const confirmed = lastConfirmedOrderNo.value || ""
  if (current === confirmed) return
  if (current === "") return
  const looksLikeTypo =
    confirmed !== "" &&
    (confirmed.startsWith(current) || current.startsWith(confirmed))
  if (!looksLikeTypo) return
  openOrderNoResetConfirmModal()
}

onMounted(() => {
  //-- MapLibre の SDF/non-SDF 混在ワーニングを抑制（検索時・全画面時ともに有効）
  installMapWarnSuppress()
  //-- ページ表示時に状態をリセット（メニューからの遷移・bfcache 復元時もクリーンな状態で開始）
  selectedValueIdByObjectId.value = {}
  inputTextByObjectId.value = {}
  openSelectModalObjectId.value = null
  if (initialOrderNo.value && cameFromList.value) {
    inputOrderNo.value = initialOrderNo.value
    lastConfirmedOrderNo.value = initialOrderNo.value
    applyOrderBySearch(initialOrderNo.value)
  }
})

watch(activeBranch, (newVal, oldVal) => {
  if (oldVal) branchMemoByBranch.value[oldVal] = branchMemo.value
  if (newVal) branchMemo.value = branchMemoByBranch.value[newVal] ?? ""
})

watch(orderDetailModalOpen, (open) => {
  if (!open) orderDetailForModal.value = null
})

watch(fullscreenEditVisible, async (visible) => {
  if (visible) {
    mapHistory.clearHistory()
    mapInteraction.editMode.value = "none"
    mapFeatures.tempCoordinates.value = []
    mapFeatures.tempMarkerFeatures.value = { type: "FeatureCollection", features: [] } as FeatureCollection<Point>
    //-- 前回選択値が残らないよう、fetch の前に即リセット
    selectedValueIdByObjectId.value = {}
    inputTextByObjectId.value = {}
    try {
      htmlObjects.value = await fetchHtmlObjects()
      htmlObjects.value.forEach((obj) => {
        if (
          obj.categoryCode === "ROUTE_DRAWING" ||
          obj.categoryCode === "IMAGE_PLACEMENT" ||
          ROUTE_LINE_CATEGORIES.includes(obj.categoryCode)
        ) {
          selectedValueIdByObjectId.value[obj.htmlObjectId] = SELECT_PLACEHOLDER_VALUE
        } else if (obj.values.length > 0) {
          selectedValueIdByObjectId.value[obj.htmlObjectId] = obj.values[0].htmlObjectValueId
        }
      })
    } catch {
      htmlObjects.value = []
    }
    nextTick(() => {
      setTimeout(() => {
        fullscreenMapRef.value?.fitMapToContainer()
        mapPreviewRef.value?.fitMapToContainer()
      }, 150)
    })
  } else {
    //-- 全画面を閉じる際に useMapFeatures の編集結果を mapDataByBranch に同期
    syncMapFeaturesToBranch(activeBranch.value)
  }
})

//-- 全画面編集中に枝番を切り替えた場合：旧枝番を mapDataByBranch に同期し、新枝番を restoreFeatures で復元
watch(activeBranch, (newBranch, oldBranch) => {
  if (!fullscreenEditVisible.value) return
  const map = fullscreenMapRef.value?.getMap()
  if (!map) return
  if (oldBranch) {
    syncMapFeaturesToBranch(oldBranch)
  }
  mapHistory.clearHistory()
  const bn = normalizeBranchNo(newBranch)
  if (bn) {
    mapFeatures.restoreFeatures(map, (mapDataByBranch.value[bn] ?? {}) as unknown as Record<string, unknown>)
  }
})
</script>

<template>
  <!-- === 画面：看板編集 === -->
  <main id="order-detail-page">
    <div class="order-detail-page-container">
    <!-- === 注文情報カード（タイトル＋検索・表示エリア） === -->
    <div class="order-detail-card order-detail-card--header-full order-detail-card--bordered card-header-full">
      <!-- -- ヘッダー -- -->
      <div class="page-card-header order-detail-card-header">
        <h2>看板編集</h2>
      </div>
      <div class="order-detail-card-body">
        <!-- -- 詳細エリア（開閉トグル） -- -->
        <div>
          <button
            type="button"
            class="detail-toggle-btn"
            :aria-expanded="orderInfoExpanded"
            :aria-label="orderInfoExpanded ? '詳細を閉じる' : '詳細を開く'"
            @click="toggleOrderInfo"
          >
            <span
              class="detail-toggle-btn-icon"
              :class="{ 'detail-toggle-btn-icon--expanded': orderInfoExpanded }"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
            <span>{{ orderInfoExpanded ? "閉じる" : "開く" }}</span>
          </button>
          <div v-show="orderInfoExpanded" class="order-detail-order-info-expanded">
            <!-- 注文番号＋顧客名/担当者＋更新日/更新者（同一行）・検索／選択ボタン・検索実行 -->
            <div class="order-detail-order-no-row">
              <div class="order-detail-form-field order-detail-form-field--order-no">
              <label class="form-label form-label--with-badge" :for="FORM_IDS.detail.orderNo">
                <span class="form-required-badge">必須</span>
                注文番号
              </label>
              <div class="order-detail-form-field-row">
                <input
                  :id="FORM_IDS.detail.orderNo"
                  ref="orderNoInputRef"
                  v-model="inputOrderNo"
                  type="text"
                  placeholder="注文番号を入力してください"
                  maxlength="20"
                  :readonly="orderNoReadOnly"
                  class="order-detail-order-no-input"
                  @blur="onOrderNoBlur"
                />
                <button
                  type="button"
                  title="選択"
                  class="btn-icon btn-icon--select"
                  :disabled="selectSearchDisabled"
                  @click="openOrderNoSelectModal"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="注文詳細を表示"
                  class="btn-icon btn-icon--select"
                :disabled="!hasSearched || !lastConfirmedOrderNo"
                @click="openOrderDetailModal"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                type="button"
                title="検索"
                class="btn-icon btn-icon--search"
                @click="confirmSearch"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                </button>
              </div>
            </div>
              <div class="order-detail-order-info-cell order-detail-order-info-cell--customer">
                <div class="form-label">顧客名 / 担当者</div>
                <div class="order-detail-order-info-cell-value">{{ fieldDisplay(orderDisplay.customerName) }}</div>
                <div class="order-detail-order-info-cell-sub">{{ fieldDisplay(orderDisplay.manager) }}</div>
              </div>
              <div class="order-detail-order-info-cell order-detail-order-info-cell--update">
                <div class="form-label">更新日 / 更新者</div>
                <div class="order-detail-order-info-cell-value">{{ fieldDisplay(orderDisplay.updateDate) }}</div>
                <div class="order-detail-order-info-cell-sub">{{ fieldDisplay(orderDisplay.updater) }}</div>
              </div>
            </div>
            <!-- デザイン種別/テンプレート・注文名/住所（同一ブロック） -->
            <div class="order-detail-order-info-block">
              <div class="order-detail-order-info-cell">
                <div class="form-label">デザイン種別 / テンプレート</div>
                <div class="order-detail-order-info-cell-value">{{ fieldDisplay(orderDisplay.designType) }}</div>
                <div class="order-detail-order-info-cell-sub">{{ fieldDisplay(orderDisplay.template) }}</div>
              </div>
              <div class="order-detail-order-info-cell">
                <div class="form-label">注文名 / 住所</div>
                <div class="order-detail-order-info-cell-value">{{ fieldDisplay(orderDisplay.orderName) }}</div>
                <div class="order-detail-order-info-cell-sub">{{ fieldDisplay(orderDisplay.address) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- === 看板情報カード（検索済み時のみ表示） === -->
    <section v-show="hasSearched" class="order-detail-card order-detail-card--bordered card-shadow">
      <!-- -- カードヘッダー（白背景・青アクセント） -- -->
      <div class="order-detail-signboard-header">
        <div class="order-detail-signboard-header-inner">
          <div class="order-detail-signboard-header-accent"></div>
          <h3>看板情報</h3>
        </div>
      </div>

      <div class="order-detail-signboard-section">
        <!-- -- 枝番タブ（スライド・タブ一覧・削除／追加ボタン） -- -->
        <div class="order-detail-branch-tabs">
          <div class="order-detail-branch-tabs-left">
            <button
              v-show="hasBranches"
              type="button"
              class="btn-icon-nav"
              title="前の枝番へ"
              :disabled="!canSlidePrev"
              @click="slidePrevBranch"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div v-if="!hasBranches" class="order-detail-branch-empty-msg">
              枝番情報がありません。枝番を追加してください
            </div>
            <div v-else class="order-detail-branch-tab-list">
              <div
                v-for="b in visibleBranches"
                :key="b"
                class="order-detail-branch-tab-item"
                :class="normalizeBranchNo(activeBranch) === b ? 'order-detail-branch-tab-item--active' : 'order-detail-branch-tab-item--inactive'"
              >
                <button
                  type="button"
                  class="order-detail-branch-tab"
                  :data-branch="b"
                  @click="switchToBranch(b)"
                >
                  {{ b }}
                </button>
              </div>
            </div>
            <button
              v-show="hasBranches"
              type="button"
              class="btn-icon-nav"
              title="次の枝番へ"
              :disabled="!canSlideNext"
              @click="slideNextBranch"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div class="order-detail-branch-tabs-right">
            <button
              type="button"
              class="btn btn-small btn-secondary"
              :disabled="!hasBranches"
              @click="clickDeleteBranch"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
              </svg>
              削除
            </button>
            <button
              type="button"
              class="btn btn-small btn-secondary"
              @click="clickAddBranch"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              追加
            </button>
          </div>
        </div>

        <!-- -- 枝番詳細（2カラム：左＝枝番・地図・備考／右＝レイアウトプレビュー） -- -->
        <div v-show="hasBranches" class="order-detail-branch-content">
          <!-- 左カラム -->
          <div class="order-detail-branch-left">
            <div class="order-detail-form-block">
              <label class="form-label form-label--with-badge" :for="FORM_IDS.detail.branchNo">
                <span class="form-required-badge">必須</span>
                枝番
              </label>
              <div class="order-detail-form-block-row">
                <input
                  :id="FORM_IDS.detail.branchNo"
                  v-model="activeBranch"
                  type="text"
                  maxlength="2"
                  class="order-detail-input-branch"
                  placeholder="枝番を入力してください"
                  @change="applyActiveBranchDisplayValue"
                  @keydown.enter.prevent="applyActiveBranchDisplayValue"
                />
                <button
                  type="button"
                  class="btn btn-small btn-secondary"
                  :disabled="!canExportMap"
                  @click="onMapOutput"
                >
                  地図出力
                </button>
                <label class="btn btn-small btn-secondary order-detail-label-file">
                  地図読込
                  <input type="file" accept=".json,application/json" class="sr-only" @change="onMapLoad" />
                </label>
              </div>
            </div>
            <div class="order-detail-form-block">
              <label class="form-label">テンプレートプレビュー</label>
              <div class="order-detail-template-preview">
                <img
                  src="/samples/template/template-dummy.png?v=2"
                  alt="テンプレートプレビュー"
                />
              </div>
            </div>
            <div class="order-detail-form-block">
              <label class="form-label" :for="FORM_IDS.detail.note">備考</label>
              <textarea
                :id="FORM_IDS.detail.note"
                v-model="branchMemo"
                class="order-detail-textarea-note"
                placeholder="その他、看板に関する補足事項を入力してください"
                rows="3"
              ></textarea>
            </div>
          </div>

          <!-- 右カラム：レイアウト／マッププレビュー・全画面編集・出力 -->
          <div class="order-detail-branch-right">
            <div class="order-detail-layout-row">
              <span class="form-label">レイアウト / マッププレビュー</span>
              <div class="order-detail-layout-actions">
                <button
                  type="button"
                  class="order-detail-layout-btn order-detail-layout-btn--fullscreen-edit btn btn-small btn-primary"
                  @click="openFullscreenEdit"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  全画面で編集・操作する
                </button>
                <button
                  type="button"
                  class="order-detail-layout-btn order-detail-layout-btn--preview btn btn-small btn-secondary"
                  @click="onPreview"
                >
                  全体プレビュー
                </button>
                <div class="order-detail-layout-actions-inline">
                  <select
                    v-model="outputFormat"
                    class="order-detail-select-format"
                  >
                    <option value="jpeg">JPEG</option>
                    <option value="svg">SVG</option>
                  </select>
                  <button
                    type="button"
                    class="order-detail-layout-btn order-detail-layout-btn--output btn btn-small btn-primary"
                    @click="onOutput"
                  >
                    出力
                  </button>
                  <button
                    type="button"
                    class="order-detail-layout-btn order-detail-layout-btn--output-all btn btn-small btn-secondary"
                    :disabled="!hasBranches"
                    @click="onOutputAllBranches"
                  >
                    全枝番出力
                  </button>
                </div>
              </div>
            </div>
            <div class="order-detail-map-preview-wrap">
              <template v-if="!hasBranches">
                <div class="order-detail-map-preview-placeholder">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3 21L21 3" />
                    <circle cx="8.5" cy="8.5" r="1.5" stroke-width="1.5" />
                    <path stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              </template>
              <template v-else>
                <div class="order-detail-map-preview-inner">
                  <div v-if="mapCenterLoading" class="order-detail-map-preview-loading">
                    <p>地図を読み込み中...</p>
                  </div>
                  <div v-else-if="mapCenterError" class="order-detail-map-preview-error">
                    <p>{{ mapCenterError }}</p>
                  </div>
                  <MapPreview
                    v-else
                    ref="mapPreviewRef"
                    :center="mapCenter"
                    :zoom="mapZoom"
                    :api-key="mapTilerApiKey"
                    :image-items="imageItemsForMap"
                    :design-data="activeBranchDesignData"
                    :interactive="false"
                    class="order-detail-map-preview-map"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- -- 画面下部：戻る／登録・更新（注文画面と同様のレイアウト） -- -->
    <div class="order-detail-form-actions">
      <div class="order-detail-form-actions-left">
        <button type="button" class="btn-back" @click="handleBackClick">
          戻る
        </button>
      </div>
      <div class="order-detail-form-actions-center">
        <button
          type="button"
          class="btn-action"
          :disabled="registerButtonDisabled"
          @click="openRegisterConfirmModal"
        >
          {{ registerButtonLabel }}
        </button>
      </div>
      <div class="order-detail-form-actions-right"></div>
    </div>
    </div>
  </main>

  <!-- 全画面編集オーバーレイ：左サイドバー（閉じる・ルート描画・テキスト等）＋右側マップエリア。v-if でマウント制御し、地図を正しいサイズで初期化 -->
  <Teleport to="body">
    <div
      v-if="fullscreenEditVisible"
      class="order-detail-fullscreen-overlay"
      aria-hidden="false"
    >
      <div class="order-detail-fullscreen-inner">
        <aside class="order-detail-fullscreen-sidebar">
          <div class="order-detail-fullscreen-sidebar-body">
            <div>
              <button
                type="button"
                class="btn btn-small btn-primary w-full"
                @click="closeFullscreenEdit"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                閉じる
              </button>
            </div>
            <!-- DB取得のHTMLオブジェクト（ルート描画・テキスト配置・画像配置・吹き出し配置等） -->
            <div
              v-for="obj in displayableHtmlObjects"
              :key="obj.htmlObjectId"
              class="order-detail-html-object-block"
            >
              <div class="order-detail-html-object-header">
                <span class="form-label">{{ obj.categoryName }}</span>
                <span
                  v-if="TOOLTIP_BY_CATEGORY[obj.categoryCode]"
                  class="order-detail-tooltip-wrap"
                >
                  <span class="order-detail-tooltip-icon">ⓘ</span>
                  <span
                    class="order-detail-tooltip"
                    role="tooltip"
                  >
                    {{ TOOLTIP_BY_CATEGORY[obj.categoryCode] }}
                  </span>
                </span>
              </div>
              <!-- 方式B: ルート描画セクション（線の種類・色・太さの3つのドロップダウン1行＋その下に描画・確定ボタン） -->
              <template v-if="obj.categoryCode === 'ROUTE_DRAWING'">
                <div class="order-detail-route-drawing-block">
                  <div class="order-detail-route-drawing-row">
                    <div
                      v-for="routeObj in [routeLineTypeObj, routeLineColorObj, routeLineWidthObj]"
                      :key="routeObj?.htmlObjectId ?? ''"
                      v-show="routeObj"
                      class="order-detail-route-dropdown-wrap"
                    >
                      <select
                        :value="selectedValueIdByObjectId[routeObj!.htmlObjectId] ?? SELECT_PLACEHOLDER_VALUE"
                        class="order-detail-object-input"
                        :class="{ 'order-detail-object-input--placeholder': (selectedValueIdByObjectId[routeObj!.htmlObjectId] ?? SELECT_PLACEHOLDER_VALUE) === SELECT_PLACEHOLDER_VALUE }"
                        :disabled="isRouteDrawingMode()"
                        @change="(e) => { selectedValueIdByObjectId[routeObj!.htmlObjectId] = Number((e.target as HTMLSelectElement).value) }"
                      >
                      <option :value="SELECT_PLACEHOLDER_VALUE">選択してください</option>
                      <option
                        v-for="v in routeObj!.values"
                        :key="v.htmlObjectValueId"
                        :value="v.htmlObjectValueId"
                      >
                        {{ v.valueName }}
                      </option>
                      </select>
                    </div>
                  </div>
                  <div class="order-detail-object-row">
                    <button
                      type="button"
                      :title="isRouteDrawingMode() ? 'キャンセル（描画をやめる）' : '描画'"
                      :aria-label="isRouteDrawingMode() ? 'キャンセル' : '描画'"
                      :aria-pressed="mapInteraction.editMode.value === 'route'"
                      :class="[
                        'btn-icon btn-icon--select',
                        { 'order-detail-draw-btn--active': mapInteraction.editMode.value === 'route' }
                      ]"
                      :disabled="!isRouteDrawingMode() && !allRouteOptionsSelected"
                      @click="onActionButtonClick(obj)"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      title="ルートを確定"
                      aria-label="ルートを確定"
                      class="btn btn-small btn-primary"
                      :disabled="mapFeatures.tempCoordinates.value.length < 2 || !allRouteOptionsSelected"
                      @click="onConfirmRouteDraw"
                    >
                      確定
                    </button>
                  </div>
                </div>
              </template>
              <!-- 子テーブルあり：ドロップダウン・選択・描画の3要素（画像配置等）。テキストは吹き出しと同様に入力欄を使用 -->
              <template v-else-if="obj.hasChildTable && obj.values.length > 0 && obj.categoryCode !== 'TEXT_PLACEMENT'">
                <div class="order-detail-object-row">
                  <select
                    :value="selectedValueIdByObjectId[obj.htmlObjectId] ?? (obj.categoryCode === 'IMAGE_PLACEMENT' ? SELECT_PLACEHOLDER_VALUE : obj.values[0]?.htmlObjectValueId)"
                    class="order-detail-object-input"
                    :class="{ 'order-detail-object-input--placeholder': (selectedValueIdByObjectId[obj.htmlObjectId] ?? (obj.categoryCode === 'IMAGE_PLACEMENT' ? SELECT_PLACEHOLDER_VALUE : obj.values[0]?.htmlObjectValueId)) === SELECT_PLACEHOLDER_VALUE }"
                    @change="(e) => { selectedValueIdByObjectId[obj.htmlObjectId] = Number((e.target as HTMLSelectElement).value) }"
                  >
                    <option
                      v-if="obj.categoryCode === 'IMAGE_PLACEMENT'"
                      :value="SELECT_PLACEHOLDER_VALUE"
                    >
                      選択してください
                    </option>
                    <option
                      v-for="v in obj.values"
                      :key="v.htmlObjectValueId"
                      :value="v.htmlObjectValueId"
                    >
                      {{ v.valueName }}
                    </option>
                  </select>
                  <button
                    type="button"
                    title="選択"
                    class="btn-icon btn-icon--select"
                    @click="openSelectModalObjectId = obj.htmlObjectId"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    :title="(ACTION_LABEL_BY_CATEGORY[obj.categoryCode] ?? obj.categoryName)"
                    :aria-label="(ACTION_LABEL_BY_CATEGORY[obj.categoryCode] ?? obj.categoryName)"
                    :aria-pressed="(obj.categoryCode === 'TEXT_PLACEMENT' && mapInteraction.editMode.value === 'text') || (obj.categoryCode === 'IMAGE_PLACEMENT' && mapInteraction.editMode.value === 'image')"
                    :class="[
                      'btn-icon btn-icon--select',
                      { 'order-detail-draw-btn--active': (obj.categoryCode === 'TEXT_PLACEMENT' && mapInteraction.editMode.value === 'text') || (obj.categoryCode === 'IMAGE_PLACEMENT' && mapInteraction.editMode.value === 'image') }
                    ]"
                    :disabled="obj.categoryCode === 'IMAGE_PLACEMENT' && (selectedValueIdByObjectId[obj.htmlObjectId] ?? SELECT_PLACEHOLDER_VALUE) === SELECT_PLACEHOLDER_VALUE"
                    @click="onActionButtonClick(obj)"
                  >
                    <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                    </svg>
                  </button>
                </div>
                <!-- 選択中の画像を表示（sampleImagePath がある場合） -->
                <div
                  v-if="getSelectedValue(obj)?.sampleImagePath"
                  class="order-detail-selected-image"
                >
                  <img
                    :src="getSelectedValue(obj)!.sampleImagePath!"
                    :alt="getSelectedValue(obj)!.valueName"
                  />
                  <span>{{ getSelectedValue(obj)?.valueName }}</span>
                </div>
                <HtmlObjectValueSelectModal
                  :key="`modal-${obj.htmlObjectId}`"
                  :model-value="openSelectModalObjectId === obj.htmlObjectId"
                  :title="obj.categoryName"
                  :items="obj.values"
                  @update:model-value="(v) => { if (!v) openSelectModalObjectId = null }"
                  @select="(v) => { selectedValueIdByObjectId[obj.htmlObjectId] = v.htmlObjectValueId; openSelectModalObjectId = null }"
                />
              </template>
              <!-- 子テーブルなし：テキスト入力＋配置ボタン -->
              <template v-else>
                <div class="order-detail-object-row">
                  <input
                    :value="inputTextByObjectId[obj.htmlObjectId] ?? ''"
                    type="text"
                    class="order-detail-object-input"
                    :placeholder="obj.categoryCode === 'BALLOON_PLACEMENT' ? '吹き出しテキストを入力してください' : 'テキストを入力してください'"
                    @input="(e) => { inputTextByObjectId[obj.htmlObjectId] = (e.target as HTMLInputElement).value }"
                  />
                  <button
                    type="button"
                    :title="ACTION_LABEL_BY_CATEGORY[obj.categoryCode] ?? obj.categoryName"
                    :aria-label="ACTION_LABEL_BY_CATEGORY[obj.categoryCode] ?? obj.categoryName"
                    :aria-pressed="(obj.categoryCode === 'TEXT_PLACEMENT' && mapInteraction.editMode.value === 'text') || (obj.categoryCode === 'BALLOON_PLACEMENT' && mapInteraction.editMode.value === 'balloon')"
                    :class="[
                      'btn-icon btn-icon--select',
                      { 'order-detail-draw-btn--active': (obj.categoryCode === 'TEXT_PLACEMENT' && mapInteraction.editMode.value === 'text') || (obj.categoryCode === 'BALLOON_PLACEMENT' && mapInteraction.editMode.value === 'balloon') }
                    ]"
                    @click="onActionButtonClick(obj)"
                  >
                    <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                    </svg>
                  </button>
                </div>
              </template>
            </div>
            <div class="order-detail-item-select-section">
              <div class="order-detail-item-select-header">
                <span class="form-label">アイテムを選択</span>
                <span class="order-detail-tooltip-icon" title="地図上のアイテムを選択・削除します">ⓘ</span>
              </div>
              <div class="order-detail-item-select-buttons">
                <button type="button" class="btn btn-small btn-secondary btn-secondary--slate">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.5 15.75h-1.5m-1.5 0h1.5m0-7.5h-1.5" />
                  </svg>
                  選択
                </button>
                <button type="button" class="btn btn-small btn-secondary">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  削除
                </button>
                <button
                  type="button"
                  class="btn btn-small btn-secondary"
                  title="直前の操作を元に戻す"
                  :disabled="!canUndo"
                  @click="onUndoLastAction"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  元に戻す
                </button>
              </div>
            </div>
          </div>
        </aside>
        <!-- 全画面編集用マップ：パン・ズーム・編集操作可能。designData で現在枝番のルート・テキスト・画像・吹き出しを表示 -->
        <div class="order-detail-fullscreen-map">
          <MapPreview
            ref="fullscreenMapRef"
            :center="mapCenter"
            :zoom="mapZoom"
            :api-key="mapTilerApiKey"
            :image-items="imageItemsForMap"
            :design-data="activeBranchDesignData"
            :emit-map-click="true"
            class="order-detail-map-fullscreen"
            @map-loaded="onFullscreenMapLoaded"
            @map-click="onFullscreenMapClick"
          />
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 必須項目未入力（検索時） -->
  <Teleport to="body">
    <div
      v-if="showOrderSearchValidationModal"
      class="form-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orderSearchValidationModalMessage"
    >
      <div class="form-dialog-overlay" @click="closeOrderSearchValidationModal"></div>
      <div class="form-dialog-content form-dialog-content--narrow">
        <div class="form-dialog-body" style="text-align: center">
          <p id="orderSearchValidationModalMessage">注文番号を入力してください</p>
        </div>
        <div class="form-dialog-footer form-dialog-footer--center">
          <button type="button" class="btn btn-primary" @click="closeOrderSearchValidationModal">
            OK
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 検索該当なし -->
  <Teleport to="body">
    <div
      v-if="showOrderSearchNoResultModal"
      class="form-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orderSearchNoResultModalMessage"
    >
      <div class="form-dialog-overlay" @click="closeOrderSearchNoResultModal"></div>
      <div class="form-dialog-content form-dialog-content--narrow">
        <div class="form-dialog-body" style="text-align: center">
          <p id="orderSearchNoResultModalMessage">該当データがありません</p>
        </div>
        <div class="form-dialog-footer form-dialog-footer--center">
          <button type="button" class="btn btn-primary" @click="closeOrderSearchNoResultModal">
            OK
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 注文番号変更時・画面初期化の確認 -->
  <Teleport to="body">
    <div
      v-if="showOrderNoResetConfirmModal"
      class="form-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orderNoResetConfirmModalTitle"
    >
      <div class="form-dialog-overlay" @click="closeOrderNoResetConfirmModal"></div>
      <div class="form-dialog-content form-dialog-content--narrow">
        <div class="form-dialog-header">
          <h3 id="orderNoResetConfirmModalTitle">画面初期化の確認</h3>
        </div>
        <div class="form-dialog-body">
          <p>注文番号が変更されています。検索時の値（{{ lastConfirmedOrderNo || '—' }}）に戻して画面を初期化しますか</p>
        </div>
        <div class="form-dialog-footer">
          <button type="button" class="btn btn-secondary" @click="closeOrderNoResetConfirmModal">
            キャンセル
          </button>
          <button type="button" class="btn btn-primary" @click="confirmOrderNoReset">
            OK
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 登録確認 -->
  <Teleport to="body">
    <div
      v-if="showRegisterConfirmModal"
      class="form-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registerConfirmModalTitle"
    >
      <div class="form-dialog-overlay" @click="closeRegisterConfirmModal"></div>
      <div class="form-dialog-content form-dialog-content--narrow">
        <div class="form-dialog-header">
          <h3 id="registerConfirmModalTitle">
            {{ pageMode === "edit" ? "更新の確認" : "登録の確認" }}
          </h3>
        </div>
        <div class="form-dialog-body">
          <p>
            {{ pageMode === "edit" ? "この内容で更新してよろしいですか" : "この内容で登録してよろしいですか" }}
          </p>
        </div>
        <div class="form-dialog-footer">
          <button type="button" class="btn btn-secondary" @click="closeRegisterConfirmModal">
            キャンセル
          </button>
          <button type="button" class="btn btn-primary" @click="confirmRegister">
            OK
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 登録結果 -->
  <Teleport to="body">
    <div
      v-if="showRegisterResultModal"
      class="form-dialog"
      style="z-index: 60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registerResultModalTitle"
    >
      <div class="form-dialog-overlay" @click="onRegisterResultModalOk"></div>
      <div class="form-dialog-content form-dialog-content--wide">
        <div class="form-dialog-header">
          <h3 id="registerResultModalTitle">処理結果</h3>
        </div>
        <div class="form-dialog-body">
          <p id="registerResultMessage">{{ registerResultMessage }}</p>
        </div>
        <div class="form-dialog-footer">
          <button type="button" class="btn btn-primary" @click="onRegisterResultModalOk">
            OK
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 注文番号選択（共通コンポーネント） -->
  <OrderNoSelectModal
    v-model="showOrderNoSelectModal"
    :items="orderListForSelect"
    :loading="isLoadingOrders"
    :error-message="fetchErrorMessage"
    @select="selectOrderFromList"
  />

  <!-- 注文詳細モーダル（共通コンポーネント。一覧APIの返却値を表示） -->
  <OrderDetailModal
    v-model="orderDetailModalOpen"
    :order="orderDetailForModal"
  />

  <!-- 枝番追加 -->
  <Teleport to="body">
    <div
      v-if="showBranchAddModal"
      class="form-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branchAddModalTitle"
    >
      <div class="form-dialog-overlay" @click="closeBranchAddModal"></div>
      <div class="form-dialog-content form-dialog-content--xs">
        <div class="form-dialog-header">
          <h3 id="branchAddModalTitle">枝番を追加</h3>
        </div>
        <form @submit.prevent="confirmBranchAdd" class="form-dialog-form">
          <div class="form-dialog-body form-dialog-body--form">
            <label :for="FORM_IDS.detail.branchNoAdd" class="form-label">枝番</label>
            <input
              :id="FORM_IDS.detail.branchNoAdd"
              ref="branchNoInputRef"
              v-model="branchAddInput"
              type="text"
              tabindex="1"
              class="form-input"
              style="width: 5rem"
              placeholder="例: 06"
              @keydown.escape="closeBranchAddModal"
            />
          </div>
          <div class="form-dialog-footer">
            <button type="button" tabindex="3" class="btn btn-secondary" @click="closeBranchAddModal">
              キャンセル
            </button>
            <button type="submit" tabindex="2" class="btn btn-primary">
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- 枝番切り替え確認（変更あり） -->
  <Teleport to="body">
    <div
      v-if="showBranchSwitchConfirmModal"
      class="form-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branchSwitchConfirmModalTitle"
    >
      <div class="form-dialog-overlay" @click="closeBranchSwitchConfirmModal(true)"></div>
      <div class="form-dialog-content form-dialog-content--wide">
        <div class="form-dialog-header">
          <h3 id="branchSwitchConfirmModalTitle">変更の確認</h3>
        </div>
        <div class="form-dialog-body">
          <p>{{ branchSwitchConfirmMessage }}</p>
        </div>
        <div class="form-dialog-footer">
          <button type="button" class="btn btn-secondary" @click="closeBranchSwitchConfirmModal(true)">
            キャンセル
          </button>
          <button type="button" class="btn btn-secondary btn-secondary--slate" @click="confirmBranchSwitchDiscard">
            {{ branchSwitchConfirmDiscardLabel }}
          </button>
          <button
            v-if="!hideBranchSwitchRegisterButton"
            type="button"
            class="btn btn-primary"
            @click="confirmBranchSwitchRegister"
          >
            {{ branchSwitchConfirmRegisterLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 既存枝番 -->
  <Teleport to="body">
    <div
      v-if="showBranchExistsModal"
      class="form-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branchExistsModalTitle"
    >
      <div class="form-dialog-overlay" @click="closeBranchExistsModal"></div>
      <div class="form-dialog-content form-dialog-content--narrow">
        <div class="form-dialog-header">
          <h3 id="branchExistsModalTitle">枝番</h3>
        </div>
        <div class="form-dialog-body">
          <p>既に存在する枝番です</p>
        </div>
        <div class="form-dialog-footer">
          <button type="button" class="btn btn-primary" @click="closeBranchExistsModal">
            OK
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 枝番削除確認 -->
  <Teleport to="body">
    <div
      v-if="showBranchDeleteModal"
      class="form-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branchDeleteModalTitle"
    >
      <div class="form-dialog-overlay" @click="closeBranchDeleteModal"></div>
      <div class="form-dialog-content form-dialog-content--narrow">
        <div class="form-dialog-header">
          <h3 id="branchDeleteModalTitle">枝番の削除</h3>
        </div>
        <div class="form-dialog-body">
          <p>枝番<span class="font-normal">{{ branchDeleteTargetNo }}</span>を削除しますか</p>
        </div>
        <div class="form-dialog-footer">
          <button type="button" class="btn btn-secondary" @click="closeBranchDeleteModal">
            キャンセル
          </button>
          <button type="button" class="btn btn-primary" @click="executeBranchDelete">
            OK
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
