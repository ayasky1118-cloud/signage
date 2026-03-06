<script setup lang="ts">
/**
 * テンプレート選択モーダル（共通）
 * ログイン会社IDと顧客IDを条件にテンプレート一覧を取得して表示する。
 * 現状 OrderMain で利用。他画面でも利用可能。
 */
import { ref, watch } from "vue"
import { fetchTemplates, type TemplateOption } from "../composables/useTemplateApi"

const props = defineProps<{
  modelValue: boolean
  /** ログイン会社ID（必須） */
  companyId: number
  /** 顧客ID（指定時は当該顧客に紐づくテンプレートのみ取得） */
  customerId?: number | null
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  select: [option: TemplateOption]
}>()

const items = ref<TemplateOption[]>([])
const loading = ref(false)

async function loadTemplates() {
  loading.value = true
  try {
    items.value = await fetchTemplates(props.companyId, props.customerId ?? undefined)
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.companyId, props.customerId] as const,
  ([open]) => {
    if (open) loadTemplates()
  }
)

function close() {
  emit("update:modelValue", false)
}

function onSelect(opt: TemplateOption) {
  emit("select", opt)
  close()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-show="modelValue"
      class="fixed inset-0 z-50"
      aria-hidden="false"
      role="dialog"
      aria-modal="true"
      aria-labelledby="templateSelectModalTitle"
    >
      <div class="fixed inset-0 bg-black/40" @click="close"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl card-shadow card-header-full border-b border-slate-200/80 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
          <div class="px-6 py-3 bg-main flex-shrink-0">
            <h3 id="templateSelectModalTitle" class="text-base font-bold text-white tracking-tight">テンプレート選択</h3>
          </div>
          <div class="px-8 py-6 flex-1 min-h-0 overflow-auto">
            <p v-if="loading" class="text-sm text-slate-500">読み込み中...</p>
            <div v-else class="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <button
                v-for="opt in items"
                :key="opt.templateId"
                type="button"
                class="template-select-item flex flex-col rounded-xl border-2 border-slate-200 bg-white overflow-hidden hover:ring-2 hover:ring-main hover:ring-offset-2 focus:ring-2 focus:ring-main focus:ring-offset-2 focus:outline-none transition-all duration-200 text-left"
                @click="onSelect(opt)"
              >
                <div class="h-64 w-full bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <span class="text-slate-400 text-xs">テンプレート</span>
                </div>
                <div class="px-3 py-2 text-xs font-semibold text-slate-700">{{ opt.templateName }}</div>
              </button>
            </div>
            <p v-if="!loading && items.length === 0" class="text-sm text-slate-500">データがありません</p>
          </div>
          <div class="px-8 py-5 border-t border-slate-200 flex flex-nowrap justify-end flex-shrink-0">
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
