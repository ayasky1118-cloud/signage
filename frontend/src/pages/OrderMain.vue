<script setup lang="ts">
/**
 * OrderMain - 注文（新規・変更）画面
 *
 * 【用途】
 * ・注文の新規登録（createOrder API）
 * ・既存注文の編集（getOrderByNo で取得し、テンプレート項目・枝番等を更新）
 *
 * 【モード】
 * ・new: 新規登録。一覧から遷移時は注文番号選択不可（自動採番）
 * ・change: 変更。注文番号で検索して取得し、テンプレート項目・order_item を更新
 *
 * 【主な機能】
 * ・顧客選択 → テンプレート一覧取得（顧客に紐づく）
 * ・テンプレート選択 → template_item 取得（動的入力項目）
 * ・住所検証（MapTiler）、地図プレビュー
 * ・納期・校正予定日（Flatpickr）
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue"
import { RouterLink, useRouter, useRoute } from "vue-router"
import flatpickr from "flatpickr"
import { Japanese } from "flatpickr/dist/l10n/ja"
import "flatpickr/dist/flatpickr.min.css"
import "../assets/styles/flatpickr-theme.css"
import "../assets/styles/order-main.css"
import { validateAddress } from "../composables/useAddressApi"
import { searchOrders, createOrder, getOrderByNo, updateOrderMain, updateOrderItems, type OrderItem, type OrderDetail, type OrderDetailItem } from "../composables/useOrderApi"
import { fetchCustomers, type CustomerItem } from "../composables/useCustomerApi"
import { fetchDesignTypes, type DesignTypeItem } from "../composables/useDesignTypeApi"
import { fetchTemplates, fetchTemplateItems, type TemplateOption, type TemplateItemItem } from "../composables/useTemplateApi"
import { STATUS_OPTIONS, PRODUCTION_TYPE_OPTIONS } from "../constants/order"
import OrderNoSelectModal from "../components/OrderNoSelectModal.vue"
import CustomerSelectModal from "../components/CustomerSelectModal.vue"
import TemplateSelectModal from "../components/TemplateSelectModal.vue"

const router = useRouter()
const route = useRoute()

// -----------------------------------------------------------------------------
// モード・遷移元フラグ
// -----------------------------------------------------------------------------

const mode = ref<"new" | "change">("new")
/** 注文一覧画面から遷移してきた場合 true（注文番号をクリアできない等の制御に使用） */
const cameFromList = ref(false)
/** 変更モードで注文番号を検索してヒットした場合 true（他項目の編集可否に使用） */
const hasSearchedInChangeMode = ref(false)

// -----------------------------------------------------------------------------
// フォーム状態
// -----------------------------------------------------------------------------

const orderNo = ref("")
const companyCd = ref("")
const officeCd = ref("")
const siteCd = ref("")
const orderName = ref("")
const address = ref("")
const customerId = ref<number | null>(null)
const customerName = ref("")
const manager = ref("")
const templateId = ref<number | null>(null)
const designTypeId = ref<number | null>(null)
const templateItemValues = ref<string[]>([])
/** 納期（Y/m/d 表示。Flatpickr と同期） */
const deadlineDate = ref("")
/** 校正予定日（Y/m/d 表示。Flatpickr と同期） */
const proofreadingDate = ref("")
/** ステータス（attribute_05）。固定値ドロップダウン */
const status = ref("")
/** 制作区分（attribute_04）。固定値ドロップダウン */
const productionType = ref("")
/** 備考（デフォルトテンプレート。画面上は入力必須） */
const NOTE_DEFAULT = "営業担当者：\n制作担当者："
const note = ref(NOTE_DEFAULT)

// -----------------------------------------------------------------------------
// テンプレート・テンプレート項目（API 取得）
// -----------------------------------------------------------------------------

const templateOptions = ref<TemplateOption[]>([])
const isLoadingTemplates = ref(false)
/** 選択されたテンプレートに紐づく template_item（項目名・必須・種別。表示は全てテキスト） */
const templateItems = ref<TemplateItemItem[]>([])
const isLoadingTemplateItems = ref(false)

// デザイン種別（ログイン会社に紐づく。マウント時に API で取得）
const designTypeOptions = ref<DesignTypeItem[]>([])
const isLoadingDesignTypes = ref(false)

