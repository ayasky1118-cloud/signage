//-- useOrderNoSelectModal - 注文番号選択モーダル用 composable
//--
//-- 【用途】
//-- ・OrderList / OrderMain / OrderDetail で OrderNoSelectModal のデータ取得を共通化
//-- ・同一の API パラメータ・取得ロジックで一貫した表示を保証
//--
//-- 【引数】
//-- ・getCompanyId: 親コンポーネントからログイン会社IDを取得するコールバック。
//--   呼び出し時点（openOrderNoSelectModal 実行時）の companyId を使うため、ref 等のリアクティブな値を返す関数を渡す。
import { ref } from "vue"
import { searchOrders, type OrderItem } from "./useOrderApi"

//-- モーダルで取得する注文一覧の件数。ページネーションなしで一覧表示する想定。
//-- 100件で十分な件数を確保しつつ、API 負荷を抑える。全件が必要な場合はバックエンドの per_page 上限（100）に合わせる。
const ORDER_LIST_PER_PAGE = 100

export function useOrderNoSelectModal(getCompanyId: () => number) {
  const orderListForSelect = ref<OrderItem[]>([])
  const isLoadingOrders = ref(false)
  const fetchErrorMessage = ref<string | null>(null)
  const modalOpen = ref(false)

  //-- モーダルを開き、注文一覧を取得して表示する。getCompanyId() でその時点の会社IDを取得し searchOrders に渡す。
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

  //-- モーダルを閉じる（キャンセルボタン等で呼ばれる）
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
