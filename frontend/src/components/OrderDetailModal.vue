<script setup lang="ts">
/**
 * 注文詳細モーダル（共通）
 * OrderList のダブルクリック・OrderDetail の「注文詳細」ボタンから表示。
 * 注文一覧API（searchOrders）の返却値 OrderItem を表示する。
 */
import type { OrderItem } from "../composables/useOrderApi"

defineProps<{
  modelValue: boolean
  order: OrderItem | null
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

/** 値が空・未定義の場合は em dash（—）を返す表示用ヘルパー */
function orDash(val: string | undefined): string {
  return (val ?? "").trim() || "—"
}

/** モーダルを閉じる（v-model を false に更新） */
function close() {
  emit("update:modelValue", false)
}
</script>

<template>
  <Teleport to="body">
    <!-- === 注文詳細モーダル（OrderItem 読み取り専用） === -->
    <div v-show="modelValue" class="fixed inset-0 z-50" aria-hidden="false">
      <!-- -- オーバーレイ -- -->
      <div class="fixed inset-0 bg-black/40" @click="close"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <div
          v-if="order"
          class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-2xl overflow-hidden my-8"
          @click.stop
        >
          <!-- -- ヘッダー -- -->
          <div class="px-6 py-3 bg-main">
            <h3 class="text-base font-normal text-white tracking-tight">注文詳細</h3>
          </div>
          <!-- -- 本文（スクロール） -- -->
          <div class="px-6 pt-6 pb-8 md:px-8 md:pt-8 md:pb-10 space-y-6 max-h-[85vh] overflow-y-auto">
            <!-- 基本情報 -->
            <section>
              <div class="flex items-center gap-2 mb-4 text-main">
                <div class="w-1.5 h-6 bg-subBlue rounded-full"></div>
                <h3 class="font-normal text-base tracking-tight">基本情報</h3>
              </div>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">注文番号</dt>
                  <dd class="font-mono text-sm font-normal text-slate-700">{{ order.orderNo }}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">注文名</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.orderName) }}</dd>
                </div>
                <div class="space-y-1 sm:col-span-2">
                  <dt class="text-[10px] font-normal text-slate-400">住所</dt>
                  <dd class="text-sm text-slate-700 whitespace-pre-wrap">{{ orDash(order.address) }}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">顧客名</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.customerName) }}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">担当者</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.manager) }}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">デザイン種別</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.designType) }}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">テンプレート</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.template) }}</dd>
                </div>
              </dl>
            </section>

            <!-- 社内情報 -->
            <section>
              <div class="flex items-center gap-2 mb-4 text-main">
                <div class="w-1.5 h-6 bg-subBlue rounded-full"></div>
                <h3 class="font-normal text-base tracking-tight">社内情報</h3>
              </div>
              <dl class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">社内CD</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.attribute_01) }}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">事業所CD</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.attribute_02) }}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">現場CD</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.attribute_03) }}</dd>
                </div>
                <div class="space-y-1"></div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">制作区分</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.attribute_04) }}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">ステータス</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.attribute_05) }}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">納期</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.deadlineDt) }}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">校正予定日</dt>
                  <dd class="text-sm text-slate-700">{{ orDash(order.proofreadingDt) }}</dd>
                </div>
              </dl>
            </section>

            <!-- 備考 -->
            <section v-if="order.note?.trim()">
              <div class="flex items-center gap-2 mb-4 text-main">
                <div class="w-1.5 h-6 bg-subBlue rounded-full"></div>
                <h3 class="font-normal text-base tracking-tight">備考</h3>
              </div>
              <div class="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                {{ order.note }}
              </div>
            </section>

            <!-- 登録情報 -->
            <section class="pt-4 border-t border-slate-200">
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">登録日</dt>
                  <dd class="text-sm text-slate-600">{{ orDash(order.createdDate) }}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] font-normal text-slate-400">登録者</dt>
                  <dd class="text-sm text-slate-600">{{ orDash(order.creator) }}</dd>
                </div>
                <div v-if="order.branches?.length" class="space-y-1 sm:col-span-2">
                  <dt class="text-[10px] font-normal text-slate-400">枝番</dt>
                  <dd class="text-sm text-slate-600 font-mono">{{ order.branches.join(", ") }}</dd>
                </div>
              </dl>
            </section>
          </div>
          <!-- -- フッター -- -->
          <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-center">
            <button
              type="button"
              class="px-6 py-2 rounded-xl bg-white border border-neutral text-slate-500 hover:bg-slate-50 text-xs font-medium transition-all duration-200 whitespace-nowrap"
              @click="close"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
