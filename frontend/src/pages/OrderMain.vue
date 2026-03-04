<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue"
import { RouterLink, useRouter, useRoute } from "vue-router"
import { validateAddress } from "../composables/useAddressApi"
import { searchOrders, type OrderItem } from "../composables/useOrderApi"
import { fetchCompanies, type CompanyItem } from "../composables/useCompanyApi"
import { fetchDesignTypes, type DesignTypeItem } from "../composables/useDesignTypeApi"

const router = useRouter()
const route = useRoute()

/* モード: 新規 / 変更 */
const mode = ref<"new" | "change">("new")
const cameFromList = ref(false)
const hasSearchedInChangeMode = ref(false)

/* フォーム */
const orderNo = ref("")
const orderName = ref("")
const address = ref("")
const companyId = ref<number | null>(null)
const companyName = ref("")
const manager = ref("")
const templateValue = ref("")
const designTypeId = ref<number | null>(null)
const templateItemValues = ref<string[]>([])

/* テンプレート選択肢（モック同様） */
const TEMPLATE_OPTIONS = [
  { value: "", label: "レイアウトテンプレートを選択してください" },
  { value: "template-1", label: "テンプレート①" },
  { value: "template-2", label: "テンプレート②" },
  { value: "template-3", label: "テンプレート③" },
  { value: "template-4", label: "テンプレート④" },
  { value: "template-5", label: "テンプレート⑤" },
  { value: "template-6", label: "テンプレート⑥" },
  { value: "template-7", label: "テンプレート⑦" },
  { value: "template-8", label: "テンプレート⑧" },
  { value: "template-9", label: "テンプレート⑨" },
  { value: "template-10", label: "テンプレート⑩" },
] as const

/* デザイン種別（会社選択後にAPIで取得） */
const designTypeOptions = ref<DesignTypeItem[]>([])
const isLoadingDesignTypes = ref(false)

/* テンプレートごとの項目ラベル（モック同様） */
const TEMPLATE_ITEMS_MAP: Record<string, string[]> = {
  "template-1": ["項目①", "項目②", "項目③"],
  "template-2": ["項目①", "項目②", "項目③", "項目④"],
  "template-3": ["項目①", "項目②", "項目③"],
  "template-4": ["項目①", "項目②", "項目③", "項目④", "項目⑤"],
  "template-5": ["項目①", "項目②", "項目③"],
  "template-6": ["項目①", "項目②", "項目③", "項目④"],
  "template-7": ["項目①", "項目②", "項目③"],
  "template-8": ["項目①", "項目②", "項目③", "項目④", "項目⑤"],
  "template-9": ["項目①", "項目②", "項目③"],
  "template-10": ["項目①", "項目②", "項目③", "項目④"],
}

const templateItemLabels = computed(() => TEMPLATE_ITEMS_MAP[templateValue.value] ?? [])
const showTemplateItemsSection = computed(() => templateItemLabels.value.length > 0)

/* テンプレート変更時に項目数を合わせる */
watch(templateValue, (val) => {
  const labels = TEMPLATE_ITEMS_MAP[val] ?? []
  templateItemValues.value = labels.map((_, i) => templateItemValues.value[i] ?? "")
})

/* 変更モード時：他項目の編集可否 */
const otherFieldsDisabled = computed(
  () => mode.value === "change" && !hasSearchedInChangeMode.value
)

const orderNoReadOnly = computed(
  () => mode.value !== "change" || cameFromList.value
)

const orderNoPlaceholder = computed(() =>
  mode.value === "change" ? "注文番号を入力してください" : "新規作成時は自動で採番されます"
)

const searchAndListDisabled = computed(() => !(mode.value === "change" && !cameFromList.value))

const companySelectDisabled = computed(() => mode.value === "change")

const templateDisabled = computed(() => {
  if (mode.value === "change") return !hasSearchedInChangeMode.value && !cameFromList.value
  return !companyName.value.trim()
})

const registerButtonLabel = computed(() => (mode.value === "change" ? "更新" : "登録"))

const registerButtonDisabled = computed(
  () =>
    isValidatingAddress.value ||
    (mode.value === "change" &&
      !cameFromList.value &&
      !hasSearchedInChangeMode.value)
)

const orderDetailLinkDisabled = computed(
  () => !(mode.value === "change" && hasSearchedInChangeMode.value)
)

/* 新規モードでラジオを無効化（一覧から遷移時） */
const newModeRadioDisabled = computed(() => cameFromList.value)

/* フォーム状態（未保存変更判定用） */
function getFormState(): string {
  return [
    orderNo.value.trim(),
    orderName.value.trim(),
    address.value.trim(),
    companyName.value.trim(),
    manager.value.trim(),
    templateValue.value.trim(),
    designTypeId.value ?? "",
    templateItemValues.value.join(","),
  ].join("|")
}

const initialNewState = ref("")
const initialChangeState = ref("")

