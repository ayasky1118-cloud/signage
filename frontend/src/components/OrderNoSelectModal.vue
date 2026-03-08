<script setup lang="ts">
//-- OrderNoSelectModal - 注文番号選択モーダル
//--
//-- 【用途】
//-- ・OrderMain: 注文登録画面で「既存注文を開く」時に表示
//-- ・OrderList: 一覧から注文を選択して詳細へ遷移する際に表示
//-- ・OrderDetail: 注文番号を切り替える際に表示
//-- ・親が渡した OrderItem 一覧をテーブル表示し、行クリックで選択
//--
//-- 【表示内容】
//-- ・注文番号・注文名/住所・顧客名/担当者・デザイン種別/テンプレート・登録日/登録者
import type { OrderItem } from "../composables/useOrderApi"

//-------------------------------------------------------------------------------
//-- Props 定義
//-------------------------------------------------------------------------------

defineProps<{
  modelValue: boolean  //-- モーダルの表示/非表示。v-model で双方向バインディング
  items: OrderItem[]  //-- 選択肢として表示する注文一覧（親が API 等で取得して渡す）
  loading: boolean  //-- 一覧取得中のローディング状態。true のとき「読み込み中...」を表示
  errorMessage?: string | null  //-- 取得失敗時のエラーメッセージ。指定時はテーブル代わりに表示
}>()

//-------------------------------------------------------------------------------
//-- Emits 定義
//-------------------------------------------------------------------------------

const emit = defineEmits<{
  "update:modelValue": [value: boolean]  //-- モーダルを閉じる際に false を発火
  select: [order: OrderItem]  //-- ユーザーが行をクリックした際に、選択した OrderItem を発火
}>()

//-------------------------------------------------------------------------------
//-- ヘルパー・モーダル操作
//-------------------------------------------------------------------------------

//-- デザイン種別の表示用。空の場合は em dash（—）を返す
function designTypeLabel(value: string): string {
  return value || "—"
}

//-- モーダルを閉じる（オーバーレイクリック・キャンセルボタンで呼ばれる）
function close() {
  emit("update:modelValue", false)
}

//-- 注文行をクリックしたときの処理。親に選択値を渡し、モーダルを閉じる
function onSelect(order: OrderItem) {
  emit("select", order)
  close()
}
</script>

<template>
  <!-- body 直下にマウント（z-index の影響を避けるため Teleport 使用） -->
  <Teleport to="body">
    <div
      v-show="modelValue"
      class="modal"
      aria-hidden="false"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orderNoSelectModalTitle"
    >
      <!-- オーバーレイ（半透明の黒）。クリックでモーダルを閉じる -->
      <div class="modal-overlay" @click="close"></div>
      <div class="modal-dialog" @click="close">
        <div
          class="modal-content modal-content--wide select-modal order-no-select-modal"
          @click.stop
        >
          <!-- ヘッダー（メインカラー背景） -->
          <div class="modal-header">
            <h3 id="orderNoSelectModalTitle" class="modal-header-title">注文番号を選択</h3>
          </div>
          <!-- 本文: 注文一覧テーブル（行クリックで select 発火。最大高さ 60vh でスクロール） -->
          <div class="modal-body modal-body--scroll">
            <p v-if="loading" class="text-muted">読み込み中...</p>
            <p v-else-if="errorMessage" class="text-muted">{{ errorMessage }}</p>
            <table v-else class="data-table select-modal-table order-no-select-modal-table">
              <thead>
                <tr class="data-table-header">
                  <th class="select-modal-table-th order-no-select-modal-th-order-no">注文番号</th>
                  <th class="select-modal-table-th">
                    <span class="header-2line">注文名<br />住所</span>
                  </th>
                  <th class="select-modal-table-th">
                    <span class="header-2line">顧客名<br />担当者</span>
                  </th>
                  <th class="select-modal-table-th">
                    <span class="header-2line">デザイン種別<br />テンプレート</span>
                  </th>
                  <th class="select-modal-table-th">
                    <span class="header-2line">登録日<br />登録者</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in items"
                  :key="order.orderNo"
                  class="data-table-row"
                  @click="onSelect(order)"
                >
                  <td class="select-modal-table-td order-no-select-modal-td-order-no">
                    <span class="data-table-cell-primary">{{ order.orderNo }}</span>
                  </td>
                  <td class="select-modal-table-td">
                    <div class="data-table-cell-primary">{{ order.orderName }}</div>
                    <div class="data-table-cell-secondary data-table-cell-secondary--truncate">{{ order.address }}</div>
                  </td>
                  <td class="select-modal-table-td">
                    <div class="data-table-cell-primary">{{ order.customerName || "—" }}</div>
                    <div class="data-table-cell-secondary data-table-cell-secondary--truncate">{{ order.manager?.trim() || "—" }}</div>
                  </td>
                  <td class="select-modal-table-td">
                    <div class="data-table-cell-primary">{{ designTypeLabel(order.designType) }}</div>
                    <div class="data-table-cell-secondary data-table-cell-secondary--truncate">{{ order.template || "—" }}</div>
                  </td>
                  <td class="select-modal-table-td">
                    <div class="data-table-cell-primary">{{ order.createdDate }}</div>
                    <div class="data-table-cell-secondary data-table-cell-secondary--truncate">{{ order.creator }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="!loading && !errorMessage && items.length === 0" class="text-muted">データがありません</p>
          </div>
          <!-- フッター（キャンセルボタン） -->
          <div class="modal-footer modal-footer--end">
            <button
              type="button"
              class="btn btn-secondary"
              @click="close"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.order-no-select-modal .order-no-select-modal-th-order-no,
.order-no-select-modal .order-no-select-modal-td-order-no {
  width: var(--order-no-width);
  min-width: var(--order-no-width);
}
.order-no-select-modal .order-no-select-modal-td-order-no .data-table-cell-primary {
  font-size: 0.875rem;
}
</style>