/** ログイン会社IDを返す。環境変数 VITE_LOGIN_COMPANY_ID がなければ 1（将来は認証ストアから取得） */
function getLoginCompanyId(): number {
  const v = import.meta.env.VITE_LOGIN_COMPANY_ID as string | undefined
  if (v != null && v !== "") {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return 1
}

// -----------------------------------------------------------------------------
// 計算プロパティ（UI 制御）
// -----------------------------------------------------------------------------

/** テンプレートに項目が紐づいている場合のみ「テンプレート項目」セクションを表示 */
const showTemplateItemsSection = computed(() => templateItems.value.length > 0)

/** 顧客設定時にテンプレート一覧を API 取得してドロップダウンに反映 */
watch(customerId, async (val) => {
  templateOptions.value = []
  if (val == null) return
  isLoadingTemplates.value = true
  try {
    templateOptions.value = await fetchTemplates(getLoginCompanyId(), val)
  } catch {
    templateOptions.value = []
  } finally {
    isLoadingTemplates.value = false
  }
})

/** テンプレート変更時に template_item を取得。pendingOrderItems があれば order_item の値を反映 */
watch(templateId, async (val) => {
  templateItems.value = []
  templateItemValues.value = []
  templateItemInputRefs.value = []
  if (val == null) return
  const id = typeof val === "string" ? parseInt(val, 10) : val
  if (Number.isNaN(id)) return
  isLoadingTemplateItems.value = true
  try {
    const items = await fetchTemplateItems(id)
    templateItems.value = items
    const pending = pendingOrderItems.value
    if (pending?.length) {
      templateItemValues.value = items.map((item, i) => {
        const found = pending.find((oi) => oi.templateItemId === item.templateItemId)
        return found ? found.orderItemVal : (templateItemValues.value[i] ?? "")
      })
      pendingOrderItems.value = null
    } else {
      templateItemValues.value = items.map((_, i) => templateItemValues.value[i] ?? "")
    }
  } catch {
    templateItems.value = []
    templateItemValues.value = []
    templateItemInputRefs.value = []
    pendingOrderItems.value = null
  } finally {
    isLoadingTemplateItems.value = false
    /* 注文読み込み直後のテンプレート項目反映が終わったら、その時点をデフォルト値として記録 */
    if (deferInitialChangeStateAfterOrderLoad.value) {
      initialChangeState.value = getFormState()
      deferInitialChangeStateAfterOrderLoad.value = false
    }
  }
})

// 変更モード時: 注文番号・会社名以外は編集可能。他項目は未検索かつ一覧以外からの遷移でない場合のみ無効
const otherFieldsDisabled = computed(
  () => mode.value === "change" && !hasSearchedInChangeMode.value && !cameFromList.value
)

/** 変更モードでは注文番号は読取専用（一覧から遷移時または検索済み時）。新規時は自動採番のため読取 */
const orderNoReadOnly = computed(
  () => mode.value !== "change" || cameFromList.value || hasSearchedInChangeMode.value
)

/** 注文番号入力欄のプレースホルダー（新規/変更で文言を切り替え） */
const orderNoPlaceholder = computed(() =>
  mode.value === "change" ? "注文番号を入力してください" : "新規時は自動で採番されます"
)

/** 新規時は注文番号選択不可（自動採番）。変更モードかつ一覧以外から来たときのみ有効 */
const orderNoSelectDisabled = computed(() => mode.value === "new" || (mode.value === "change" && cameFromList.value))

/** 変更モードかつ一覧以外から来たときのみ「検索」ボタンを有効にする */
const searchAndListDisabled = computed(() => !(mode.value === "change" && !cameFromList.value))

/** 変更モードでは顧客の再選択を禁止する */
const customerSelectDisabled = computed(() => mode.value === "change")

/** 変更モードで未検索のときは無効。新規のときは顧客未選択なら無効 */
const templateDisabled = computed(() => {
  if (mode.value === "change") return !hasSearchedInChangeMode.value && !cameFromList.value
  return !customerName.value.trim()
})

const templateSelectPlaceholder = computed(() =>
  isLoadingTemplates.value ? "読み込み中..." : "レイアウトテンプレートを選択してください"
)

/** 登録ボタンのラベル（新規時は「登録」、変更時は「更新」） */
const registerButtonLabel = computed(() => (mode.value === "change" ? "更新" : "登録"))

/** 住所検証中、テンプレート項目読み込み中、または変更モードで未検索のときは登録ボタンを無効にする */
const registerButtonDisabled = computed(
  () =>
    isValidatingAddress.value ||
    isLoadingTemplateItems.value ||
    (mode.value === "change" &&
      !cameFromList.value &&
      !hasSearchedInChangeMode.value)
)

/** 変更モードで検索済みのときのみ「看板編集」リンクを有効にする */
const orderDetailLinkDisabled = computed(
  () => !(mode.value === "change" && hasSearchedInChangeMode.value)
)

/** 新規モードでラジオを無効化（一覧から遷移時） */
const newModeRadioDisabled = computed(() => cameFromList.value)

/** フォーム全体の値を1文字列にまとめ、未保存変更の有無判定に使う */
function getFormState(): string {
  return [
    orderNo.value.trim(),
    companyCd.value.trim(),
    officeCd.value.trim(),
    siteCd.value.trim(),
    deadlineDate.value.trim(),
    proofreadingDate.value.trim(),
    productionType.value.trim(),
    status.value.trim(),
    note.value.trim(),
    orderName.value.trim(),
    address.value.trim(),
    customerName.value.trim(),
    manager.value.trim(),
    templateId.value ?? "",
    designTypeId.value ?? "",
    templateItemValues.value.join(","),
  ].join("|")
}

/** 新規モード時のフォーム初期値（未保存変更判定の基準） */
const initialNewState = ref("")
/** 変更モード時のフォーム初期値（注文読込完了時点。未保存変更判定の基準） */
const initialChangeState = ref("")

/** デフォルト値（初期状態）から値が変わった場合のみ true。戻る・枝番切り替え時の確認に使用 */
const hasUnsavedChanges = computed(() => {
  const current = getFormState()
  if (mode.value === "new") return current !== initialNewState.value
  return current !== initialChangeState.value
})

// -----------------------------------------------------------------------------
// モーダル（注文番号選択・顧客選択・テンプレート選択・各種確認）
// -----------------------------------------------------------------------------

const orderListForSelect = ref<OrderItem[]>([])
const orderNoSelectModalOpen = ref(false)
const isLoadingOrders = ref(false)

const customerListForSelect = ref<CustomerItem[]>([])
const customerSelectModalOpen = ref(false)
const isLoadingCustomers = ref(false)

const templateSelectModalOpen = ref(false)

const unsavedConfirmOpen = ref(false)
const unsavedConfirmMessage = ref("入力内容に変更があります。変更は破棄されます。よろしいですか")
const unsavedConfirmOkText = ref("破棄する")
/** 未保存変更確認で「破棄する」を選んだときに実行するコールバック（戻る／遷移など） */
const pendingUnsavedAction = ref<(() => void) | null>(null)

/** 新規→変更に切り替えた際の「登録してから変更」確認モーダル */
const changeNoticeModalOpen = ref(false)

const requiredValidationOpen = ref(false)
const requiredValidationMessage = ref("必須項目が未入力です")
/** 必須エラー時にフォーカスする要素の ref 名 */
const requiredValidationFocusRef = ref<string | null>(null)

// フォーカス用 ref（バリデーション後のフォーカス移動に使用）
const orderNoInputRef = ref<HTMLInputElement | null>(null)
const orderNoSearchBtnRef = ref<HTMLButtonElement | null>(null)
const inputDeadlineRef = ref<HTMLInputElement | null>(null)
const inputProofreadingRef = ref<HTMLInputElement | null>(null)
const companyCdInputRef = ref<HTMLInputElement | null>(null)
const officeCdInputRef = ref<HTMLInputElement | null>(null)
const siteCdInputRef = ref<HTMLInputElement | null>(null)
const orderNameInputRef = ref<HTMLInputElement | null>(null)
const addressInputRef = ref<HTMLInputElement | null>(null)
const customerSelectBtnRef = ref<HTMLButtonElement | null>(null)
const templateSelectRef = ref<HTMLSelectElement | null>(null)
const designTypeSelectRef = ref<HTMLSelectElement | null>(null)
const noteInputRef = ref<HTMLTextAreaElement | null>(null)
/** テンプレート項目入力欄の ref（必須チェック時のフォーカス用） */
const templateItemInputRefs = ref<(HTMLInputElement | null)[]>([])

/** 変更モードで注文取得時、テンプレート項目取得後に order_item の値を反映するための一時保持 */
const pendingOrderItems = ref<OrderDetailItem[] | null>(null)
/** 注文読込後、テンプレート項目読込完了時に initialChangeState を更新するフラグ（変更モードの未保存判定を正しくするため） */
const deferInitialChangeStateAfterOrderLoad = ref(false)

const registerConfirmOpen = ref(false)
const registerConfirmTitle = ref("登録の確認")
const registerConfirmMessage = ref("この内容で登録してよろしいですか")

const registerResultOpen = ref(false)
const registerResultMessage = ref("登録が完了しました")

/** 住所検証API実行中（登録ボタン押下時） */
const isValidatingAddress = ref(false)

/** 取得した注文詳細をフォーム各項目に反映する（テンプレート項目は非同期で後から反映） */
function applyOrderData(order: OrderDetail) {
  orderNo.value = order.orderNo ?? ""
  companyCd.value = order.attribute_01 ?? ""
  officeCd.value = order.attribute_02 ?? ""
  siteCd.value = order.attribute_03 ?? ""
  deadlineDate.value = order.deadlineDt ?? ""
  proofreadingDate.value = order.proofreadingDt ?? ""
  productionType.value = order.attribute_04 ?? ""
  status.value = order.attribute_05 ?? ""
  note.value = order.note?.trim() ? order.note : NOTE_DEFAULT
  orderName.value = order.orderName ?? ""
  address.value = order.address ?? ""
  customerId.value = order.customerId ?? null
  customerName.value = order.customerName ?? ""
  manager.value = order.manager ?? ""
  designTypeId.value = order.designTypeId ?? null
  pendingOrderItems.value = order.orderItems?.length ? [...order.orderItems] : null
  templateId.value = order.templateId ?? null
  /* テンプレート項目は非同期で反映するため、反映完了後に initialChangeState を更新する（deferInitialChangeStateAfterOrderLoad） */
  deferInitialChangeStateAfterOrderLoad.value = true
}

/** 選択した顧客のID・名前・担当者をフォームに反映する（デザイン種別は別途APIで取得） */
function applyCustomerData(c: CustomerItem) {
  customerId.value = c.customerId
  customerName.value = c.customerName
  manager.value = c.contactName ?? ""  // 顧客の担当者名を初期設定（編集可）
  designTypeId.value = null
}

/** ログイン会社に紐づくデザイン種別一覧をAPIで取得する */
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

/** 顧客選択をクリアし、関連するテンプレート・デザイン種別もリセットする */
function clearCustomer() {
  customerId.value = null
  customerName.value = ""
  manager.value = ""
  designTypeId.value = null
  templateId.value = null
  templateItemValues.value = []
}

/** 変更モードで注文番号が変わったときに、注文番号以外の入力項目をすべてクリアする */
function clearOtherFieldsOnOrderNoChange() {
  if (mode.value !== "change") return
  companyCd.value = ""
  officeCd.value = ""
  siteCd.value = ""
  deadlineDate.value = ""
  proofreadingDate.value = ""
  productionType.value = ""
  status.value = ""
  note.value = NOTE_DEFAULT
  fpDeadline?.clear()
  fpProofreading?.clear()
  orderName.value = ""
  address.value = ""
  customerName.value = ""
  customerId.value = null
  manager.value = ""
  designTypeId.value = null
  templateId.value = null
  templateItemValues.value = []
  hasSearchedInChangeMode.value = false
}

/** 注文番号選択モーダルを開く。APIで一覧取得し、0件のときはメッセージのみ表示 */
async function openOrderNoSelectModal() {
  isLoadingOrders.value = true
  try {
    const result = await searchOrders({ companyId: getLoginCompanyId(), perPage: 50, page: 1 })
    orderListForSelect.value = result.items
    if (result.items.length === 0) {
      requiredValidationMessage.value = "データがありません"
      requiredValidationOpen.value = true
      return
    }
    orderNoSelectModalOpen.value = true
  } catch {
    orderListForSelect.value = []
    requiredValidationMessage.value = "データの取得に失敗しました。"
    requiredValidationOpen.value = true
  } finally {
    isLoadingOrders.value = false
  }
}

/** 注文番号選択モーダルで選択した注文の番号をフォームにセットし、他項目をクリアする */
function selectOrderNo(order: OrderItem) {
  orderNo.value = order.orderNo ?? ""
  clearOtherFieldsOnOrderNoChange()
}

/** 検索ボタン押下時。注文番号でAPI検索し、取得した注文詳細をフォームに反映する */
async function doSearchByOrderNo() {
  const no = orderNo.value.trim()
  if (!no) {
    requiredValidationMessage.value = "「注文番号」を選択してください。"
    requiredValidationFocusRef.value = "orderNoSearch"
    requiredValidationOpen.value = true
    return
  }
  try {
    const order = await getOrderByNo(no)
    applyOrderData(order)
    hasSearchedInChangeMode.value = true
  } catch (e) {
    requiredValidationMessage.value = e instanceof Error ? e.message : "該当データがありません"
    requiredValidationOpen.value = true
  }
}

/** 顧客選択モーダルを開く。未取得の場合はAPIで顧客一覧を取得してから表示する */
async function openCustomerSelectModal() {
  customerSelectModalOpen.value = true
  if (customerListForSelect.value.length === 0) {
    isLoadingCustomers.value = true
    try {
      customerListForSelect.value = await fetchCustomers(getLoginCompanyId())
    } catch {
      customerListForSelect.value = []
    } finally {
      isLoadingCustomers.value = false
    }
  }
}

/** 顧客選択モーダルで選択した顧客をフォームに反映し、テンプレートをリセットする */
function selectCustomer(c: CustomerItem) {
  applyCustomerData(c)
  templateId.value = null
  templateItemValues.value = []
}

/** テンプレート選択モーダルで選択したテンプレートをフォームに反映する */
function selectTemplateFromModal(opt: TemplateOption) {
  /* templateOptions を先に更新してから templateId を設定（select 再レンダで templateId がリセットされるのを防ぐ） */
  if (!templateOptions.value.some((o) => o.templateId === opt.templateId)) {
    templateOptions.value = [opt, ...templateOptions.value]
  }
  templateId.value = opt.templateId
}

/** 必須項目のバリデーション。不正時はメッセージとフォーカス用 ref 名を返す */
function validateRequired(): { valid: boolean; message: string; focusRef?: string } {
  if (mode.value === "change" && !orderNo.value.trim()) {
    return { valid: false, message: "「注文番号」を選択してください。", focusRef: "orderNoSearch" }
  }
  if (!companyCd.value.trim()) return { valid: false, message: "「社内CD」を入力してください", focusRef: "companyCd" }
  if (!officeCd.value.trim()) return { valid: false, message: "「事業所CD」を入力してください", focusRef: "officeCd" }
  if (!siteCd.value.trim()) return { valid: false, message: "「現場CD」を入力してください", focusRef: "siteCd" }
  if (!orderName.value.trim()) return { valid: false, message: "「注文名」を入力してください", focusRef: "orderName" }
  if (!address.value.trim()) return { valid: false, message: "「住所」を入力してください", focusRef: "address" }
  if (!customerName.value.trim()) return { valid: false, message: "「顧客」を選択してください。", focusRef: "customerSelect" }
  if (templateId.value == null) return { valid: false, message: "「テンプレート」を選択してください。", focusRef: "template" }
  if (designTypeId.value == null) return { valid: false, message: "「デザイン種別」を選択してください。", focusRef: "designType" }
  if (!note.value.trim()) return { valid: false, message: "「備考」を入力してください", focusRef: "note" }
  if (isLoadingTemplateItems.value) return { valid: false, message: "テンプレート項目を読み込み中です。", focusRef: "template" }
  for (let i = 0; i < templateItems.value.length; i++) {
    const item = templateItems.value[i]
    if (item.isRequired && !(templateItemValues.value[i] ?? "").trim()) {
      return {
        valid: false,
        message: `「${item.itemName}」を入力してください`,
        focusRef: `templateItem_${i}`,
      }
    }
  }
  return { valid: true, message: "" }
}

/** テンプレート項目の入力欄を ref 配列に登録する（必須エラー時のフォーカス用） */
function setTemplateItemInputRef(el: unknown, idx: number) {
  if (el instanceof HTMLInputElement) {
    while (templateItemInputRefs.value.length <= idx) templateItemInputRefs.value.push(null)
    templateItemInputRefs.value[idx] = el
  }
}

/** バリデーション用キー（ref 名）からフォーカス対象の DOM 要素を返す */
function getFocusElement(key: string | null | undefined): HTMLElement | null {
  if (!key) return null
  // テンプレート項目（templateItem_0 等）
  if (key.startsWith("templateItem_")) {
    const i = parseInt(key.replace("templateItem_", ""), 10)
    if (!Number.isNaN(i) && templateItemInputRefs.value[i]) return templateItemInputRefs.value[i]
    return null
  }
  // フォーム各項目の ref
  switch (key) {
    case "orderNoSearch":
      return (orderNoSearchBtnRef.value ?? orderNoInputRef.value) as HTMLElement | null
    case "companyCd":
      return companyCdInputRef.value
    case "officeCd":
      return officeCdInputRef.value
    case "siteCd":
      return siteCdInputRef.value
    case "orderName":
      return orderNameInputRef.value
    case "address":
      return addressInputRef.value
    case "customerSelect":
      return customerSelectBtnRef.value
    case "template":
      return templateSelectRef.value
    case "designType":
      return designTypeSelectRef.value
    case "note":
      return noteInputRef.value
    default:
      return null
  }
}

/** 必須エラー時に指定キーに対応する入力欄へスクロール・フォーカスする */
function focusValidationTarget(key: string | null | undefined) {
  const el = getFocusElement(key)
  if (!el) return
  el.scrollIntoView({ behavior: "auto", block: "nearest" })
  el.focus()
}

/** 必須項目エラーモーダルを閉じ、該当項目へフォーカスを移す */
function closeRequiredValidationModal() {
  const focusKey = requiredValidationFocusRef.value
  requiredValidationFocusRef.value = null
  requiredValidationOpen.value = false
  nextTick(() => {
    focusValidationTarget(focusKey)
  })
}

/** 登録ボタン押下時。必須チェック・住所検証ののち登録確認モーダルを開く */
async function openRegisterConfirm() {
  // 1) 必須項目チェック
  const result = validateRequired()
  if (!result.valid) {
    requiredValidationMessage.value = result.message
    requiredValidationFocusRef.value = result.focusRef ?? null
    requiredValidationOpen.value = true
    return
  }
  // 2) 住所検証 API
  isValidatingAddress.value = true
  try {
    const addressResult = await validateAddress(address.value)
    if (addressResult.valid !== true) {
      requiredValidationMessage.value = addressResult.message ?? "住所を正しく入力してください"
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
  // 3) 登録確認モーダルを開く
  registerConfirmTitle.value = mode.value === "change" ? "更新の確認" : "登録の確認"
  registerConfirmMessage.value =
    mode.value === "change" ? "この内容で更新してよろしいですか" : "この内容で登録してよろしいですか"
  registerConfirmOpen.value = true
}

/**
 * 登録確認モーダルで OK 押下時の処理。
 * 新規: createOrder API を呼び、採番された orderNo を反映して結果モーダル表示。
 * 変更: 更新 API は未実装のため結果メッセージのみ表示。
 */
async function doRegisterConfirm() {
  if (mode.value === "new") {
    const loginCompanyId = getLoginCompanyId()
    if (
      customerId.value == null ||
      templateId.value == null ||
      designTypeId.value == null
    ) {
      return
    }
    // テンプレート項目を API 用に整形（template_item 順で ID と値をペア）
    const templateItemsPayload = templateItems.value.map((item, idx) => ({
      templateItemId: item.templateItemId,
      orderItemVal: templateItemValues.value[idx] ?? "",
    }))
    try {
      // createOrder API 呼び出し
      const result = await createOrder({
        loginCompanyId,
        orderName: orderName.value.trim(),
        orderAdd: address.value.trim(),
        customerId: customerId.value,
        templateId: templateId.value,
        designTypeId: designTypeId.value,
        attribute01: companyCd.value.trim(),
        attribute02: officeCd.value.trim(),
        attribute03: siteCd.value.trim(),
        attribute04: productionType.value.trim() || undefined,
        attribute05: status.value.trim() || undefined,
        note: note.value.trim() || undefined,
        deadlineDt: deadlineDate.value.trim() ? deadlineDate.value.trim().replace(/\//g, "-") : undefined,
        proofreadingDt: proofreadingDate.value.trim() ? proofreadingDate.value.trim().replace(/\//g, "-") : undefined,
        templateItems: templateItemsPayload,
        managerName: manager.value.trim() || undefined,
      })
      // 成功時：採番された orderNo を反映し、未保存判定用の基準を更新
      registerConfirmOpen.value = false
      orderNo.value = result.orderNo
      registerResultMessage.value = "登録が完了しました"
      registerResultOpen.value = true
      initialNewState.value = getFormState()
      initialChangeState.value = getFormState()
    } catch (e) {
      registerConfirmOpen.value = false
      const msg = e instanceof Error ? e.message : "登録に失敗しました"
      requiredValidationMessage.value = msg
      requiredValidationOpen.value = true
    }
    return
  }
  // 変更モード：order_main と order_item を更新
  const no = orderNo.value?.trim()
  if (!no) {
    registerConfirmOpen.value = false
    requiredValidationMessage.value = "注文番号がありません"
    requiredValidationOpen.value = true
    return
  }
  if (
    customerId.value == null ||
    templateId.value == null ||
    designTypeId.value == null
  ) {
    return
  }
  try {
    // 1) order_main 更新
    await updateOrderMain(no, {
      orderName: orderName.value.trim(),
      orderAdd: address.value.trim(),
      customerId: customerId.value,
      templateId: templateId.value,
      designTypeId: designTypeId.value,
      attribute01: companyCd.value.trim(),
      attribute02: officeCd.value.trim(),
      attribute03: siteCd.value.trim(),
      attribute04: productionType.value.trim() || undefined,
      attribute05: status.value.trim() || undefined,
      managerName: manager.value.trim() || undefined,
      deadlineDt: deadlineDate.value.trim() ? deadlineDate.value.trim().replace(/\//g, "-") : undefined,
      proofreadingDt: proofreadingDate.value.trim() ? proofreadingDate.value.trim().replace(/\//g, "-") : undefined,
      note: note.value.trim() || undefined,
    })
    // 2) order_item（テンプレート項目）更新
    if (templateItems.value.length > 0) {
      const templateItemsPayload = templateItems.value.map((item, idx) => ({
        templateItemId: item.templateItemId,
        orderItemVal: templateItemValues.value[idx] ?? "",
      }))
      await updateOrderItems(no, templateItemsPayload)
    }
    registerConfirmOpen.value = false
    registerResultMessage.value = "更新が完了しました"
    registerResultOpen.value = true
    initialChangeState.value = getFormState()
  } catch (e) {
    registerConfirmOpen.value = false
    const msg = e instanceof Error ? e.message : "更新に失敗しました"
    requiredValidationMessage.value = msg
    requiredValidationOpen.value = true
  }
}

/** 看板編集画面へのルート（変更モードかつ検索済みかつ注文番号ありのときのみ有効なパスを返す） */
const orderDetailTo = computed(() => {
  if (!orderDetailLinkDisabled.value && orderNo.value) {
    return {
      path: "/order/detail",
      query: { orderNo: orderNo.value, itemCode: "01", mode: "edit" },
    }
  }
  return { path: "/order/detail" }
})

/** 戻るボタン押下。未保存変更があれば確認モーダルを出し、OK で履歴を戻す */
function goBack() {
  if (hasUnsavedChanges.value) {
    unsavedConfirmMessage.value = "入力内容に変更があります。変更は破棄されます。戻ってよろしいですか"
    unsavedConfirmOkText.value = "破棄して戻る"
    pendingUnsavedAction.value = () => router.back()
    unsavedConfirmOpen.value = true
  } else {
    router.back()
  }
}

/** 未保存変更確認で「破棄する」を選んだときに、保留していたアクション（戻る／遷移など）を実行する */
function executePendingUnsaved() {
  const fn = pendingUnsavedAction.value
  pendingUnsavedAction.value = null
  unsavedConfirmOpen.value = false
  if (fn) fn()
}

/** モードを新規→変更に切り替えたとき、入力に変更があれば「登録してから変更」等の確認モーダルを表示する */
function onModeChangeToChange() {
  if (getFormState() !== initialNewState.value) {
    changeNoticeModalOpen.value = true
    mode.value = "new" // モーダル表示中は新規のまま
  }
}

/** 新規→変更の確認で「破棄して切り替え」を選んだとき、フォームをクリアして変更モードにする */
function changeNoticeDiscard() {
  orderNo.value = ""
  companyCd.value = ""
  officeCd.value = ""
  siteCd.value = ""
  deadlineDate.value = ""
  proofreadingDate.value = ""
  productionType.value = ""
  status.value = ""
  note.value = NOTE_DEFAULT
  orderName.value = ""
  address.value = ""
  customerName.value = ""
  customerId.value = null
  manager.value = ""
  designTypeId.value = null
  templateId.value = null
  templateItemValues.value = []
  initialNewState.value = getFormState()
  initialChangeState.value = getFormState()
  mode.value = "change"
  hasSearchedInChangeMode.value = false
  changeNoticeModalOpen.value = false
}

/** 新規→変更の確認で「登録して切り替え」を選んだとき、登録確認モーダルを開く */
function changeNoticeRegister() {
  changeNoticeModalOpen.value = false
  openRegisterConfirm()
}

/** モードを変更→新規に切り替えたとき、未保存変更があれば破棄確認を出し、OK でフォームをクリアして新規にする */
function onModeChangeToNew() {
  if (getFormState() !== initialChangeState.value) {
    // 未保存変更あり：確認モーダルを出し、OK でフォームクリア＋新規へ
    unsavedConfirmMessage.value = "入力内容に変更があります。新規に切り替えますか？変更は破棄されます。"
    unsavedConfirmOkText.value = "破棄して新規へ"
    pendingUnsavedAction.value = () => {
      orderNo.value = ""
      companyCd.value = ""
      officeCd.value = ""
      siteCd.value = ""
      deadlineDate.value = ""
      proofreadingDate.value = ""
      productionType.value = ""
      status.value = ""
      note.value = NOTE_DEFAULT
      orderName.value = ""
      address.value = ""
      customerName.value = ""
      customerId.value = null
      manager.value = ""
      designTypeId.value = null
      templateId.value = null
      templateItemValues.value = []
      initialNewState.value = getFormState()
      initialChangeState.value = getFormState()
      mode.value = "new"
      hasSearchedInChangeMode.value = false
    }
    unsavedConfirmOpen.value = true
    mode.value = "change" // モーダル表示中は変更のまま
  } else {
    // 未保存変更なし：そのままフォームクリア＋新規へ
    orderNo.value = ""
    companyCd.value = ""
    officeCd.value = ""
    siteCd.value = ""
    deadlineDate.value = ""
    proofreadingDate.value = ""
    productionType.value = ""
    status.value = ""
    note.value = NOTE_DEFAULT
    orderName.value = ""
    address.value = ""
    customerName.value = ""
    customerId.value = null
    manager.value = ""
    designTypeId.value = null
    templateId.value = null
    templateItemValues.value = []
    initialNewState.value = getFormState()
    initialChangeState.value = getFormState()
    mode.value = "new"
  }
}

/** 看板編集リンククリック時。未保存変更があれば破棄確認を出し、OK で看板編集画面へ遷移する */
function handleOrderDetailClick(e: MouseEvent) {
  if (orderDetailLinkDisabled.value) {
    e.preventDefault()
    return
  }
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    unsavedConfirmMessage.value = "入力内容に変更があります。変更は破棄されます。移動してよろしいですか"
    unsavedConfirmOkText.value = "破棄して移動する"
    pendingUnsavedAction.value = () => router.push(orderDetailTo.value)
    unsavedConfirmOpen.value = true
  }
}

/* Flatpickr インスタンス（納期・校正予定日） */
let fpDeadline: flatpickr.Instance | null = null
let fpProofreading: flatpickr.Instance | null = null

/* 初期化：URL パラメータ */
onMounted(async () => {
  const loginCompanyId = getLoginCompanyId()
  loadDesignTypes(loginCompanyId)

  const q = route.query
  if (q.mode === "edit" || q.orderNo) {
    cameFromList.value = true
    hasSearchedInChangeMode.value = true
    mode.value = "change"
    const no = (q.orderNo as string)?.trim()
    if (no) {
      orderNo.value = no
      try {
        const order = await getOrderByNo(no)
        applyOrderData(order)
      } catch {
        // 注文番号だけ入れておく
      }
    }
  }
  initialNewState.value = getFormState()
  initialChangeState.value = getFormState()

  nextTick(() => {
    const opts = { locale: Japanese, dateFormat: "Y/m/d", allowInput: false }
    if (inputDeadlineRef.value) {
      fpDeadline = flatpickr(inputDeadlineRef.value, {
        ...opts,
        onChange(_selectedDates, dateStr) {
          deadlineDate.value = dateStr || ""
        },
      })
    }
    if (inputProofreadingRef.value) {
      fpProofreading = flatpickr(inputProofreadingRef.value, {
        ...opts,
        onChange(_selectedDates, dateStr) {
          proofreadingDate.value = dateStr || ""
        },
      })
    }
  })
})

onUnmounted(() => {
  fpDeadline?.destroy()
  fpProofreading?.destroy()
})

/* 注文番号入力変更時（変更モード） */
watch(orderNo, () => {
  if (mode.value === "change") clearOtherFieldsOnOrderNoChange()
})
</script>

<template>
  <!-- === 画面：注文（新規・変更） === -->
  <main id="order-main-page">
    <div class="order-main-page-container">
      <div class="order-main-card card-header-full">
        <div class="page-card-header order-main-card-header">
          <h2>注文（新規・変更）</h2>
        </div>

        <form class="order-main-form" @submit.prevent>
          <div>
            <!-- -- モード切替（新規／変更） -- -->
            <div class="order-main-mode-section">
              <div class="order-main-mode-radio">
                <label :class="{ 'mode-radio--disabled': newModeRadioDisabled }">
                  <input
                    v-model="mode"
                    type="radio"
                    name="mode"
                    value="new"
                    class="sr-only"
                    :disabled="newModeRadioDisabled"
                    @change="onModeChangeToNew"
                  />
                  <span>新規</span>
                </label>
                <label>
                  <input v-model="mode" type="radio" name="mode" value="change" class="sr-only" @change="onModeChangeToChange" />
                  <span>変更</span>
                </label>
              </div>
            </div>

          <!-- -- 入力ブロック1：注文番号・社内CD・事業所CD・現場CD・ステータス -- -->
          <section class="order-main-form-section">
            <div class="order-main-form-row">
              <div class="order-main-form-field order-main-form-field--order-no">
                <label class="form-label form-label--with-badge">
                  <span class="form-required-badge">必須</span>
                  注文番号
                </label>
                <div class="order-main-field-row">
                  <input
                    ref="orderNoInputRef"
                    v-model="orderNo"
                    type="text"
                    :readonly="orderNoReadOnly"
                    :placeholder="orderNoPlaceholder"
                    class="form-input"
                    :class="{ 'form-input--readonly': orderNoReadOnly }"
                  />
                  <button
                    type="button"
                    title="選択"
                    class="btn-icon btn-icon--select"
                    :disabled="orderNoSelectDisabled"
                    @click="openOrderNoSelectModal"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    ref="orderNoSearchBtnRef"
                    type="button"
                    title="検索"
                    class="btn-icon btn-icon--search"
                    :disabled="searchAndListDisabled"
                    @click="doSearchByOrderNo"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="order-main-form-field order-main-form-field--w7">
                <label class="form-label form-label--with-badge">
                  <span class="form-required-badge">必須</span>
                  社内CD
                </label>
                <input
                  ref="companyCdInputRef"
                  v-model="companyCd"
                  type="text"
                  class="form-input"
                  placeholder="社内CDを入力してください"
                  :disabled="otherFieldsDisabled"
                />
              </div>
              <div class="order-main-form-field order-main-form-field--w7">
                <label class="form-label form-label--with-badge">
                  <span class="form-required-badge">必須</span>
                  事業所CD
                </label>
                <input
                  ref="officeCdInputRef"
                  v-model="officeCd"
                  type="text"
                  class="form-input"
                  placeholder="事業所CDを入力してください"
                  :disabled="otherFieldsDisabled"
                />
              </div>
              <div class="order-main-form-field order-main-form-field--w7">
                <label class="form-label form-label--with-badge">
                  <span class="form-required-badge">必須</span>
                  現場CD
                </label>
                <input
                  ref="siteCdInputRef"
                  v-model="siteCd"
                  type="text"
                  class="form-input"
                  placeholder="現場CDを入力してください"
                  :disabled="otherFieldsDisabled"
                />
              </div>
              <div class="order-main-form-field order-main-form-field--w8">
                <label class="form-label form-label--with-badge">ステータス</label>
                <select v-model="status" class="form-select" :class="{ 'form-select--placeholder': !status }" :disabled="otherFieldsDisabled">
                  <option value="">ステータスを選択してください</option>
                  <option v-for="opt in STATUS_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>

            <!-- -- 入力ブロック2：制作区分・納期・校正予定日 -- -->
            <div class="order-main-form-row">
              <div class="order-main-form-field order-main-form-field--w24">
                <label class="form-label form-label--with-badge">制作区分</label>
                <select v-model="productionType" class="form-select" :class="{ 'form-select--placeholder': !productionType }" :disabled="otherFieldsDisabled">
                  <option value="">制作区分を選択してください</option>
                  <option v-for="opt in PRODUCTION_TYPE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="order-main-form-field order-main-form-field--w24">
                <label class="form-label form-label--with-badge">納期</label>
                <input
                  ref="inputDeadlineRef"
                  type="text"
                  readonly
                  placeholder="納期を選択してください"
                  :value="deadlineDate"
                  class="form-input order-main-date-input"
                  :disabled="otherFieldsDisabled"
                />
              </div>
              <div class="order-main-form-field order-main-form-field--w24">
                <label class="form-label form-label--with-badge">校正予定日</label>
                <input
                  ref="inputProofreadingRef"
                  type="text"
                  readonly
                  placeholder="校正予定日を選択してください"
                  :value="proofreadingDate"
                  class="form-input order-main-date-input"
                  :disabled="otherFieldsDisabled"
                />
              </div>
            </div>

            <!-- -- 入力ブロック3：備考 -- -->
            <div class="order-main-form-field order-main-form-field--flex1">
              <label class="form-label form-label--with-badge">
                <span class="form-required-badge">必須</span>
                備考
              </label>
              <textarea
                ref="noteInputRef"
                v-model="note"
                rows="3"
                class="form-input"
                placeholder="営業担当者・制作担当者を入力してください"
                :disabled="otherFieldsDisabled"
              />
            </div>

            <!-- -- 入力ブロック4：注文名・住所 -- -->
            <div class="order-main-form-field order-main-form-field--flex1">
              <label class="form-label form-label--with-badge">
                <span class="form-required-badge">必須</span>
                注文名
              </label>
              <input
                ref="orderNameInputRef"
                v-model="orderName"
                type="text"
                class="form-input"
                placeholder="注文名を入力してください"
                :disabled="otherFieldsDisabled"
              />
            </div>

            <div class="order-main-form-field order-main-form-field--flex1">
              <label class="form-label form-label--with-badge">
                <span class="form-required-badge">必須</span>
                住所
              </label>
              <input
                ref="addressInputRef"
                v-model="address"
                type="text"
                class="form-input"
                placeholder="例: サンプル県サンプル市サンプル区サンプル町1-1-1"
                :disabled="otherFieldsDisabled"
              />
            </div>
          </section>
        </div>

        <!-- -- 入力ブロック5：顧客・担当者・デザイン種別・テンプレート -- -->
        <section>
          <div class="order-main-form-block">
            <div class="order-main-form-block-row">
              <div class="order-main-form-field order-main-form-field--flex2">
                <label class="form-label form-label--with-badge">
                  <span class="form-required-badge">必須</span>
                  顧客
                </label>
                <div class="order-main-field-row">
                  <input
                    v-model="customerName"
                    type="text"
                    readonly
                    placeholder="顧客を選択してください"
                    class="form-input form-input--readonly"
                    :disabled="otherFieldsDisabled"
                  />
                  <button
                    ref="customerSelectBtnRef"
                    type="button"
                    title="選択"
                    class="btn-icon btn-icon--select"
                    :disabled="customerSelectDisabled"
                    @click="openCustomerSelectModal"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="order-main-form-field order-main-form-field--flex1">
                <label class="form-label form-label--with-badge">担当者名</label>
                <input
                  v-model="manager"
                  type="text"
                  class="form-input"
                  placeholder="担当者を入力してください"
                  :disabled="otherFieldsDisabled"
                />
              </div>
            </div>
            <div class="order-main-form-block-row">
              <div class="order-main-form-field order-main-form-field--flex1">
                <label class="form-label form-label--with-badge">
                  <span class="form-required-badge">必須</span>
                  デザイン種別
                </label>
                <select
                  ref="designTypeSelectRef"
                  v-model="designTypeId"
                  class="form-select"
                  :class="{ 'form-select--placeholder': designTypeId == null }"
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
              <div class="order-main-form-field order-main-form-field--flex2">
                <label class="form-label form-label--with-badge">
                  <span class="form-required-badge">必須</span>
                  テンプレート
                </label>
                <div class="order-main-field-row">
                  <select
                    ref="templateSelectRef"
                    v-model.number="templateId"
                    class="form-select"
                    :class="{ 'form-select--placeholder': templateId == null }"
                    :disabled="templateDisabled"
                  >
                    <option :value="null">{{ templateSelectPlaceholder }}</option>
                    <option v-for="opt in templateOptions" :key="opt.templateId" :value="opt.templateId">
                      {{ opt.templateName }}
                    </option>
                  </select>
                  <button
                    type="button"
                    title="選択"
                    class="btn-icon btn-icon--select"
                    :disabled="templateDisabled"
                    @click="templateSelectModalOpen = true"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- -- 入力ブロック6：テンプレート項目（選択テンプレートに紐づく） -- -->
        <section v-show="showTemplateItemsSection" class="order-main-template-section">
          <div class="order-main-section-title">
            <div class="order-main-section-title-accent"></div>
            <h3 class="order-main-section-title-text">テンプレート項目</h3>
          </div>
          <div class="order-main-form-grid order-main-form-grid--template">
            <div class="order-main-form-field">
              <label class="form-label form-label--with-badge">テンプレートプレビュー</label>
              <div class="order-main-template-preview">
                <img
                  src="/samples/template/template-dummy.png?v=2"
                  alt="テンプレートプレビュー"
                />
              </div>
            </div>
            <div class="order-main-form-block">
              <p v-if="isLoadingTemplateItems" class="text-muted">読み込み中...</p>
              <template v-else>
                <div
                  v-for="(item, idx) in templateItems"
                  :key="item.templateItemId"
                  class="order-main-form-field"
                >
                  <label class="form-label form-label--with-badge">
                    <span v-if="item.isRequired" class="form-required-badge">必須</span>
                    {{ item.itemName }}
                  </label>
                  <input
                    :ref="(el) => setTemplateItemInputRef(el, idx)"
                    v-model="templateItemValues[idx]"
                    type="text"
                    class="form-input"
                    :disabled="isLoadingTemplateItems"
                  />
                </div>
              </template>
            </div>
          </div>
        </section>
      </form>
    </div>

    <!-- -- 画面下部：戻る／登録・更新／看板編集 -- -->
    <div class="order-main-form-actions">
      <div class="order-main-form-actions-left">
        <button type="button" class="btn-back" @click="goBack">戻る</button>
      </div>
      <div class="order-main-form-actions-center">
        <button
          type="button"
          class="btn-action"
          :disabled="registerButtonDisabled"
          @click="openRegisterConfirm"
        >
          {{ isValidatingAddress ? "住所を確認中..." : registerButtonLabel }}
        </button>
      </div>
      <div class="order-main-form-actions-right">
        <RouterLink
          :to="orderDetailTo"
          class="btn-back"
          :aria-disabled="orderDetailLinkDisabled"
          @click="handleOrderDetailClick"
        >
          看板編集
        </RouterLink>
      </div>
    </div>
    </div>

    <!-- 未保存変更確認モーダル -->
    <Teleport to="body">
      <div v-show="unsavedConfirmOpen" class="form-dialog" aria-hidden="false">
        <div class="form-dialog-overlay" @click="pendingUnsavedAction = null; unsavedConfirmOpen = false"></div>
        <div class="form-dialog-content form-dialog-content--wide">
          <div class="form-dialog-header">
            <h3>変更の確認</h3>
          </div>
          <div class="form-dialog-body">
            <p>{{ unsavedConfirmMessage }}</p>
          </div>
          <div class="form-dialog-footer">
            <button type="button" class="btn btn-secondary" @click="pendingUnsavedAction = null; unsavedConfirmOpen = false">
              キャンセル
            </button>
            <button type="button" class="btn btn-primary" @click="executePendingUnsaved">
              {{ unsavedConfirmOkText }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 注文番号選択モーダル（共通コンポーネント） -->
    <OrderNoSelectModal
      v-model="orderNoSelectModalOpen"
      :items="orderListForSelect"
      :loading="isLoadingOrders"
      @select="selectOrderNo"
    />

    <!-- テンプレート選択モーダル（共通コンポーネント。ログイン会社ID・顧客IDで抽出） -->
    <TemplateSelectModal
      v-model="templateSelectModalOpen"
      :company-id="getLoginCompanyId()"
      :customer-id="customerId"
      @select="selectTemplateFromModal"
    />

    <!-- 顧客選択モーダル（共通コンポーネント） -->
    <CustomerSelectModal
      v-model="customerSelectModalOpen"
      :items="customerListForSelect"
      :loading="isLoadingCustomers"
      @select="selectCustomer"
      @clear="clearCustomer"
    />

    <!-- 新規→変更で入力変更あり案内 -->
    <Teleport to="body">
      <div v-show="changeNoticeModalOpen" class="form-dialog" aria-hidden="false">
        <div class="form-dialog-overlay" @click="changeNoticeModalOpen = false"></div>
        <div class="form-dialog-content form-dialog-content--wide">
          <div class="form-dialog-header">
            <h3>変更の確認</h3>
          </div>
          <div class="form-dialog-body">
            <p>入力内容に変更があります。登録してから変更に切り替えますか？</p>
          </div>
          <div class="form-dialog-footer">
            <button type="button" class="btn btn-secondary" @click="changeNoticeModalOpen = false">キャンセル</button>
            <button type="button" class="btn btn-secondary btn-secondary--slate" @click="changeNoticeDiscard">破棄して切り替え</button>
            <button type="button" class="btn btn-primary" @click="changeNoticeRegister">登録して切り替え</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 必須項目未入力 -->
    <Teleport to="body">
      <div v-show="requiredValidationOpen" class="form-dialog" aria-hidden="false">
        <div class="form-dialog-overlay" @click="closeRequiredValidationModal"></div>
        <div class="form-dialog-content form-dialog-content--narrow">
          <div class="form-dialog-body" style="text-align: center">
            <p>{{ requiredValidationMessage }}</p>
          </div>
          <div class="form-dialog-footer form-dialog-footer--center">
            <button type="button" class="btn btn-primary" @click="closeRequiredValidationModal">OK</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 登録確認 -->
    <Teleport to="body">
      <div v-show="registerConfirmOpen" class="form-dialog" aria-hidden="false">
        <div class="form-dialog-overlay" @click="registerConfirmOpen = false"></div>
        <div class="form-dialog-content form-dialog-content--narrow">
          <div class="form-dialog-header">
            <h3>{{ registerConfirmTitle }}</h3>
          </div>
          <div class="form-dialog-body">
            <p>{{ registerConfirmMessage }}</p>
          </div>
          <div class="form-dialog-footer">
            <button type="button" class="btn btn-secondary" @click="registerConfirmOpen = false">キャンセル</button>
            <button type="button" class="btn btn-primary" @click="doRegisterConfirm">OK</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 登録結果 -->
    <Teleport to="body">
      <div v-show="registerResultOpen" class="form-dialog" style="z-index: 60" aria-hidden="false">
        <div class="form-dialog-overlay" @click="registerResultOpen = false"></div>
        <div class="form-dialog-content form-dialog-content--wide">
          <div class="form-dialog-header">
            <h3>処理結果</h3>
          </div>
          <div class="form-dialog-body">
            <p>{{ registerResultMessage }}</p>
          </div>
          <div class="form-dialog-footer">
            <RouterLink
              :to="{ path: '/order/detail', query: { orderNo: orderNo, itemCode: '01', mode: 'edit' } }"
              class="btn btn-primary"
              @click="registerResultOpen = false"
            >
              看板編集
            </RouterLink>
            <RouterLink
              :to="{ path: '/order/list', query: orderNo ? { orderNo } : {} }"
              class="btn btn-secondary"
              @click="registerResultOpen = false"
            >
              注文一覧
            </RouterLink>
            <button type="button" class="btn btn-secondary" @click="registerResultOpen = false">キャンセル</button>
          </div>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<style>
/* フォーカスが当たったらキャレットを表示（空欄でも入力中でも） */
.order-main-form input:not([readonly]):not(:disabled):focus,
.order-main-form textarea:not([readonly]):not(:disabled):focus {
  caret-color: #334155 !important;
}
</style>