const hasUnsavedChanges = computed(() => {
  const current = getFormState()
  if (mode.value === "new") return current !== initialNewState.value
  return current !== initialChangeState.value
})

/* 注文番号選択モーダル用 */
const orderListForSelect = ref<OrderItem[]>([])
const orderNoSelectModalOpen = ref(false)
const isLoadingOrders = ref(false)

/* 会社選択モーダル用 */
const companyListForSelect = ref<CompanyItem[]>([])
const companySelectModalOpen = ref(false)
const isLoadingCompanies = ref(false)

/* テンプレート選択モーダル（グリッド） */
const templateSelectModalOpen = ref(false)

/* 各種確認モーダル */
const unsavedConfirmOpen = ref(false)
const unsavedConfirmMessage = ref("入力内容に変更があります。変更は破棄されます。よろしいですか？")
const unsavedConfirmOkText = ref("破棄する")
const pendingUnsavedAction = ref<(() => void) | null>(null)

const changeNoticeModalOpen = ref(false)

const requiredValidationOpen = ref(false)
const requiredValidationMessage = ref("必須項目が未入力です。")
/** 必須エラー時にフォーカスする要素の ref 名 */
const requiredValidationFocusRef = ref<string | null>(null)

/* フォーカス用テンプレート ref */
const orderNoInputRef = ref<HTMLInputElement | null>(null)
const orderNoSearchBtnRef = ref<HTMLButtonElement | null>(null)
const orderNameInputRef = ref<HTMLInputElement | null>(null)
const addressInputRef = ref<HTMLInputElement | null>(null)
const companySelectBtnRef = ref<HTMLButtonElement | null>(null)
const templateSelectRef = ref<HTMLSelectElement | null>(null)
const designTypeSelectRef = ref<HTMLSelectElement | null>(null)

const registerConfirmOpen = ref(false)
const registerConfirmTitle = ref("登録の確認")
const registerConfirmMessage = ref("この内容で登録してよろしいですか？")

const registerResultOpen = ref(false)
const registerResultMessage = ref("登録が完了しました。")

/** 住所検証API実行中（登録ボタン押下時） */
const isValidatingAddress = ref(false)

/* デザイン種別表示名（APIで名称を返すためそのまま表示） */
function designTypeLabel(v: string): string {
  return v || "—"
}

/* 注文データをフォームに反映 */
function applyOrderData(order: OrderItem) {
  orderNo.value = order.orderNo ?? ""
  orderName.value = order.orderName ?? ""
  address.value = order.address ?? ""
  companyId.value = order.companyId ?? null
  companyName.value = order.companyName ?? ""
  manager.value = order.manager ?? ""
  designTypeId.value = order.designTypeId ?? null
  if (order.companyId && designTypeOptions.value.length === 0) {
    loadDesignTypes(order.companyId)
  }
  const nameToVal: Record<string, string> = {
    "テンプレート①": "template-1",
    "テンプレート②": "template-2",
    "テンプレート③": "template-3",
    "テンプレート④": "template-4",
    "テンプレート⑤": "template-5",
    "テンプレート⑥": "template-6",
    "テンプレート⑦": "template-7",
    "テンプレート⑧": "template-8",
    "テンプレート⑨": "template-9",
    "テンプレート⑩": "template-10",
  }
  templateValue.value = nameToVal[order.template ?? ""] ?? ""
  initialChangeState.value = getFormState()
}

/* 会社データをフォームに反映 */
function applyCompanyData(c: CompanyItem) {
  companyId.value = c.companyId
  companyName.value = c.companyName
  manager.value = "" // 担当者は別入力のためクリア可
  designTypeId.value = null
  designTypeOptions.value = []
  if (c.companyId) loadDesignTypes(c.companyId)
}

async function loadDesignTypes(companyId: number) {
  isLoadingDesignTypes.value = true
  try {
    designTypeOptions.value = await fetchDesignTypes(companyId)
  } catch {
    designTypeOptions.value = []
  } finally {
    isLoadingDesignTypes.value = false
  }
}

function clearCompany() {
  companyId.value = null
  companyName.value = ""
  manager.value = ""
  designTypeId.value = null
  designTypeOptions.value = []
  templateValue.value = ""
  templateItemValues.value = []
}

/* 注文番号変更時（変更モード）他項目クリア */
function clearOtherFieldsOnOrderNoChange() {
  if (mode.value !== "change") return
  orderName.value = ""
  address.value = ""
  companyName.value = ""
  companyId.value = null
  manager.value = ""
  designTypeId.value = null
  templateValue.value = ""
  templateItemValues.value = []
  hasSearchedInChangeMode.value = false
}

/* 注文番号選択モーダルを開く → APIで一覧取得 */
async function openOrderNoSelectModal() {
  orderNoSelectModalOpen.value = true
  if (orderListForSelect.value.length === 0) {
    isLoadingOrders.value = true
    try {
      const result = await searchOrders({ perPage: 50, page: 1 })
      orderListForSelect.value = result.items
    } catch {
      orderListForSelect.value = []
    } finally {
      isLoadingOrders.value = false
    }
  }
}

