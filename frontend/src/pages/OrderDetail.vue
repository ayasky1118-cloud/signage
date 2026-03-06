<script setup lang="ts">
/**
 * 看板編集ページ（order_detail.html モックの実装）
 * - 注文情報の表示・検索・選択
 * - 枝番タブ・追加・削除・備考・地図出力/読込
 * - 全画面編集オーバーレイ・登録/更新・各種モーダル
 */
import { ref, computed, watch, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import "../assets/styles/order-detail.css"
import { searchOrders, getOrderByNo, type OrderItem } from "../composables/useOrderApi"
import OrderNoSelectModal from "../components/OrderNoSelectModal.vue"

const router = useRouter()
const route = useRoute()

const MAX_BRANCH_DISPLAY = 10
const MAX_BRANCH_COUNT = 99

function getLoginCompanyId(): number {
  const v = import.meta.env.VITE_LOGIN_COMPANY_ID as string | undefined
  if (v != null && v !== "") {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return 1
}

function normalizeBranchNo(val: string): string {
  const s = (val ?? "").trim()
  if (!s) return ""
  return String(parseInt(s, 10) || s).padStart(2, "0")
}

function designTypeLabel(designType: string): string {
  return designType || "—"
}

/** 空白時は em dash で表示（注文詳細モーダルと合わせる） */
function orDash(val: string | undefined): string {
  return (val ?? "").trim() || "—"
}

/* ルートクエリ: 一覧から遷移時は orderNo, itemCode, mode=edit */
const cameFromList = computed(() => route.query.mode === "edit" && !!route.query.orderNo)
const initialOrderNo = computed(() => (route.query.orderNo as string) ?? "")
const initialItemCode = computed(() => (route.query.itemCode as string) ?? "")

/* 注文情報の開閉 */
const orderInfoExpanded = ref(true)

/* 注文番号・検索済み・表示用データ */
const inputOrderNo = ref("")
const hasSearched = ref(false)
const lastConfirmedOrderNo = ref("")
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

/* 注文番号は一覧から来た場合は読取専用 */
const orderNoReadOnly = computed(() => cameFromList.value)
const selectSearchDisabled = computed(() => cameFromList.value)

/* 枝番 */
const allBranches = ref<string[]>([])
const visibleStartIndex = ref(0)
const activeBranch = ref("")
const originalBranchNo = ref("")
const branchMemo = ref("")
const originalBranchMemo = ref("")
const lastAddedBranchNo = ref<string | null>(null)
const branchMemoByBranch = ref<Record<string, string>>({})

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

const isDirty = computed(() => {
  const curNo = normalizeBranchNo(activeBranch.value)
  const origNo = normalizeBranchNo(originalBranchNo.value)
  return (
    (inputOrderNo.value || "").trim() !== lastConfirmedOrderNo.value ||
    curNo !== origNo ||
    branchMemo.value !== originalBranchMemo.value
  )
})

function setOriginalBranchValues(no: string, memo: string) {
  originalBranchNo.value = no
  originalBranchMemo.value = memo
}

function branchExistsInOrder(branchNo: string): boolean {
  const n = normalizeBranchNo(branchNo)
  return allBranches.value.indexOf(n) >= 0
}

function ensureVisible(branchNo: string) {
  const n = normalizeBranchNo(branchNo)
  const idx = allBranches.value.indexOf(n)
  if (idx < 0) return
  const maxStart = Math.max(0, allBranches.value.length - MAX_BRANCH_DISPLAY)
  if (idx < visibleStartIndex.value) visibleStartIndex.value = Math.max(0, idx)
  else if (idx >= visibleStartIndex.value + MAX_BRANCH_DISPLAY)
    visibleStartIndex.value = Math.min(maxStart, idx - MAX_BRANCH_DISPLAY + 1)
}

/* 注文一覧（選択モーダル用） */
const orderListForSelect = ref<OrderItem[]>([])
const isLoadingOrders = ref(false)

async function loadOrderListForSelect() {
  isLoadingOrders.value = true
  try {
    const result = await searchOrders({
      companyId: getLoginCompanyId(),
      page: 1,
      perPage: 100,
    })
    orderListForSelect.value = result.items
  } catch {
    orderListForSelect.value = []
  } finally {
    isLoadingOrders.value = false
  }
}

/** 注文を1件取得して表示＋枝番を反映。枝番は search で取れた場合は branches、なければ [] */
async function applyOrderBySearch(orderNo: string) {
  const no = orderNo.trim()
  if (!no) return
  try {
    const result = await searchOrders({
      companyId: getLoginCompanyId(),
      orderNo: no,
      page: 1,
      perPage: 1,
    })
    if (result.items.length > 0) {
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
      if (branches.length > 0) {
        let initial = initialItemCode.value ? normalizeBranchNo(initialItemCode.value) : branches[0]
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
      return
    }
  } catch {
    /* ignore */
  }
  try {
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
    setOriginalBranchValues("", "")
    hasSearched.value = true
  } catch {
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
    allBranches.value = []
    activeBranch.value = ""
    branchMemo.value = ""
    setOriginalBranchValues("", "")
    hasSearched.value = false
  }
}

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
  setOriginalBranchValues("", "")
}

function performBranchSwitch(branchNo: string) {
  branchMemoByBranch.value[activeBranch.value] = branchMemo.value
  const next = normalizeBranchNo(branchNo)
  activeBranch.value = next
  branchMemo.value = branchMemoByBranch.value[next] ?? ""
  setOriginalBranchValues(next, branchMemo.value)
}

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

function slidePrevBranch() {
  if (visibleStartIndex.value <= 0) return
  visibleStartIndex.value = Math.max(0, visibleStartIndex.value - 1)
}

function slideNextBranch() {
  if (allBranches.value.length <= MAX_BRANCH_DISPLAY) return
  const maxStart = allBranches.value.length - MAX_BRANCH_DISPLAY
  if (visibleStartIndex.value >= maxStart) return
  visibleStartIndex.value = Math.min(maxStart, visibleStartIndex.value + 1)
}

/* 枝番入力（activeBranchDisplay）の変更時：存在すれば切り替え、なければ新規追加の可能性 */
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

/* モーダル: 検索バリデーション・登録確認・登録結果・注文選択・枝番追加・枝番切り替え確認・枝番存在・枝番削除 */
const showOrderSearchValidationModal = ref(false)
const showRegisterConfirmModal = ref(false)
const showRegisterResultModal = ref(false)
const registerResultMessage = ref("")
const showOrderNoSelectModal = ref(false)
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

type PendingAction =
  | { type: "branch"; branchNo: string }
  | { type: "applyBranchInput"; branchNo: string }
  | { type: "changeOrderNo"; orderNo: string }
  | { type: "addBranch" }
  | { type: "navigate"; url: string; labels: { message: string; discard: string; register: string } }
  | { type: "back"; labels: { message: string; discard: string; register: string } }
const pendingAction = ref<PendingAction | null>(null)

const pageMode = computed(() => (cameFromList.value ? "edit" : "register"))
const registerButtonLabel = computed(() => (pageMode.value === "edit" ? "更新" : "登録"))
const registerButtonDisabled = computed(
  () => (!cameFromList.value && !hasSearched.value) || (hasSearched.value && !hasBranches.value)
)

function openOrderSearchValidationModal() {
  showOrderSearchValidationModal.value = true
}

function openRegisterConfirmModal() {
  showRegisterConfirmModal.value = true
}

function openRegisterResultModal(message: string) {
  registerResultMessage.value = message
  showRegisterResultModal.value = true
}

function openOrderNoSelectModal() {
  loadOrderListForSelect().then(() => {
    showOrderNoSelectModal.value = true
  })
}

function openBranchAddModal() {
  branchAddInput.value = ""
  showBranchAddModal.value = true
}

function openBranchSwitchConfirmModal(action?: PendingAction | null) {
  if (action) pendingAction.value = action
  const pa = pendingAction.value
  const verb = pageMode.value === "edit" ? "更新して" : "登録して"
  let message = `変更が保存されていません。${verb}から枝番を切り替えますか？`
  let discard = "破棄して切り替え"
  let register = `${verb}切り替え`
  hideBranchSwitchRegisterButton.value = false
  if (pa?.type === "navigate" && pa.labels) {
    message = pa.labels.message
    discard = pa.labels.discard
    register = pa.labels.register
  } else if (pa?.type === "back" && pa.labels) {
    message = pa.labels.message
    discard = pa.labels.discard
    register = pa.labels.register
  } else if (pa?.type === "changeOrderNo") {
    message = "看板情報に変更があります。注文番号を変更しますか？変更は破棄されます。"
    discard = "破棄して変更"
    register = `${verb}変更`
    hideBranchSwitchRegisterButton.value = true
  } else if (pa?.type === "addBranch") {
    message = `変更が保存されていません。枝番を追加しますか？変更は破棄されます。`
    discard = "破棄して追加"
    register = `${verb}追加`
    hideBranchSwitchRegisterButton.value = true
  }
  branchSwitchConfirmMessage.value = message
  branchSwitchConfirmDiscardLabel.value = discard
  branchSwitchConfirmRegisterLabel.value = register
  showBranchSwitchConfirmModal.value = true
}

function openBranchExistsModal() {
  showBranchExistsModal.value = true
}

function openBranchDeleteModal(branchNo: string) {
  branchDeleteTargetNo.value = branchNo
  showBranchDeleteModal.value = true
}

function closeOrderSearchValidationModal() {
  showOrderSearchValidationModal.value = false
}

function closeRegisterConfirmModal() {
  showRegisterConfirmModal.value = false
}

function closeRegisterResultModal() {
  showRegisterResultModal.value = false
  switchToUpdateMode()
}

function switchToUpdateMode() {
  hasSearched.value = true
  pendingAction.value = null
}

function closeBranchAddModal() {
  branchAddInput.value = ""
  showBranchAddModal.value = false
}

function closeBranchSwitchConfirmModal(clearPending = true) {
  showBranchSwitchConfirmModal.value = false
  if (clearPending) pendingAction.value = null
}

function closeBranchExistsModal() {
  showBranchExistsModal.value = false
}

function closeBranchDeleteModal() {
  showBranchDeleteModal.value = false
  branchDeleteTargetNo.value = ""
}

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

function confirmSearch() {
  const no = inputOrderNo.value.trim()
  if (!no) {
    openOrderSearchValidationModal()
    return
  }
  applyOrderBySearch(no)
}

function confirmRegister() {
  closeRegisterConfirmModal()
  openRegisterResultModal(pageMode.value === "edit" ? "更新が完了しました。" : "登録が完了しました。")
}

function confirmBranchAdd() {
  const value = branchAddInput.value.trim()
  if (!value) {
    closeBranchAddModal()
    return
  }
  const branchNo = normalizeBranchNo(value)
  const exists = branchExistsInOrder(branchNo)
  if (!exists && allBranches.value.length >= MAX_BRANCH_COUNT) {
    closeBranchAddModal()
    return
  }
  if (!exists) {
    allBranches.value = [...allBranches.value, branchNo].sort()
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
  } else {
    ensureVisible(branchNo)
    switchToBranch(branchNo)
  }
  closeBranchAddModal()
}

function confirmBranchSwitchDiscard() {
  const pa = pendingAction.value
  if (!pa) {
    closeBranchSwitchConfirmModal()
    return
  }
  if (pa.type === "branch" && pa.branchNo) {
    closeBranchSwitchConfirmModal()
    pendingAction.value = null
    performBranchSwitch(pa.branchNo)
    return
  }
  if (pa.type === "navigate" && pa.url) {
    closeBranchSwitchConfirmModal()
    pendingAction.value = null
    router.push(pa.url)
    return
  }
  if (pa.type === "back") {
    closeBranchSwitchConfirmModal()
    pendingAction.value = null
    router.back()
    return
  }
  if (pa.type === "changeOrderNo" && pa.orderNo !== undefined) {
    closeBranchSwitchConfirmModal()
    inputOrderNo.value = pa.orderNo
    lastConfirmedOrderNo.value = pa.orderNo
    clearOrderInfoExceptOrderNo()
    applyOrderBySearch(pa.orderNo)
    pendingAction.value = null
    return
  }
  if (pa.type === "applyBranchInput" && pa.branchNo) {
    closeBranchSwitchConfirmModal()
    doApplyActiveBranchDisplayValue(pa.branchNo, true)
    pendingAction.value = null
    return
  }
  if (pa.type === "addBranch") {
    if (lastAddedBranchNo.value) {
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

function confirmBranchSwitchRegister() {
  closeBranchSwitchConfirmModal(false)
  openRegisterResultModal(pageMode.value === "edit" ? "更新が完了しました。" : "登録が完了しました。")
}

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

function executeBranchDelete() {
  const target = branchDeleteTargetNo.value
  if (!target) {
    closeBranchDeleteModal()
    return
  }
  const idx = allBranches.value.indexOf(target)
  if (idx >= 0) {
    allBranches.value = allBranches.value.filter((_, i) => i !== idx)
    if (target === lastAddedBranchNo.value) lastAddedBranchNo.value = null
  }
  if (allBranches.value.length > 0) {
    const wasActive = normalizeBranchNo(activeBranch.value) === target
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

function clickAddBranch() {
  if (allBranches.value.length > 0 && isDirty.value) {
    pendingAction.value = { type: "addBranch" }
    openBranchSwitchConfirmModal()
    return
  }
  openBranchAddModal()
}

function clickDeleteBranch() {
  const cur = normalizeBranchNo(activeBranch.value)
  if (!cur || !branchExistsInOrder(cur)) return
  openBranchDeleteModal(cur)
}

/* 戻る・メニューへ */
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
      message: `変更が保存されていません。${verb}から戻りますか？`,
      discard: "破棄して戻る",
      register: `${verb}戻る`,
    },
  }
  openBranchSwitchConfirmModal()
}

/* 全画面編集 */
const fullscreenEditVisible = ref(false)

function openFullscreenEdit() {
  fullscreenEditVisible.value = true
  document.body.style.overflow = "hidden"
}

function closeFullscreenEdit() {
  fullscreenEditVisible.value = false
  document.body.style.overflow = ""
}

/* 出力フォーマット */
const outputFormat = ref<"pdf" | "png" | "svg">("pdf")

function onPreview() {
  // TODO: 枝番のプレビュー表示
}

function onOutput() {
  // TODO: 枝番を選択フォーマットで出力
}

function onSvgOutput() {
  // TODO: 地図 SVG 出力
}

function onSvgLoad(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    // TODO: 枝番に SVG を読込・反映
  }
  reader.readAsText(file)
  input.value = ""
}

onMounted(() => {
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
</script>

<template>
  <main id="order-detail-page" class="max-w-6xl mx-auto py-12 px-8 bg-[#e2e8f0] text-slate-600 min-h-screen">
    <!-- ページタイトル + 詳細（注文番号・検索など） -->
    <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 overflow-hidden mb-8">
      <div class="bg-main px-8 py-4">
        <h2 class="text-base font-bold text-white tracking-tight">看板編集</h2>
      </div>
      <div class="px-6 pt-2 pb-6 md:px-8 md:pt-3 md:pb-7 min-w-0">
        <!-- 詳細（展開で表示）※注文一覧と同じスタイル -->
        <div>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200"
            :aria-expanded="orderInfoExpanded"
            @click="orderInfoExpanded = !orderInfoExpanded"
          >
            <span
              class="inline-flex transition-transform duration-200"
              :class="{ 'rotate-180': orderInfoExpanded }"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
            <span>詳細</span>
          </button>
          <div v-show="orderInfoExpanded" class="mt-4 space-y-4 min-w-0">
            <div class="grid grid-cols-1 md:[grid-template-columns:380px_minmax(0,1fr)_minmax(0,1fr)] gap-4 text-sm">
          <div class="space-y-1.5">
            <label class="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span class="bg-main text-white text-[10px] px-1.5 py-0.5 rounded">必須</span>
              注文番号
            </label>
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="inputOrderNo"
                type="text"
                placeholder="注文番号を入力してください"
                maxlength="20"
                :readonly="orderNoReadOnly"
                class="w-48 min-w-[12rem] h-[2.25rem] bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-xs box-border"
                :class="{
                  'bg-white border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue': !orderNoReadOnly,
                  'opacity-50 cursor-not-allowed pointer-events-none': orderNoReadOnly
                }"
              />
              <button
                type="button"
                title="選択"
                class="flex items-center justify-center h-[2.25rem] w-[2.25rem] shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-md shadow-slate-300/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                :disabled="selectSearchDisabled"
                @click="openOrderNoSelectModal"
              >
                <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                type="button"
                class="h-[2.25rem] px-6 py-2 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none shrink-0"
                :disabled="selectSearchDisabled"
                @click="confirmSearch"
              >
                検索
              </button>
            </div>
          </div>
          <div class="space-y-1 md:pl-6">
            <div class="text-xs text-slate-400 font-semibold">注文名 / 住所</div>
            <div class="text-slate-700 font-semibold text-sm">{{ orDash(orderDisplay.orderName) }}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">{{ orDash(orderDisplay.address) }}</div>
          </div>
          <div class="space-y-1 md:pl-6">
            <div class="text-xs text-slate-400 font-semibold">顧客名 / 担当者</div>
            <div class="text-slate-700 font-semibold text-sm">{{ orDash(orderDisplay.customerName) }}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">{{ orDash(orderDisplay.manager) }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-xs text-slate-400 font-semibold">デザイン種別 / テンプレート</div>
            <div class="text-slate-700 text-sm">{{ orDash(orderDisplay.designType) }}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">{{ orDash(orderDisplay.template) }}</div>
          </div>
          <div class="space-y-1 md:pl-6">
            <div class="text-xs text-slate-400 font-semibold">更新日 / 更新者</div>
            <div class="text-slate-700 font-semibold text-sm">{{ orDash(orderDisplay.updateDate) }}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">{{ orDash(orderDisplay.updater) }}</div>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 看板情報（検索済み時のみ表示） -->
    <section
      v-show="hasSearched"
      class="bg-white rounded-2xl card-shadow border border-slate-200/80 mb-8"
    >
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-1.5 h-6 bg-subBlue rounded-full"></div>
          <h3 class="text-base font-bold text-main tracking-tight">看板情報</h3>
        </div>
      </div>

      <div class="px-6 pt-5 pb-6 space-y-6">
        <!-- 枝番タブ -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-slate-500">枝番選択</span>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!hasBranches"
                @click="clickDeleteBranch"
              >
                削除
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 transition-all duration-200"
                @click="clickAddBranch"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                枝番を追加
              </button>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-show="hasBranches"
              type="button"
              class="inline-flex items-center justify-center p-1.5 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title="前の枝番へ"
              :disabled="!canSlidePrev"
              @click="slidePrevBranch"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div v-if="!hasBranches" class="text-sm text-slate-500 py-2">
              枝番情報がありません。枝番を追加してください
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <div
                v-for="b in visibleBranches"
                :key="b"
                class="branch-tab-item inline-flex rounded-xl overflow-hidden"
                :class="normalizeBranchNo(activeBranch) === b ? 'bg-main' : 'bg-slate-100 border border-slate-200/60'"
              >
                <button
                  type="button"
                  class="branch-tab px-3 py-1.5 rounded-xl text-xs transition-colors duration-200"
                  :class="
                    normalizeBranchNo(activeBranch) === b
                      ? 'text-white shadow-sm font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold'
                  "
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
              class="inline-flex items-center justify-center p-1.5 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title="次の枝番へ"
              :disabled="!canSlideNext"
              @click="slideNextBranch"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 枝番詳細フォーム（枝番あり時のみ） -->
        <div
          v-show="hasBranches"
          class="grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_1fr] gap-6"
        >
          <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span class="bg-main text-white text-[10px] px-1.5 py-0.5 rounded">必須</span>
                枝番
              </label>
              <div class="flex flex-wrap items-center gap-2">
                <input
                  v-model="activeBranch"
                  type="text"
                  maxlength="2"
                  class="w-16 px-4 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200 font-semibold"
                  placeholder="枝番"
                  @change="applyActiveBranchDisplayValue"
                  @keydown.enter.prevent="applyActiveBranchDisplayValue"
                />
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition-all duration-200"
                  @click="onSvgOutput"
                >
                  地図出力
                </button>
                <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition-all duration-200 cursor-pointer">
                  地図読込
                  <input type="file" accept=".svg" class="sr-only" @change="onSvgLoad" />
                </label>
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-500">テンプレートプレビュー</label>
              <div class="w-full h-[400px] bg-slate-100 border border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden">
                <span class="text-slate-400 text-sm">プレビュー</span>
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-500">備考</label>
              <textarea
                v-model="branchMemo"
                class="w-full min-h-[56px] max-h-24 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none resize-y"
                placeholder="その他、看板に関する補足事項を入力してください"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <span class="text-xs font-bold text-slate-500">レイアウト / マッププレビュー</span>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-main hover:bg-subBlue border border-transparent shadow-sm transition-all duration-200"
                  @click="openFullscreenEdit"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  全画面で編集・操作する
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition-all duration-200"
                  @click="onPreview"
                >
                  全体プレビュー
                </button>
                <div class="flex items-center gap-1.5">
                  <select
                    v-model="outputFormat"
                    class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none font-medium text-slate-700"
                  >
                    <option value="pdf">PDF</option>
                    <option value="png">PNG</option>
                    <option value="svg">SVG</option>
                  </select>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-main hover:bg-subBlue border border-transparent shadow-sm transition-all duration-200"
                    @click="onOutput"
                  >
                    出力
                  </button>
                </div>
              </div>
            </div>
            <div class="relative bg-slate-100 border border-dashed border-slate-300 rounded-xl aspect-square w-full flex items-center justify-center overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-br from-main/5 via-subBlue/5 to-slate-200/20 pointer-events-none"></div>
              <div class="relative z-10 text-center space-y-2">
                <div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-main text-white text-sm font-bold mb-1">A</div>
                <p class="text-sm font-semibold text-slate-700">ここに看板レイアウトのプレビューが入ります</p>
                <p class="text-xs text-slate-500">実装時は地図やレイアウト編集コンポーネントを埋め込んでください</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ボタン群 -->
    <div class="relative flex flex-col sm:flex-row items-center gap-4 pt-2 pb-4">
      <button
        type="button"
        class="sm:absolute sm:left-0 px-8 py-2.5 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200"
        @click="handleBackClick"
      >
        戻る
      </button>
      <div class="flex-1 flex justify-center">
        <button
          type="button"
          class="px-10 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-lg shadow-main/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          :disabled="registerButtonDisabled"
          @click="openRegisterConfirmModal"
        >
          {{ registerButtonLabel }}
        </button>
      </div>
    </div>
  </main>

  <!-- 全画面編集オーバーレイ -->
  <Teleport to="body">
    <div
      v-show="fullscreenEditVisible"
      class="fixed inset-0 z-50 flex flex-col bg-slate-100"
      aria-hidden="false"
    >
      <div class="flex flex-1 min-h-0 overflow-hidden">
        <aside class="w-[280px] min-w-[280px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div class="p-4 space-y-6">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-500">編集モード開始/終了</span>
                <span class="text-slate-400 cursor-help" title="編集を終了して通常画面に戻ります">ⓘ</span>
              </div>
              <button
                type="button"
                class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-main hover:bg-subBlue border border-transparent transition-all duration-200"
                @click="closeFullscreenEdit"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                閉じる
              </button>
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-500">ルート描画</span>
                <span class="text-slate-400 cursor-help" title="地図上に経路を描画します">ⓘ</span>
              </div>
              <input
                type="text"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none"
                placeholder="赤・実線"
                value="赤・実線"
              />
              <button type="button" class="w-full px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all duration-200">
                ルート描画
              </button>
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-500">テキスト配置</span>
                <span class="text-slate-400 cursor-help" title="地図上にテキストを配置します">ⓘ</span>
              </div>
              <input
                type="text"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none"
                placeholder="テキストを入力してください"
              />
              <button type="button" class="w-full px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all duration-200">
                テキスト追加モード
              </button>
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-500">画像配置</span>
                <span class="text-slate-400 cursor-help" title="地図上に画像を配置します">ⓘ</span>
              </div>
              <input
                type="text"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none"
                placeholder="信号機"
                value="信号機"
              />
              <button type="button" class="w-full px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all duration-200">
                画像追加モード
              </button>
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-500">吹き出し配置</span>
                <span class="text-slate-400 cursor-help" title="地図上に吹き出しを配置します">ⓘ</span>
              </div>
              <input
                type="text"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none"
                placeholder="吹き出しテキストを入力してください"
              />
              <button type="button" class="w-full px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all duration-200">
                吹き出し追加モード
              </button>
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-500">アイテム選択</span>
                <span class="text-slate-400 cursor-help" title="地図上のアイテムを選択・削除します">ⓘ</span>
              </div>
              <div class="flex gap-2">
                <button type="button" class="flex-1 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all duration-200">
                  アイテム選択モード
                </button>
                <button type="button" class="flex-1 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all duration-200">
                  選択アイテムの削除
                </button>
              </div>
            </div>
          </div>
        </aside>
        <div class="flex-1 min-w-0 relative bg-slate-200 flex items-center justify-center">
          <div class="text-center space-y-2">
            <div class="inline-flex justify-center w-12 h-12 rounded-full bg-main/20 text-main">
              <svg class="w-6 h-6 m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p class="text-sm font-semibold text-slate-600">マップ表示エリア</p>
            <p class="text-xs text-slate-500">実装時は MapLibre 等で地図を表示</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 必須項目未入力（検索時） -->
  <Teleport to="body">
    <div
      v-if="showOrderSearchValidationModal"
      class="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orderSearchValidationModalMessage"
    >
      <div class="fixed inset-0 bg-black/40" @click="closeOrderSearchValidationModal"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl card-shadow border border-slate-200/80 w-full max-w-md overflow-hidden">
          <div class="px-8 pt-8 pb-6 text-center">
            <p id="orderSearchValidationModalMessage" class="text-sm text-slate-600">注文番号を入力してください。</p>
          </div>
          <div class="px-8 py-5 flex flex-nowrap justify-center">
            <button
              type="button"
              class="px-8 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
              @click="closeOrderSearchValidationModal"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 登録確認 -->
  <Teleport to="body">
    <div
      v-if="showRegisterConfirmModal"
      class="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registerConfirmModalTitle"
    >
      <div class="fixed inset-0 bg-black/40" @click="closeRegisterConfirmModal"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-md overflow-hidden">
          <div class="px-6 py-3 bg-main">
            <h3 id="registerConfirmModalTitle" class="text-base font-bold text-white tracking-tight">
              {{ pageMode === "edit" ? "更新の確認" : "登録の確認" }}
            </h3>
          </div>
          <div class="px-8 py-6">
            <p class="text-sm text-slate-600">
              {{ pageMode === "edit" ? "この内容で更新してよろしいですか？" : "この内容で登録してよろしいですか？" }}
            </p>
          </div>
          <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end gap-3">
            <button
              type="button"
              class="px-6 py-2 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
              @click="closeRegisterConfirmModal"
            >
              キャンセル
            </button>
            <button
              type="button"
              class="px-6 py-2 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
              @click="confirmRegister"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 登録結果 -->
  <Teleport to="body">
    <div
      v-if="showRegisterResultModal"
      class="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registerResultModalTitle"
    >
      <div class="fixed inset-0 bg-black/40" @click="onRegisterResultModalOk"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-xl overflow-hidden">
          <div class="px-6 py-3 bg-main">
            <h3 id="registerResultModalTitle" class="text-base font-bold text-white tracking-tight">処理結果</h3>
          </div>
          <div class="px-8 py-6">
            <p id="registerResultMessage" class="text-sm text-slate-600">{{ registerResultMessage }}</p>
          </div>
          <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end">
            <button
              type="button"
              class="inline-flex justify-center items-center px-8 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
              @click="onRegisterResultModalOk"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 注文番号選択（共通コンポーネント） -->
  <OrderNoSelectModal
    v-model="showOrderNoSelectModal"
    :items="orderListForSelect"
    :loading="isLoadingOrders"
    @select="selectOrderFromList"
  />

  <!-- 枝番追加 -->
  <Teleport to="body">
    <div
      v-if="showBranchAddModal"
      class="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branchAddModalTitle"
    >
      <div class="fixed inset-0 bg-black/40" @click="closeBranchAddModal"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-md overflow-hidden">
          <div class="px-6 py-3 bg-main">
            <h3 id="branchAddModalTitle" class="text-base font-bold text-white tracking-tight">枝番を追加</h3>
          </div>
          <div class="px-8 py-6 space-y-4">
            <div class="space-y-1.5">
              <label for="branchNoInput" class="block text-xs font-bold text-slate-500">枝番</label>
              <input
                id="branchNoInput"
                v-model="branchAddInput"
                type="text"
                class="w-full px-4 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none transition-all duration-200"
                placeholder="例: 06"
                @keydown.enter.prevent="confirmBranchAdd"
                @keydown.escape="closeBranchAddModal"
              />
            </div>
          </div>
          <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end gap-3">
            <button
              type="button"
              class="px-6 py-2 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
              @click="closeBranchAddModal"
            >
              キャンセル
            </button>
            <button
              type="button"
              class="px-6 py-2 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
              @click="confirmBranchAdd"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 枝番切り替え確認（変更あり） -->
  <Teleport to="body">
    <div
      v-if="showBranchSwitchConfirmModal"
      class="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branchSwitchConfirmModalTitle"
    >
      <div class="fixed inset-0 bg-black/40" @click="closeBranchSwitchConfirmModal(true)"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-2xl overflow-hidden">
          <div class="px-6 py-3 bg-main">
            <h3 id="branchSwitchConfirmModalTitle" class="text-base font-bold text-white tracking-tight">変更の確認</h3>
          </div>
          <div class="px-8 py-6">
            <p class="text-sm text-slate-600">{{ branchSwitchConfirmMessage }}</p>
          </div>
          <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end gap-3">
            <button
              type="button"
              class="inline-flex justify-center items-center px-8 py-2.5 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
              @click="closeBranchSwitchConfirmModal(true)"
            >
              キャンセル
            </button>
            <button
              type="button"
              class="inline-flex justify-center items-center px-8 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-all duration-200 whitespace-nowrap"
              @click="confirmBranchSwitchDiscard"
            >
              {{ branchSwitchConfirmDiscardLabel }}
            </button>
            <button
              v-if="!hideBranchSwitchRegisterButton"
              type="button"
              class="inline-flex justify-center items-center px-8 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
              @click="confirmBranchSwitchRegister"
            >
              {{ branchSwitchConfirmRegisterLabel }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 既存枝番 -->
  <Teleport to="body">
    <div
      v-if="showBranchExistsModal"
      class="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branchExistsModalTitle"
    >
      <div class="fixed inset-0 bg-black/40" @click="closeBranchExistsModal"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-md overflow-hidden">
          <div class="px-6 py-3 bg-main">
            <h3 id="branchExistsModalTitle" class="text-base font-bold text-white tracking-tight">枝番</h3>
          </div>
          <div class="px-8 py-6">
            <p class="text-sm text-slate-600">既に存在する枝番です</p>
          </div>
          <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end">
            <button
              type="button"
              class="px-6 py-2 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
              @click="closeBranchExistsModal"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 枝番削除確認 -->
  <Teleport to="body">
    <div
      v-if="showBranchDeleteModal"
      class="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branchDeleteModalTitle"
    >
      <div class="fixed inset-0 bg-black/40" @click="closeBranchDeleteModal"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-md overflow-hidden">
          <div class="px-6 py-3 bg-main">
            <h3 id="branchDeleteModalTitle" class="text-base font-bold text-white tracking-tight">枝番の削除</h3>
          </div>
          <div class="px-8 py-6">
            <p class="text-sm text-slate-600">枝番<span class="font-semibold">{{ branchDeleteTargetNo }}</span>を削除しますか？</p>
          </div>
          <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end gap-3">
            <button
              type="button"
              class="px-6 py-2 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
              @click="closeBranchDeleteModal"
            >
              キャンセル
            </button>
            <button
              type="button"
              class="px-6 py-2 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
              @click="executeBranchDelete"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
