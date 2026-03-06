<script setup lang="ts">
/**
 * 注文番号選択モーダル（共通）
 * OrderMain / OrderList / OrderDetail で利用
 */
import type { OrderItem } from "../composables/useOrderApi"

defineProps<{
  modelValue: boolean
  items: OrderItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  select: [order: OrderItem]
}>()

/** デザイン種別の表示用。空の場合は — を返す */
function designTypeLabel(value: string): string {
  return value || "—"
}

/** モーダルを閉じる（v-model を false に更新） */
function close() {
  emit("update:modelValue", false)
}

/** 注文を選択し select イベントを発火してからモーダルを閉じる */
function onSelect(order: OrderItem) {
  emit("select", order)
  close()
}
</script>

<template>
  <Teleport to="body">
    <!-- 注文番号選択モーダル：行クリックで select(order) 発火 -->
    <div
      v-show="modelValue"
      class="fixed inset-0 z-50"
      aria-hidden="false"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orderNoSelectModalTitle"
    >
      <div class="fixed inset-0 bg-black/40" @click="close"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-4xl overflow-hidden">
          <div class="px-6 py-3 bg-main">
            <h3 id="orderNoSelectModalTitle" class="text-base font-normal text-white tracking-tight">注文番号を選択</h3>
          </div>
          <!-- 注文一覧テーブル（親から items を渡す） -->
          <div class="px-8 py-6 max-h-[60vh] overflow-auto">
            <p v-if="loading" class="text-sm text-slate-500">読み込み中...</p>
            <table v-else class="w-full text-left text-xs">
              <thead>
                <tr class="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                  <th class="px-3 py-2 font-normal border-b border-slate-200">注文番号</th>
                  <th class="px-3 py-2 font-normal border-b border-slate-200"><span class="header-2line">注文名<br>住所</span></th>
                  <th class="px-3 py-2 font-normal border-b border-slate-200"><span class="header-2line">顧客名<br>担当者</span></th>
                  <th class="px-3 py-2 font-normal border-b border-slate-200"><span class="header-2line">デザイン種別<br>テンプレート</span></th>
                  <th class="px-3 py-2 font-normal border-b border-slate-200"><span class="header-2line">登録日<br>登録者</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="order in items"
                  :key="order.orderNo"
                  class="hover:bg-slate-100 cursor-pointer transition-colors"
                  @click="onSelect(order)"
                >
                  <td class="px-3 py-2"><span class="font-mono text-xs text-slate-700">{{ order.orderNo }}</span></td>
                  <td class="px-3 py-2">
                    <div class="text-slate-700 text-xs">{{ order.orderName }}</div>
                    <div class="text-[10px] text-slate-500 mt-0.5">{{ order.address }}</div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="text-slate-700 text-xs">{{ order.customerName || "—" }}</div>
                    <div class="text-[10px] text-slate-500 mt-0.5">{{ order.manager?.trim() || "—" }}</div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="text-slate-600 text-xs">{{ designTypeLabel(order.designType) }}</div>
                    <div class="text-[10px] text-slate-500 mt-0.5">{{ order.template || "—" }}</div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="text-slate-600 text-xs">{{ order.createdDate }}</div>
                    <div class="text-[10px] text-slate-500 mt-0.5">{{ order.creator }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="!loading && items.length === 0" class="text-sm text-slate-500">データがありません</p>
          </div>
          <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end">
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
