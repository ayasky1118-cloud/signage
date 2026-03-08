/**
 * useOrderNoSelectModal - 注文番号選択モーダル用 composable
 *
 * 【用途】
 * ・OrderList / OrderMain / OrderDetail で OrderNoSelectModal のデータ取得を共通化
 * ・同一の API パラメータ・取得ロジックで一貫した表示を保証
 */
import { ref } from "vue"
import { searchOrders, type OrderItem } from "./useOrderApi"

/** 注文番号選択モーダル用の一覧取得パラメータ（全画面で統一） */
const ORDER_LIST_PER_PAGE = 100

export function useOrderNoSelectModal(getCompanyId: () => number) {
  const orderListForSelect = ref<OrderItem[]>([])
  const isLoadingOrders = ref(false)
  const fetchErrorMessage = ref<string | null>(null)
  const modalOpen = ref(false)

  /** モーダルを開き、注文一覧を取得して表示する */
  async function openOrderNoSelectModal() {
    modalOpen.value = true
    isLoadingOrders.value = true
    fetchErrorMessage.value = null
    try {
      const result = await searchOrders({
        companyId: getCompanyId(),
        page: 1,
        perPage: ORDER_LIST_PER_PAGE,
      })
      orderListForSelect.value = result.items
    } catch {
      orderListForSelect.value = []
      fetchErrorMessage.value = "データの取得に失敗しました。"
    } finally {
      isLoadingOrders.value = false
    }
  }

  function closeModal() {
    modalOpen.value = false
  }

  return {
    orderListForSelect,
    isLoadingOrders,
    fetchErrorMessage,
    modalOpen,
    openOrderNoSelectModal,
    closeModal,
  }
}