function selectOrderNo(order: OrderItem) {
  orderNo.value = order.orderNo ?? ""
  clearOtherFieldsOnOrderNoChange()
  orderNoSelectModalOpen.value = false
}

/* 検索ボタン：注文番号で検索してフォームに反映 */
async function doSearchByOrderNo() {
  const no = orderNo.value.trim()
  if (!no) {
    requiredValidationMessage.value = "「注文番号」を選択してください。"
    requiredValidationFocusRef.value = "orderNoSearch"
    requiredValidationOpen.value = true
    return
  }
  try {
    const result = await searchOrders({ orderNo: no, perPage: 1 })
    const order = result.items[0]
    if (order) {
      applyOrderData(order)
      hasSearchedInChangeMode.value = true
    } else {
      requiredValidationMessage.value = "該当する注文が見つかりませんでした。"
      requiredValidationOpen.value = true
    }
  } catch {
    requiredValidationMessage.value = "該当する注文が見つかりませんでした。"
    requiredValidationOpen.value = true
  }
}

/* 会社選択モーダルを開く */
async function openCompanySelectModal() {
  companySelectModalOpen.value = true
  if (companyListForSelect.value.length === 0) {
    isLoadingCompanies.value = true
    try {
      companyListForSelect.value = await fetchCompanies()
    } catch {
      companyListForSelect.value = []
    } finally {
      isLoadingCompanies.value = false
    }
  }
}

function selectCompany(c: CompanyItem) {
  applyCompanyData(c)
  templateValue.value = ""
  templateItemValues.value = []
  companySelectModalOpen.value = false
}

function selectTemplateFromModal(val: string) {
  templateValue.value = val
  templateSelectModalOpen.value = false
}

/* 必須バリデーション（フォーカス用の ref 名を返す） */
function validateRequired(): { valid: boolean; message: string; focusRef?: string } {
  if (mode.value === "change" && !orderNo.value.trim()) {
    return { valid: false, message: "「注文番号」を選択してください。", focusRef: "orderNoSearch" }
  }
  if (!orderName.value.trim()) return { valid: false, message: "「注文名」を入力してください。", focusRef: "orderName" }
  if (!address.value.trim()) return { valid: false, message: "「住所」を入力してください。", focusRef: "address" }
  if (!companyName.value.trim()) return { valid: false, message: "「会社名」を選択してください。", focusRef: "companySelect" }
  if (!templateValue.value.trim()) return { valid: false, message: "「テンプレート」を選択してください。", focusRef: "template" }
  if (designTypeId.value == null) return { valid: false, message: "「デザイン種別」を選択してください。", focusRef: "designType" }
  return { valid: true, message: "" }
}

function getFocusElement(key: string | null | undefined): HTMLElement | null {
  if (!key) return null
  switch (key) {
    case "orderNoSearch":
      return (orderNoSearchBtnRef.value ?? orderNoInputRef.value) as HTMLElement | null
    case "orderName":
      return orderNameInputRef.value
    case "address":
      return addressInputRef.value
    case "companySelect":
      return companySelectBtnRef.value
    case "template":
      return templateSelectRef.value
    case "designType":
      return designTypeSelectRef.value
    default:
      return null
  }
}

function focusValidationTarget(key: string | null | undefined) {
  const el = getFocusElement(key)
  if (!el) return
  el.scrollIntoView({ behavior: "auto", block: "nearest" })
  el.focus()
}

function closeRequiredValidationModal() {
  const focusKey = requiredValidationFocusRef.value
  requiredValidationFocusRef.value = null
  requiredValidationOpen.value = false
  nextTick(() => {
    focusValidationTarget(focusKey)
  })
}

async function openRegisterConfirm() {
  const result = validateRequired()
  if (!result.valid) {
    requiredValidationMessage.value = result.message
    requiredValidationFocusRef.value = result.focusRef ?? null
    requiredValidationOpen.value = true
    return
  }
  isValidatingAddress.value = true
  try {
    const addressResult = await validateAddress(address.value)
    if (addressResult.valid !== true) {
      requiredValidationMessage.value = addressResult.message ?? "住所を正しく入力してください。"
      requiredValidationFocusRef.value = "address"
      requiredValidationOpen.value = true
      return
    }
  } catch (_e) {
    requiredValidationMessage.value = "住所の検証中にエラーが発生しました。"
    requiredValidationFocusRef.value = "address"
    requiredValidationOpen.value = true
    return
  } finally {
    isValidatingAddress.value = false
  }
  registerConfirmTitle.value = mode.value === "change" ? "更新の確認" : "登録の確認"
  registerConfirmMessage.value =
    mode.value === "change" ? "この内容で更新してよろしいですか？" : "この内容で登録してよろしいですか？"
  registerConfirmOpen.value = true
}

