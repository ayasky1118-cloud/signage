<script setup lang="ts">
/**
 * 顧客選択モーダル（共通）
 * OrderMain / OrderList で利用。
 * 選択時の反映（担当者名を入れるかどうか）は各画面の @select で制御する。
 */
import type { CustomerItem } from "../composables/useCustomerApi"

defineProps<{
  modelValue: boolean
  items: CustomerItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  select: [customer: CustomerItem]
  clear: []
}>()

/** モーダルを閉じる（v-model を false に更新） */
function close() {
  emit("update:modelValue", false)
}

/** 顧客を選択し select イベントを発火してからモーダルを閉じる */
function onSelect(c: CustomerItem) {
  emit("select", c)
  close()
}

/** クリアを選択し clear イベントを発火してからモーダルを閉じる */
function onClear() {
  emit("clear")
  close()
}
</script>

<template>
  <Teleport to="body">
    <!-- 顧客選択モーダル：オーバーレイ＋中央パネル -->
    <div
      v-show="modelValue"
      class="fixed inset-0 z-50"
      aria-hidden="false"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customerSelectModalTitle"
    >
      <div class="fixed inset-0 bg-black/40" @click="close"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-2xl overflow-hidden">
          <div class="px-6 py-3 bg-main">
            <h3 id="customerSelectModalTitle" class="text-base font-normal text-white tracking-tight">顧客を選択</h3>
          </div>
          <!-- 顧客一覧（行クリックで選択 → select 発火） -->
          <div class="px-8 py-6 max-h-[60vh] overflow-auto">
            <p v-if="loading" class="text-sm text-slate-500">読み込み中...</p>
            <table v-else class="w-full text-left text-xs">
              <thead>
                <tr class="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                  <th class="px-3 py-2 font-normal border-b border-slate-200"><span class="header-2line">顧客名<br>住所</span></th>
                  <th class="px-3 py-2 font-normal border-b border-slate-200">担当者</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="c in items"
                  :key="c.customerId"
                  class="hover:bg-slate-100 cursor-pointer transition-colors"
                  @click="onSelect(c)"
                >
                  <td class="px-3 py-2">
                    <div class="text-slate-700 text-xs">{{ c.customerName }}</div>
                    <div class="text-[10px] text-slate-500 mt-0.5">{{ c.address }}</div>
                  </td>
                  <td class="px-3 py-2 text-slate-600 text-xs">{{ c.contactName?.trim() || "—" }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!loading && items.length === 0" class="text-sm text-slate-500">データがありません</p>
          </div>
          <!-- フッター：クリア（clear 発火）／キャンセル（閉じるのみ） -->
          <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end gap-3">
            <button
              type="button"
              class="px-6 py-2 rounded-xl bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-all duration-200 whitespace-nowrap"
              @click="onClear"
            >
              クリア
            </button>
            <button
              type="button"
              class="px-6 py-2 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
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
