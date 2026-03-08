<script setup lang="ts">
/**
 * CustomerSelectModal - 顧客選択モーダル
 *
 * 【用途】
 * ・OrderMain: 注文登録フォームの「顧客」選択時に表示
 * ・OrderList: 一覧の顧客フィルタ選択時に表示
 * ・親が渡した CustomerItem 一覧をテーブル表示し、行クリックで選択
 *
 * 【表示内容】
 * ・顧客名・住所・担当者（contactName）
 *
 * 【親コンポーネントとの連携】
 * ・select: 顧客を選択したときに発火。選択値の反映（担当者名の自動入力等）は親の @select で制御
 * ・clear: 「クリア」ボタンで発火。選択を解除したい場合に使用
 */
import type { CustomerItem } from "../composables/useCustomerApi"

// -----------------------------------------------------------------------------
// Props 定義
// -----------------------------------------------------------------------------

defineProps<{
  /** モーダルの表示/非表示。v-model で双方向バインディング */
  modelValue: boolean
  /** 選択肢として表示する顧客一覧（親が company_id で API 取得して渡す） */
  items: CustomerItem[]
  /** 一覧取得中のローディング状態。true のとき「読み込み中...」を表示 */
  loading: boolean
}>()

// -----------------------------------------------------------------------------
// Emits 定義
// -----------------------------------------------------------------------------

const emit = defineEmits<{
  /** モーダルを閉じる際に false を発火 */
  "update:modelValue": [value: boolean]
  /** ユーザーが行をクリックした際に、選択した CustomerItem を発火 */
  select: [customer: CustomerItem]
  /** 「クリア」ボタン押下時に発火。選択解除を親に通知 */
  clear: []
}>()

// -----------------------------------------------------------------------------
// モーダル操作
// -----------------------------------------------------------------------------

/** モーダルを閉じる（オーバーレイクリック・キャンセルボタン・選択時・クリア時で呼ばれる） */
function close() {
  emit("update:modelValue", false)
}

/** 顧客行をクリックしたときの処理。親に選択値を渡し、モーダルを閉じる */
function onSelect(c: CustomerItem) {
  emit("select", c)
  close()
}

/** 「クリア」ボタン押下時の処理。親に clear を通知し、モーダルを閉じる */
function onClear() {
  emit("clear")
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
      aria-labelledby="customerSelectModalTitle"
    >
      <!-- オーバーレイ（半透明の黒）。クリックでモーダルを閉じる -->
      <div class="modal-overlay" @click="close"></div>
      <div class="modal-dialog">
        <div class="modal-content">
          <!-- ヘッダー（メインカラー背景） -->
          <div class="modal-header">
            <h3 id="customerSelectModalTitle" class="modal-header-title">顧客を選択</h3>
          </div>
          <!-- 本文: 顧客一覧テーブル（行クリックで select 発火。最大高さ 60vh でスクロール） -->
          <div class="modal-body modal-body--scroll">
            <p v-if="loading" class="text-muted">読み込み中...</p>
            <table v-else class="data-table">
              <thead>
                <tr class="data-table-header">
                  <th><span class="header-2line">顧客名<br>住所</span></th>
                  <th>担当者</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in items"
                  :key="c.customerId"
                  class="data-table-row"
                  @click="onSelect(c)"
                >
                  <td>
                    <div class="data-table-cell-primary">{{ c.customerName }}</div>
                    <div class="data-table-cell-secondary">{{ c.address }}</div>
                  </td>
                  <td class="data-table-cell-primary">{{ c.contactName?.trim() || "—" }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!loading && items.length === 0" class="text-muted">データがありません</p>
          </div>
          <!-- フッター（クリア・キャンセルボタン） -->
          <div class="modal-footer modal-footer--end modal-footer--gap">
            <button
              type="button"
              class="btn btn-secondary btn-secondary--slate"
              @click="onClear"
            >
              クリア
            </button>
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