function doRegisterConfirm() {
  registerConfirmOpen.value = false
  registerResultMessage.value = mode.value === "change" ? "更新が完了しました。" : "登録が完了しました。"
  registerResultOpen.value = true
}

/* 看板情報入力へのリンク（変更モード・検索済み時） */
const orderDetailTo = computed(() => {
  if (!orderDetailLinkDisabled.value && orderNo.value) {
    return {
      path: "/order/detail",
      query: { orderNo: orderNo.value, itemCode: "01", mode: "edit" },
    }
  }
  return { path: "/order/detail" }
})

/* 戻る */
function goBack() {
  if (hasUnsavedChanges.value) {
    unsavedConfirmMessage.value = "入力内容に変更があります。変更は破棄されます。戻ってよろしいですか？"
    unsavedConfirmOkText.value = "破棄して戻る"
    pendingUnsavedAction.value = () => router.back()
    unsavedConfirmOpen.value = true
  } else {
    router.back()
  }
}

function executePendingUnsaved() {
  const fn = pendingUnsavedAction.value
  pendingUnsavedAction.value = null
  unsavedConfirmOpen.value = false
  if (fn) fn()
}

/* 新規→変更で入力変更あり（ラジオはすでに変更になっているので新規に戻す） */
function onModeChangeToChange() {
  if (getFormState() !== initialNewState.value) {
    changeNoticeModalOpen.value = true
    mode.value = "new" // モーダル表示中は新規のまま
  }
}

function changeNoticeDiscard() {
  orderNo.value = ""
  orderName.value = ""
  address.value = ""
  companyName.value = ""
  companyId.value = null
  manager.value = ""
  designTypeId.value = null
  templateValue.value = ""
  templateItemValues.value = []
  initialNewState.value = getFormState()
  initialChangeState.value = getFormState()
  mode.value = "change"
  hasSearchedInChangeMode.value = false
  changeNoticeModalOpen.value = false
}

function changeNoticeRegister() {
  changeNoticeModalOpen.value = false
  openRegisterConfirm()
}

/* 変更→新規で未保存変更あり（ラジオはすでに新規になっているので、確認時は変更に戻す） */
function onModeChangeToNew() {
  if (getFormState() !== initialChangeState.value) {
    unsavedConfirmMessage.value = "入力内容に変更があります。新規に切り替えますか？変更は破棄されます。"
    unsavedConfirmOkText.value = "破棄して新規へ"
    pendingUnsavedAction.value = () => {
      orderNo.value = ""
      orderName.value = ""
      address.value = ""
      companyName.value = ""
      companyId.value = null
      manager.value = ""
      designTypeId.value = null
      templateValue.value = ""
      templateItemValues.value = []
      initialNewState.value = getFormState()
      initialChangeState.value = getFormState()
      mode.value = "new"
      hasSearchedInChangeMode.value = false
    }
    unsavedConfirmOpen.value = true
    mode.value = "change" // モーダル表示中は変更のまま
  } else {
    orderNo.value = ""
    orderName.value = ""
    address.value = ""
    companyName.value = ""
    companyId.value = null
    manager.value = ""
    designTypeId.value = null
    templateValue.value = ""
    templateItemValues.value = []
    initialNewState.value = getFormState()
    initialChangeState.value = getFormState()
    mode.value = "new"
  }
}

/* リンククリック時：未保存変更があれば確認 */
function handleOrderDetailClick(e: MouseEvent) {
  if (orderDetailLinkDisabled.value) {
    e.preventDefault()
    return
  }
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    unsavedConfirmMessage.value = "入力内容に変更があります。変更は破棄されます。移動してよろしいですか？"
    unsavedConfirmOkText.value = "破棄して移動する"
    pendingUnsavedAction.value = () => router.push(orderDetailTo.value)
    unsavedConfirmOpen.value = true
  }
}

/* 初期化：URL パラメータ */
onMounted(async () => {
  const q = route.query
  if (q.mode === "edit" || q.orderNo) {
    cameFromList.value = true
    hasSearchedInChangeMode.value = true
    mode.value = "change"
    const no = (q.orderNo as string)?.trim()
    if (no) {
      orderNo.value = no
      try {
        const result = await searchOrders({ orderNo: no, perPage: 1 })
        const order = result.items[0]
        if (order) {
          applyOrderData(order)
        }
      } catch {
        // 注文番号だけ入れておく
      }
    }
  }
  initialNewState.value = getFormState()
  initialChangeState.value = getFormState()
})

/* 注文番号入力変更時（変更モード） */
watch(orderNo, () => {
  if (mode.value === "change") clearOtherFieldsOnOrderNoChange()
})
</script>

