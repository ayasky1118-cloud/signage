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
        <div class="modal-content customer-select-modal">
          <!-- ヘッダー（メインカラー背景） -->
          <div class="modal-header">
            <h3 id="customerSelectModalTitle" class="modal-header-title">顧客を選択</h3>
          </div>
          <!-- 本文: 顧客一覧テーブル（行クリックで select 発火。最大高さ 60vh でスクロール） -->
          <div class="modal-body modal-body--scroll">
            <p v-if="loading" class="text-muted">読み込み中...</p>
            <table v-else class="data-table customer-select-modal-table">
              <thead>
                <tr class="data-table-header">
                  <th class="select-modal-table-th">
                    <span class="header-2line">顧客名<br />住所</span>
                  </th>
                  <th class="select-modal-table-th">担当者</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in items"
                  :key="c.customerId"
                  class="data-table-row"
                  @click="onSelect(c)"
                >
                  <td class="select-modal-table-td">
                    <div class="data-table-cell-primary">{{ c.customerName }}</div>
                    <div class="data-table-cell-secondary data-table-cell-secondary--truncate">{{ c.address }}</div>
                  </td>
                  <td class="select-modal-table-td">
                    <div class="data-table-cell-primary">{{ c.contactName?.trim() || "—" }}</div>
                  </td>
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
/* 青グラデーションをヘッダー高さに合わせる（4remだと下に余白ができる） */
.customer-select-modal {
  background: linear-gradient(to bottom, var(--color-main) 0, var(--color-main) 2.75rem, white 2.75rem) !important;
}

.customer-select-modal .modal-header {
  padding: 0.5rem 1.5rem;
}

.customer-select-modal .modal-body--scroll {
  padding: 1rem 2rem 1rem;
  max-height: 60vh;
  overflow: auto;
}

.customer-select-modal .modal-footer {
  border-top: 1px solid rgb(226 232 240);
}

/* 選択モーダルテーブル（data-table を拡張） */
.customer-select-modal .customer-select-modal-table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
}

.customer-select-modal .select-modal-table-th {
  padding: 0.5rem 1.25rem;
  font-weight: 400;
  vertical-align: middle;
  border-bottom: 1px solid rgb(226 232 240);
  white-space: nowrap;
}

.customer-select-modal .select-modal-table-td {
  min-width: 0;
  overflow: hidden;
  vertical-align: middle;
  padding: 0.5rem 1.25rem;
  border-bottom: 1px solid rgb(226 232 240);
}

.customer-select-modal .customer-select-modal-table tbody tr:last-child td {
  border-bottom: none;
}

</style>
