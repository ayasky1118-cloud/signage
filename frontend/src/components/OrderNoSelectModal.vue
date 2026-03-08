<script setup lang="ts">
/**
 * OrderNoSelectModal - 注文番号選択モーダル
 *
 * 【用途】
 * ・OrderMain: 注文登録画面で「既存注文を開く」時に表示
 * ・OrderList: 一覧から注文を選択して詳細へ遷移する際に表示
 * ・OrderDetail: 注文番号を切り替える際に表示
 * ・親が渡した OrderItem 一覧をテーブル表示し、行クリックで選択
 *
 * 【表示内容】
 * ・注文番号・注文名/住所・顧客名/担当者・デザイン種別/テンプレート・登録日/登録者
 */
import type { OrderItem } from "../composables/useOrderApi"

// -----------------------------------------------------------------------------
// Props 定義
// -----------------------------------------------------------------------------

defineProps<{
  /** モーダルの表示/非表示。v-model で双方向バインディング */
  modelValue: boolean
  /** 選択肢として表示する注文一覧（親が API 等で取得して渡す） */
  items: OrderItem[]
  /** 一覧取得中のローディング状態。true のとき「読み込み中...」を表示 */
  loading: boolean
}>()

// -----------------------------------------------------------------------------
// Emits 定義
// -----------------------------------------------------------------------------

const emit = defineEmits<{
  /** モーダルを閉じる際に false を発火 */
  "update:modelValue": [value: boolean]
  /** ユーザーが行をクリックした際に、選択した OrderItem を発火 */
  select: [order: OrderItem]
}>()

// -----------------------------------------------------------------------------
// ヘルパー・モーダル操作
// -----------------------------------------------------------------------------

/** デザイン種別の表示用。空の場合は em dash（—）を返す */
function designTypeLabel(value: string): string {
  return value || "—"
}

/** モーダルを閉じる（オーバーレイクリック・キャンセルボタンで呼ばれる） */
function close() {
  emit("update:modelValue", false)
}

/** 注文行をクリックしたときの処理。親に選択値を渡し、モーダルを閉じる */
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
      <div class="modal-dialog">
        <div class="modal-content modal-content--wide">
          <!-- ヘッダー（メインカラー背景） -->
          <div class="modal-header">
            <h3 id="orderNoSelectModalTitle" class="modal-header-title">注文番号を選択</h3>
          </div>
          <!-- 本文: 注文一覧テーブル（行クリックで select 発火。最大高さ 60vh でスクロール） -->
          <div class="modal-body modal-body--scroll">
            <p v-if="loading" class="text-muted">読み込み中...</p>
            <table v-else class="data-table">
              <thead>
                <tr class="data-table-header">
                  <th class="header-2line">注文番号</th>
                  <th><span class="header-2line">注文名<br>住所</span></th>
                  <th><span class="header-2line">顧客名<br>担当者</span></th>
                  <th><span class="header-2line">デザイン種別<br>テンプレート</span></th>
                  <th><span class="header-2line">登録日<br>登録者</span></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in items"
                  :key="order.orderNo"
                  class="data-table-row"
                  @click="onSelect(order)"
                >
                  <td><span class="text-mono data-table-cell-primary">{{ order.orderNo }}</span></td>
                  <td>
                    <div class="data-table-cell-primary">{{ order.orderName }}</div>
                    <div class="data-table-cell-secondary">{{ order.address }}</div>
                  </td>
                  <td>
                    <div class="data-table-cell-primary">{{ order.customerName || "—" }}</div>
                    <div class="data-table-cell-secondary">{{ order.manager?.trim() || "—" }}</div>
                  </td>
                  <td>
                    <div class="data-table-cell-primary">{{ designTypeLabel(order.designType) }}</div>
                    <div class="data-table-cell-secondary">{{ order.template || "—" }}</div>
                  </td>
                  <td>
                    <div class="data-table-cell-primary">{{ order.createdDate }}</div>
                    <div class="data-table-cell-secondary">{{ order.creator }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="!loading && items.length === 0" class="text-muted">データがありません</p>
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
.modal-body--scroll {
  padding: 1.5rem 2rem;
  max-height: 60vh;
  overflow: auto;
}

.data-table th {
  padding: 0.5rem 0.75rem;
}

.data-table td {
  padding: 0.5rem 0.75rem;
}

.data-table-cell-primary {
  font-size: 0.75rem;
}

.data-table-cell-secondary {
  margin-top: 0.125rem;
}
</style>