<template>
  <main id="order-main-page" class="max-w-5xl mx-auto py-12 px-8">
    <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 overflow-hidden">
      <div class="bg-main px-8 py-4">
        <h2 class="text-base font-bold text-white tracking-tight">注文情報入力 / 変更</h2>
      </div>

      <form class="pt-5 px-10 pb-10 space-y-4" @submit.prevent>
        <div>
          <div class="pb-4 border-b border-slate-100">
            <div class="inline-flex rounded-lg border border-slate-300 overflow-hidden bg-slate-100 min-w-[11rem] mode-radio-group">
              <label
                class="cursor-pointer flex-1 min-w-[5rem] mode-radio-label"
                :class="{ 'pointer-events-none opacity-60': newModeRadioDisabled }"
              >
                <input
                  v-model="mode"
                  type="radio"
                  name="mode"
                  value="new"
                  class="sr-only peer"
                  :disabled="newModeRadioDisabled"
                  @change="onModeChangeToNew"
                />
                <span class="block w-full px-5 py-2 text-center text-xs font-bold transition-colors bg-slate-100 text-slate-600 hover:bg-slate-50 border-r border-slate-200 whitespace-nowrap peer-checked:bg-main peer-checked:text-white peer-checked:border-slate-200/40">新規</span>
              </label>
              <label class="cursor-pointer flex-1 min-w-[5rem] mode-radio-label">
                <input v-model="mode" type="radio" name="mode" value="change" class="sr-only peer" @change="onModeChangeToChange" />
                <span class="block w-full px-5 py-2 text-center text-xs font-semibold transition-colors bg-slate-100 text-slate-600 hover:bg-slate-50 peer-checked:bg-main peer-checked:text-white whitespace-nowrap">変更</span>
              </label>
            </div>
          </div>

          <section class="space-y-5 pt-4">
            <div class="flex items-center gap-2 mb-2 text-main">
              <div class="w-1.5 h-6 bg-subBlue rounded-full"></div>
              <h3 class="font-bold text-base tracking-tight">注文情報</h3>
            </div>
            <div class="grid grid-cols-1 gap-5">
              <div class="space-y-2.5">
                <label class="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span class="bg-main text-white text-[10px] px-1.5 py-0.5 rounded">必須</span>
                  注文番号
                </label>
                <div class="flex flex-wrap gap-2">
                  <input
                    ref="orderNoInputRef"
                    v-model="orderNo"
                    type="text"
                    :readonly="orderNoReadOnly"
                    :placeholder="orderNoPlaceholder"
                    class="w-1/3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-xs"
                    :class="{
                      'bg-white border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue': !orderNoReadOnly,
                      'opacity-50 cursor-not-allowed pointer-events-none': orderNoReadOnly
                    }"
                  />
                  <button
                    type="button"
                    class="px-8 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold shadow-md shadow-slate-300/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                    :disabled="searchAndListDisabled"
                    @click="openOrderNoSelectModal"
                  >
                    選択
                  </button>
                  <button
                    ref="orderNoSearchBtnRef"
                    type="button"
                    class="px-8 py-2 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                    :disabled="searchAndListDisabled"
                    @click="doSearchByOrderNo"
                  >
                    検索
                  </button>
                </div>
              </div>
            </div>

            <div class="space-y-2.5">
              <label class="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span class="bg-main text-white text-[10px] px-1.5 py-0.5 rounded">必須</span>
                注文名
              </label>
              <input
                ref="orderNameInputRef"
                v-model="orderName"
                type="text"
                placeholder="注文名を入力してください"
                class="w-full px-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-200 disabled:cursor-not-allowed"
                :disabled="otherFieldsDisabled"
              />
            </div>

            <div class="space-y-2.5">
              <label class="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span class="bg-main text-white text-[10px] px-1.5 py-0.5 rounded">必須</span>
                住所
              </label>
              <input
                ref="addressInputRef"
                v-model="address"
                type="text"
                placeholder="例: サンプル県サンプル市サンプル区サンプル町1-1-1"
                class="w-full px-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-200 disabled:cursor-not-allowed"
                :disabled="otherFieldsDisabled"
              />
            </div>
          </section>
        </div>

        <section>
          <div class="grid grid-cols-1 gap-5">
            <div class="space-y-2.5">
              <div class="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                <div class="space-y-2.5 sm:flex-[2]">
                  <label class="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <span class="bg-main text-white text-[10px] px-1.5 py-0.5 rounded">必須</span>
                    会社名
                  </label>
                  <div class="flex items-end gap-2">
                    <input
                      v-model="companyName"
                      type="text"
                      readonly
                      placeholder="会社名を選択してください"
                      class="flex-1 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="otherFieldsDisabled"
                    />
                    <button
                      ref="companySelectBtnRef"
                      type="button"
                      class="px-8 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold shadow-md shadow-slate-300/60 transition-all duration-200 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                      :disabled="companySelectDisabled"
                      @click="openCompanySelectModal"
                    >
                      選択
                    </button>
                  </div>
                </div>
                <div class="space-y-2.5 sm:flex-1">
                  <label class="text-xs font-bold text-slate-500">担当者名</label>
                  <input
                    v-model="manager"
                    type="text"
                    placeholder="担当者を入力してください"
                    class="w-full px-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue focus:border-subBlue outline-none transition-all duration-200 disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-200 disabled:cursor-not-allowed"
                    :disabled="otherFieldsDisabled"
                  />
                </div>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div class="space-y-2.5 sm:flex-[2]">
                <label class="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span class="bg-main text-white text-[10px] px-1.5 py-0.5 rounded">必須</span>
                  テンプレート
                </label>
                <div class="flex gap-2">
                  <select
                    ref="templateSelectRef"
                    v-model="templateValue"
                    class="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-200 disabled:cursor-not-allowed"
                    :disabled="templateDisabled"
                  >
                    <option v-for="opt in TEMPLATE_OPTIONS" :key="opt.value || 'empty'" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <button
                    type="button"
                    class="px-8 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold shadow-md shadow-slate-300/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                    :disabled="templateDisabled"
                    @click="templateSelectModalOpen = true"
                  >
                    選択
                  </button>
                </div>
              </div>
              <div class="space-y-2.5 sm:flex-1">
                <label class="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span class="bg-main text-white text-[10px] px-1.5 py-0.5 rounded">必須</span>
                  デザイン種別
                </label>
                <select
                  ref="designTypeSelectRef"
                  v-model="designTypeId"
                  class="w-full px-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-200 disabled:cursor-not-allowed"
                  :disabled="otherFieldsDisabled || isLoadingDesignTypes"
                >
                  <option :value="null">
                    {{ isLoadingDesignTypes ? "読み込み中..." : "デザイン種別を選択してください" }}
                  </option>
                  <option
                    v-for="opt in designTypeOptions"
                    :key="opt.designTypeId"
                    :value="opt.designTypeId"
                  >
                    {{ opt.designTypeName }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section v-show="showTemplateItemsSection" class="mt-4">
          <div class="border-t border-slate-100 pt-5">
            <div class="flex items-center gap-2 mb-3 text-main">
              <div class="w-1.5 h-6 bg-subBlue rounded-full"></div>
              <h3 class="font-bold text-base tracking-tight">テンプレート項目</h3>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_1fr] gap-6">
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-slate-500">テンプレートプレビュー</label>
                <div class="w-full h-[400px] bg-slate-100 border border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden">
                  <span class="text-slate-400 text-xs">プレビュー</span>
                </div>
              </div>
              <div class="space-y-4">
                <div
                  v-for="(label, idx) in templateItemLabels"
                  :key="idx"
                  class="space-y-2.5"
                >
                  <label class="text-xs font-bold text-slate-500">{{ label }}</label>
                  <input
                    v-model="templateItemValues[idx]"
                    type="text"
                    class="w-full px-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-offset-2 focus:ring-lightBlue outline-none disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-200 disabled:cursor-not-allowed"
                    :disabled="otherFieldsDisabled"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </form>
    </div>

    <div class="mt-8 flex items-center gap-4">
      <div class="flex-1">
        <button
          type="button"
          class="inline-block px-8 py-2.5 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200"
          @click="goBack"
        >
          戻る
        </button>
      </div>
      <div class="flex-1 text-center">
        <button
          type="button"
          class="px-10 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-lg shadow-main/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          :disabled="registerButtonDisabled"
          @click="openRegisterConfirm"
        >
          {{ isValidatingAddress ? "住所を確認中..." : registerButtonLabel }}
        </button>
      </div>
      <div class="flex-1 text-right">
        <RouterLink
          :to="orderDetailTo"
          class="inline-block px-10 py-2.5 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 disabled:opacity-50 cursor-not-allowed pointer-events-none"
          :class="{ 'opacity-50 cursor-not-allowed pointer-events-none': orderDetailLinkDisabled }"
          @click="handleOrderDetailClick"
        >
          看板情報入力
        </RouterLink>
      </div>
    </div>

    <!-- 未保存変更確認モーダル -->
    <Teleport to="body">
      <div v-show="unsavedConfirmOpen" class="fixed inset-0 z-50" aria-hidden="false">
        <div class="fixed inset-0 bg-black/40" @click="pendingUnsavedAction = null; unsavedConfirmOpen = false"></div>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-xl overflow-hidden">
            <div class="px-6 py-3 bg-main">
              <h3 class="text-base font-bold text-white tracking-tight">変更の確認</h3>
            </div>
            <div class="px-8 py-6">
              <p class="text-sm text-slate-600">{{ unsavedConfirmMessage }}</p>
            </div>
            <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end gap-3">
              <button
                type="button"
                class="px-8 py-2.5 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
                @click="pendingUnsavedAction = null; unsavedConfirmOpen = false"
              >
                キャンセル
              </button>
              <button
                type="button"
                class="px-8 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
                @click="executePendingUnsaved"
              >
                {{ unsavedConfirmOkText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 注文番号選択モーダル -->
    <Teleport to="body">
      <div v-show="orderNoSelectModalOpen" class="fixed inset-0 z-50" aria-hidden="false">
        <div class="fixed inset-0 bg-black/40" @click="orderNoSelectModalOpen = false"></div>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-2xl overflow-hidden">
            <div class="px-6 py-3 bg-main">
              <h3 class="text-base font-bold text-white tracking-tight">注文番号を選択</h3>
            </div>
            <div class="px-8 py-6 max-h-[60vh] overflow-auto">
              <p v-if="isLoadingOrders" class="text-sm text-slate-500">読み込み中...</p>
              <table v-else class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                    <th class="px-3 py-2 font-bold border-b border-slate-200">注文番号</th>
                    <th class="px-3 py-2 font-bold border-b border-slate-200"><span class="header-2line">注文名<br>住所</span></th>
                    <th class="px-3 py-2 font-bold border-b border-slate-200"><span class="header-2line">会社名<br>担当者</span></th>
                    <th class="px-3 py-2 font-bold border-b border-slate-200">デザイン種別</th>
                    <th class="px-3 py-2 font-bold border-b border-slate-200"><span class="header-2line">更新日<br>更新者</span></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="order in orderListForSelect"
                    :key="order.orderNo"
                    class="hover:bg-slate-100 cursor-pointer transition-colors"
                    @click="selectOrderNo(order)"
                  >
                    <td class="px-3 py-2"><span class="font-mono text-xs font-bold text-slate-700">{{ order.orderNo }}</span></td>
                    <td class="px-3 py-2">
                      <div class="text-slate-700 font-semibold text-xs">{{ order.orderName }}</div>
                      <div class="text-[10px] text-slate-500 mt-0.5">{{ order.address }}</div>
                    </td>
                    <td class="px-3 py-2">
                      <div class="text-slate-700 font-semibold text-xs">{{ order.companyName }}</div>
                      <div class="text-[10px] text-slate-500 mt-0.5">{{ order.manager }}</div>
                    </td>
                    <td class="px-3 py-2 text-slate-600 text-xs">{{ designTypeLabel(order.designType) }}</td>
                    <td class="px-3 py-2">
                      <div class="text-slate-600 text-xs">{{ order.updateDate }}</div>
                      <div class="text-[10px] text-slate-500 mt-0.5">{{ order.updater }}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-if="!isLoadingOrders && orderListForSelect.length === 0" class="text-sm text-slate-500">データがありません</p>
            </div>
            <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end">
              <button
                type="button"
                class="px-6 py-2 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
                @click="orderNoSelectModalOpen = false"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- テンプレート選択モーダル（グリッド） -->
    <Teleport to="body">
      <div v-show="templateSelectModalOpen" class="fixed inset-0 z-50" aria-hidden="false">
        <div class="fixed inset-0 bg-black/40" @click="templateSelectModalOpen = false"></div>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
            <div class="px-6 py-3 bg-main flex-shrink-0">
              <h3 class="text-base font-bold text-white tracking-tight">テンプレートを選択</h3>
            </div>
            <div class="px-8 py-6 flex-1 min-h-0 overflow-auto">
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <button
                  v-for="opt in TEMPLATE_OPTIONS.filter(o => o.value)"
                  :key="opt.value"
                  type="button"
                  class="template-select-item flex flex-col rounded-xl border-2 border-slate-200 bg-white overflow-hidden hover:ring-2 hover:ring-main hover:ring-offset-2 focus:ring-2 focus:ring-main focus:ring-offset-2 focus:outline-none transition-all duration-200 text-left"
                  @click="selectTemplateFromModal(opt.value)"
                >
                  <div class="h-64 w-full bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <span class="text-slate-400 text-xs">テンプレート</span>
                  </div>
                  <div class="px-3 py-2 text-xs font-semibold text-slate-700">{{ opt.label }}</div>
                </button>
              </div>
            </div>
            <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end flex-shrink-0">
              <button
                type="button"
                class="px-6 py-2 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
                @click="templateSelectModalOpen = false"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 会社選択モーダル -->
    <Teleport to="body">
      <div v-show="companySelectModalOpen" class="fixed inset-0 z-50" aria-hidden="false">
        <div class="fixed inset-0 bg-black/40" @click="companySelectModalOpen = false"></div>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-2xl overflow-hidden">
            <div class="px-6 py-3 bg-main">
              <h3 class="text-base font-bold text-white tracking-tight">会社を選択</h3>
            </div>
            <div class="px-8 py-6 max-h-[60vh] overflow-auto">
              <p v-if="isLoadingCompanies" class="text-sm text-slate-500">読み込み中...</p>
              <table v-else class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                    <th class="px-3 py-2 font-bold border-b border-slate-200"><span class="header-2line">会社名<br>住所</span></th>
                    <th class="px-3 py-2 font-bold border-b border-slate-200">担当者</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="c in companyListForSelect"
                    :key="c.companyId"
                    class="hover:bg-slate-100 cursor-pointer transition-colors"
                    @click="selectCompany(c)"
                  >
                    <td class="px-3 py-2">
                      <div class="text-slate-700 font-semibold text-xs">{{ c.companyName }}</div>
                      <div class="text-[10px] text-slate-500 mt-0.5">{{ c.address }}</div>
                    </td>
                    <td class="px-3 py-2 text-slate-600 text-xs">-</td>
                  </tr>
                </tbody>
              </table>
              <p v-if="!isLoadingCompanies && companyListForSelect.length === 0" class="text-sm text-slate-500">データがありません</p>
            </div>
            <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end gap-3">
              <button
                type="button"
                class="px-6 py-2 rounded-xl bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-all duration-200 whitespace-nowrap"
                @click="clearCompany(); companySelectModalOpen = false"
              >
                クリア
              </button>
              <button
                type="button"
                class="px-6 py-2 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
                @click="companySelectModalOpen = false"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 新規→変更で入力変更あり案内 -->
    <Teleport to="body">
      <div v-show="changeNoticeModalOpen" class="fixed inset-0 z-50" aria-hidden="false">
        <div class="fixed inset-0 bg-black/40" @click="changeNoticeModalOpen = false"></div>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-2xl overflow-hidden">
            <div class="px-6 py-3 bg-main">
              <h3 class="text-base font-bold text-white tracking-tight">変更の確認</h3>
            </div>
            <div class="px-8 py-6">
              <p class="text-sm text-slate-600">入力内容に変更があります。登録してから変更に切り替えますか？</p>
            </div>
            <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end gap-3">
              <button
                type="button"
                class="px-8 py-2.5 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
                @click="changeNoticeModalOpen = false"
              >
                キャンセル
              </button>
              <button
                type="button"
                class="px-8 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-all duration-200 whitespace-nowrap"
                @click="changeNoticeDiscard"
              >
                破棄して切り替え
              </button>
              <button
                type="button"
                class="px-8 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
                @click="changeNoticeRegister"
              >
                登録して切り替え
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 必須項目未入力 -->
    <Teleport to="body">
      <div v-show="requiredValidationOpen" class="fixed inset-0 z-50" aria-hidden="false">
        <div class="fixed inset-0 bg-black/40" @click="closeRequiredValidationModal"></div>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl card-shadow border border-slate-200/80 w-full max-w-md overflow-hidden">
            <div class="px-8 pt-8 pb-6 text-center">
              <p class="text-sm text-slate-600">{{ requiredValidationMessage }}</p>
            </div>
            <div class="px-8 py-5 flex flex-nowrap justify-center">
              <button
                type="button"
                class="px-8 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
                @click="closeRequiredValidationModal"
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
      <div v-show="registerConfirmOpen" class="fixed inset-0 z-50" aria-hidden="false">
        <div class="fixed inset-0 bg-black/40" @click="registerConfirmOpen = false"></div>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-md overflow-hidden">
            <div class="px-6 py-3 bg-main">
              <h3 class="text-base font-bold text-white tracking-tight">{{ registerConfirmTitle }}</h3>
            </div>
            <div class="px-8 py-6">
              <p class="text-sm text-slate-600">{{ registerConfirmMessage }}</p>
            </div>
            <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end gap-3">
              <button
                type="button"
                class="px-6 py-2 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
                @click="registerConfirmOpen = false"
              >
                キャンセル
              </button>
              <button
                type="button"
                class="px-6 py-2 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
                @click="doRegisterConfirm"
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
      <div v-show="registerResultOpen" class="fixed inset-0 z-[60]" aria-hidden="false">
        <div class="fixed inset-0 bg-black/40" @click="registerResultOpen = false"></div>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-xl overflow-hidden">
            <div class="px-6 py-3 bg-main">
              <h3 class="text-base font-bold text-white tracking-tight">処理結果</h3>
            </div>
            <div class="px-8 py-6">
              <p class="text-sm text-slate-600">{{ registerResultMessage }}</p>
            </div>
            <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end gap-3">
              <RouterLink
                :to="{ path: '/order/detail', query: { orderNo: orderNo, itemCode: '01', mode: 'edit' } }"
                class="inline-flex justify-center items-center px-8 py-2.5 rounded-xl bg-main hover:bg-subBlue text-white text-xs font-bold shadow-md shadow-main/20 transition-all duration-200 whitespace-nowrap"
                @click="registerResultOpen = false"
              >
                看板情報入力 / 変更
              </RouterLink>
              <RouterLink
                :to="{ path: '/order/list', query: orderNo ? { orderNo } : {} }"
                class="inline-flex justify-center items-center px-8 py-2.5 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
                @click="registerResultOpen = false"
              >
                注文 / 看板情報一覧
              </RouterLink>
              <button
                type="button"
                class="inline-flex justify-center items-center px-8 py-2.5 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
                @click="registerResultOpen = false"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </main>
</template>
